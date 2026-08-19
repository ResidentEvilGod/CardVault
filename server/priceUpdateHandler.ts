import type { Request, Response } from "express";
import { ENV } from "./_core/env";
import {
  getAllBinderCardsForPriceUpdate,
  getCardById,
  updateBinderCardValue,
  updateCardPrices,
  upsertPriceUpdateJob,
} from "./db";
import { fetchScrydexPrices, fetchScryfallPrice } from "./routers/cards";

// Manus's Heartbeat scheduler authenticated its cron calls as a fake
// "cron_" user via its own OAuth SDK, which doesn't exist outside Manus.
// This endpoint isn't a logged-in Clerk user at all — it's an unattended
// caller (Vercel Cron, a GitHub Actions scheduled workflow, etc) — so it's
// checked with a plain shared secret instead of user auth. Set CRON_SECRET
// to a long random value (e.g. `openssl rand -hex 32`) in your env, and
// configure whatever triggers this endpoint to send it as:
//   x-cron-secret: <the same value>
function requireCronSecret(req: Request, res: Response): boolean {
  if (!ENV.cronSecret) {
    console.error("[PriceUpdate] CRON_SECRET is not set — refusing all requests.");
    res.status(500).json({ error: "Server misconfigured: CRON_SECRET not set" });
    return false;
  }
  const provided = req.header("x-cron-secret");
  if (provided !== ENV.cronSecret) {
    res.status(403).json({ error: "cron-only endpoint" });
    return false;
  }
  return true;
}

export async function nightlyPriceUpdateHandler(req: Request, res: Response) {
  try {
    if (!requireCronSecret(req, res)) return;

    console.log("[PriceUpdate] Starting nightly price refresh...");
    const allBinderCards = await getAllBinderCardsForPriceUpdate();

    let updatedCount = 0;
    const cardIdsUpdated = new Set<number>();

    for (const { binder, card } of allBinderCards) {
      try {
        // Only fetch prices once per unique card
        if (!cardIdsUpdated.has(card.id)) {
          let prices = null;

          if (card.scrydexId) {
            prices = await fetchScrydexPrices(card.scrydexId, card.tcg);
          }

          if (!prices && card.tcg === "mtg") {
            const sf = await fetchScryfallPrice(card.cardName, card.setCode ?? undefined);
            if (sf) prices = { priceNm: sf.priceNm };
          }

          if (prices) {
            await updateCardPrices(card.id, {
              priceNm: prices.priceNm,
              priceLp: prices.priceLp,
              priceMp: prices.priceMp,
              priceHp: prices.priceHp,
              priceDmg: prices.priceDmg,
              gradedPrices: prices.gradedPrices,
            });
            cardIdsUpdated.add(card.id);
          }
        }

        // Update binder card's cached value based on condition
        const updatedCard = await getCardById(card.id);
        if (updatedCard) {
          let value: string | null = null;
          if (binder.isGraded && binder.gradingCompany && binder.gradeLevel) {
            const gradedPrices = updatedCard.gradedPrices as Record<string, Record<string, number>> | null;
            const gradePrice = gradedPrices?.[binder.gradingCompany]?.[binder.gradeLevel];
            if (gradePrice) value = String(gradePrice);
          } else {
            const conditionMap: Record<string, string | null> = {
              NM: updatedCard.priceNm,
              LP: updatedCard.priceLp,
              MP: updatedCard.priceMp,
              HP: updatedCard.priceHp,
              DMG: updatedCard.priceDmg,
            };
            value = conditionMap[binder.condition] ?? updatedCard.priceNm;
          }
          if (value) {
            await updateBinderCardValue(binder.id, value);
            updatedCount++;
          }
        }
      } catch (err) {
        console.error(`[PriceUpdate] Error updating card ${card.id}:`, err);
      }
    }

    await upsertPriceUpdateJob({
      lastRunAt: new Date(),
      lastRunStatus: "success",
      cardsUpdated: updatedCount,
    });

    console.log(`[PriceUpdate] Completed. Updated ${updatedCount} binder cards.`);
    return res.json({ ok: true, cardsUpdated: updatedCount });
  } catch (err) {
    console.error("[PriceUpdate] Fatal error:", err);
    await upsertPriceUpdateJob({
      lastRunAt: new Date(),
      lastRunStatus: "error",
      cardsUpdated: 0,
    });
    return res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
