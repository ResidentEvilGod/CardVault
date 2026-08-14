import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { type Message, invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addCredits,
  createCard,
  createScanSession,
  deductScanCredit,
  getCardById,
  getConfig,
  getRecentScans,
  updateCardPrices,
} from "../db";
import { storagePut } from "../storage";

// ─── Scrydex API helpers ───────────────────────────────────────────────────────

async function getScrydexApiKey(): Promise<string> {
  const key = await getConfig("scrydex_api_key");
  return key || process.env.SCRYDEX_API_KEY || "";
}

async function fetchScrydexPrices(scrydexId: string, tcg: string): Promise<{
  priceNm?: string;
  priceLp?: string;
  priceMp?: string;
  priceHp?: string;
  priceDmg?: string;
  gradedPrices?: Record<string, Record<string, number>>;
  officialImageUrl?: string;
} | null> {
  const apiKey = await getScrydexApiKey();
  if (!apiKey) return null;

  try {
    const tcgPath = tcg === "mtg" ? "magic" : tcg === "pokemon" ? "pokemon" : tcg;
    const res = await fetch(`https://api.scrydex.com/${tcgPath}/v1/cards/${scrydexId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      data?: {
        images?: Array<{ type: string; large: string }>;
        variants?: Array<{
          prices?: Array<{
            type: string;
            condition?: string;
            grade?: string;
            company?: string;
            market?: number;
          }>;
        }>;
      };
    };
    const card = data.data;
    if (!card) return null;

    const result: ReturnType<typeof fetchScrydexPrices> extends Promise<infer T> ? T : never = {};

    // Official image
    const img = card.images?.find((i) => i.type === "front");
    if (img) result!.officialImageUrl = img.large;

    // Prices from first variant
    const variant = card.variants?.[0];
    if (variant?.prices) {
      const gradedPrices: Record<string, Record<string, number>> = {};
      for (const p of variant.prices) {
        if (p.type === "raw" && p.market) {
          const cond = p.condition?.toUpperCase();
          if (cond === "NM") result!.priceNm = String(p.market);
          else if (cond === "LP") result!.priceLp = String(p.market);
          else if (cond === "MP") result!.priceMp = String(p.market);
          else if (cond === "HP") result!.priceHp = String(p.market);
          else if (cond === "DM") result!.priceDmg = String(p.market);
        } else if (p.type === "graded" && p.company && p.grade && p.market) {
          if (!gradedPrices[p.company]) gradedPrices[p.company] = {};
          gradedPrices[p.company][p.grade] = p.market;
        }
      }
      if (Object.keys(gradedPrices).length > 0) result!.gradedPrices = gradedPrices;
    }

    return result!;
  } catch {
    return null;
  }
}

async function fetchScryfallPrice(cardName: string, setCode?: string): Promise<{
  priceNm?: string;
  officialImageUrl?: string;
  scryfallId?: string;
} | null> {
  try {
    const query = setCode ? `${cardName} s:${setCode}` : cardName;
    const res = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=usd`,
      { headers: { "User-Agent": "CardVault/1.0", Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { data?: Array<{ id: string; prices?: { usd?: string }; image_uris?: { normal: string } }> };
    const card = data.data?.[0];
    if (!card) return null;
    return {
      priceNm: card.prices?.usd ?? undefined,
      officialImageUrl: card.image_uris?.normal,
      scryfallId: card.id,
    };
  } catch {
    return null;
  }
}

// ─── Vision identification ─────────────────────────────────────────────────────

async function identifyCardWithLLM(imageUrl: string): Promise<{
  tcg: string;
  cardName: string;
  setName?: string;
  setCode?: string;
  cardNumber?: string;
  rarity?: string;
  artist?: string;
  confidence: number;
  isGraded?: boolean;
  gradingCompany?: string;
  gradeLevel?: string;
  certNumber?: string;
  physicalCardLikelihood: number;
  digitalImageRisk: number;
  sourceClassification: "camera_photo" | "screen_or_screenshot" | "flat_digital_crop" | "uncertain";
  authenticityNotes: string;
} | null> {
  try {
    const visionMessages: Message[] = [
      {
        role: "system",
        content: "You are an expert trading card game (TCG) identifier. Analyze card images and extract precise metadata. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Identify this trading card and return a JSON object with these fields:\n{\n  "tcg": "pokemon" | "mtg" | "lorcana" | "yugioh" | "onepiece" | "other",\n  "cardName": "exact card name",\n  "setName": "set/expansion name or null",\n  "setCode": "set abbreviation code or null",\n  "cardNumber": "card number like 025/102 or null",\n  "rarity": "rarity tier or null",\n  "artist": "artist name or null",\n  "confidence": 0.0-1.0 confidence score,\n  "isGraded": true if this is a graded/slabbed card,\n  "gradingCompany": "PSA" | "BGS" | "CGC" | null,\n  "gradeLevel": "10" | "9.5" | "9" | etc or null,\n  "certNumber": "certification number or null",
  "physicalCardLikelihood": 0.0-1.0 likelihood that this is a photograph of a physical card,
  "digitalImageRisk": 0.0-1.0 likelihood that this is a screenshot, flat digital crop, or image displayed on a screen,
  "sourceClassification": "camera_photo" | "screen_or_screenshot" | "flat_digital_crop" | "uncertain",
  "authenticityNotes": "short explanation of visible physical cues or digital-image cues"
}`,
          },
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" },
          },
        ],
      },
    ];
    const res = await invokeLLM({
      model: "gemini-3-flash-preview",
      messages: visionMessages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "card_identification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tcg: { type: "string" },
              cardName: { type: "string" },
              setName: { type: ["string", "null"] },
              setCode: { type: ["string", "null"] },
              cardNumber: { type: ["string", "null"] },
              rarity: { type: ["string", "null"] },
              artist: { type: ["string", "null"] },
              confidence: { type: "number" },
              isGraded: { type: "boolean" },
              gradingCompany: { type: ["string", "null"] },
              gradeLevel: { type: ["string", "null"] },
              certNumber: { type: ["string", "null"] },
              physicalCardLikelihood: { type: "number" },
              digitalImageRisk: { type: "number" },
              sourceClassification: { type: "string" },
              authenticityNotes: { type: "string" },
            },
            required: ["tcg", "cardName", "confidence", "isGraded", "physicalCardLikelihood", "digitalImageRisk", "sourceClassification", "authenticityNotes"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = res.choices[0]?.message?.content;
    if (!content) return null;
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    return JSON.parse(contentStr);
  } catch {
    return null;
  }
}

export type SourceClassification = "camera_photo" | "screen_or_screenshot" | "flat_digital_crop" | "uncertain";

export function deriveAuthenticityAssessment(input: {
  captureSource: "camera" | "upload";
  physicalCardLikelihood: number;
  digitalImageRisk: number;
  sourceClassification: SourceClassification;
  notes: string;
}) {
  const physicalCardLikelihood = Math.max(0, Math.min(1, Number(input.physicalCardLikelihood ?? 0.5)));
  const digitalImageRisk = Math.max(0, Math.min(1, Number(input.digitalImageRisk ?? 0.5)));
  const digitalClassification = input.sourceClassification === "screen_or_screenshot" || input.sourceClassification === "flat_digital_crop";
  const status = digitalClassification || digitalImageRisk >= 0.72
    ? "likely_digital" as const
    : input.captureSource === "camera" && physicalCardLikelihood >= 0.72 && digitalImageRisk <= 0.35
      ? "likely_physical" as const
      : "uncertain" as const;

  return {
    status,
    physicalCardLikelihood,
    digitalImageRisk,
    sourceClassification: input.sourceClassification,
    notes: input.notes,
  };
}

async function searchScrydexByName(cardName: string, tcg: string): Promise<string | null> {
  const apiKey = await getScrydexApiKey();
  if (!apiKey) return null;
  try {
    const tcgPath = tcg === "mtg" ? "magic" : tcg === "pokemon" ? "pokemon" : tcg;
    const res = await fetch(
      `https://api.scrydex.com/${tcgPath}/v1/cards?q=${encodeURIComponent(cardName)}&limit=1`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { data?: Array<{ id: string }> };
    return data.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Router ────────────────────────────────────────────────────────────────────

export const cardsRouter = router({
  // Upload image and scan card
  scan: protectedProcedure
    .input(z.object({
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      captureSource: z.enum(["camera", "upload"]).default("upload"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Check credits (subscribers get unlimited)
      const user = ctx.user;
      const hasSubscription = user.subscriptionStatus === "active";
      if (!hasSubscription && user.scanCredits <= 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No scan credits remaining. Please purchase more credits or subscribe.",
        });
      }

      // Upload image to storage
      const imageBuffer = Buffer.from(input.imageBase64, "base64");
      const fileName = `scans/${userId}/${Date.now()}.jpg`;
      const { key: imageKey, url: imageUrl } = await storagePut(fileName, imageBuffer, input.mimeType);

      // Build full URL for LLM
      const baseUrl = process.env.VITE_APP_ID
        ? `https://${process.env.VITE_APP_ID}.manus.space`
        : "http://localhost:3000";
      const fullImageUrl = `${baseUrl}${imageUrl}`;

      // Identify card with LLM vision
      const identification = await identifyCardWithLLM(fullImageUrl);

      if (!identification || identification.confidence < 0.4) {
        await createScanSession({
          userId,
          imageKey,
          status: "low_confidence",
          creditsUsed: 1,
        });
        if (!hasSubscription) await deductScanCredit(userId);
        throw new TRPCError({
          code: "UNPROCESSABLE_CONTENT",
          message: "Could not confidently identify the card. Please try a clearer photo.",
        });
      }

      // Treat authenticity as a review signal, never proof of ownership or genuineness.
      const authenticity = deriveAuthenticityAssessment({
        captureSource: input.captureSource,
        physicalCardLikelihood: identification.physicalCardLikelihood,
        digitalImageRisk: identification.digitalImageRisk,
        sourceClassification: identification.sourceClassification,
        notes: identification.authenticityNotes,
      });

      // Search Scrydex for card ID
      let scrydexId: string | null = null;
      let prices = null;
      let scryfallData = null;

      scrydexId = await searchScrydexByName(identification.cardName, identification.tcg);
      if (scrydexId) {
        prices = await fetchScrydexPrices(scrydexId, identification.tcg);
      }

      // Fallback to Scryfall for MTG
      if (!prices && identification.tcg === "mtg") {
        scryfallData = await fetchScryfallPrice(identification.cardName, identification.setCode ?? undefined);
      }

      // Determine market value for high-value alert
      const marketValue = parseFloat(prices?.priceNm ?? scryfallData?.priceNm ?? "0");
      const thresholdStr = await getConfig("high_value_threshold");
      const threshold = parseFloat(thresholdStr ?? "100");
      const isHighValue = marketValue >= threshold;

      // Save card to DB
      const cardData = {
        userId,
        tcg: identification.tcg,
        cardName: identification.cardName,
        setName: identification.setName ?? undefined,
        setCode: identification.setCode ?? undefined,
        cardNumber: identification.cardNumber ?? undefined,
        rarity: identification.rarity ?? undefined,
        artist: identification.artist ?? undefined,
        scrydexId: scrydexId ?? undefined,
        scryfallId: scryfallData?.scryfallId ?? undefined,
        uploadedImageKey: imageKey,
        uploadedImageUrl: imageUrl,
        officialImageUrl: prices?.officialImageUrl ?? scryfallData?.officialImageUrl ?? undefined,
        priceNm: prices?.priceNm ?? scryfallData?.priceNm ?? undefined,
        priceLp: prices?.priceLp ?? undefined,
        priceMp: prices?.priceMp ?? undefined,
        priceHp: prices?.priceHp ?? undefined,
        priceDmg: prices?.priceDmg ?? undefined,
        gradedPrices: prices?.gradedPrices ?? undefined,
        identificationConfidence: String(identification.confidence),
        physicalCardLikelihood: String(authenticity.physicalCardLikelihood),
        digitalImageRisk: String(authenticity.digitalImageRisk),
        authenticityStatus: authenticity.status,
        authenticityNotes: authenticity.notes,
        captureSource: input.captureSource,
        pricesUpdatedAt: new Date(),
      };

      await createCard(cardData);

      // Get the inserted card ID
      const recentCards = await getRecentScans(userId, 1);
      const newCard = recentCards[0];

      // Log scan session
      await createScanSession({
        userId,
        cardId: newCard?.id,
        imageKey,
        status: "success",
        creditsUsed: hasSubscription ? 0 : 1,
        estimatedValue: marketValue > 0 ? String(marketValue) : undefined,
        isHighValue,
      });

      // Deduct credit if not subscriber
      if (!hasSubscription) await deductScanCredit(userId);

      // Notify owner if high value
      if (isHighValue) {
        await notifyOwner({
          title: `🔥 High-Value Card Scanned: ${identification.cardName}`,
          content: `User ${ctx.user.name ?? ctx.user.openId} scanned a **${identification.cardName}** (${identification.tcg.toUpperCase()}) valued at **$${marketValue.toFixed(2)}**, which exceeds the $${threshold} threshold.`,
        });
      }

      return {
        card: newCard,
        identification,
        authenticity: {
          status: authenticity.status,
          physicalCardLikelihood: authenticity.physicalCardLikelihood,
          digitalImageRisk: authenticity.digitalImageRisk,
          sourceClassification: authenticity.sourceClassification,
          notes: authenticity.notes,
          disclaimer: "This is a visual source signal, not proof that the user owns the card or that the card is genuine.",
        },
        isHighValue,
      };
    }),

  // Get card by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const card = await getCardById(input.id);
      if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" });
      if (card.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return card;
    }),

  // Refresh prices for a card
  refreshPrices: protectedProcedure
    .input(z.object({ cardId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const card = await getCardById(input.cardId);
      if (!card) throw new TRPCError({ code: "NOT_FOUND" });
      if (card.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      let prices = null;
      if (card.scrydexId) {
        prices = await fetchScrydexPrices(card.scrydexId, card.tcg);
      }
      if (!prices && card.tcg === "mtg") {
        const sf = await fetchScryfallPrice(card.cardName, card.setCode ?? undefined);
        if (sf) prices = { priceNm: sf.priceNm };
      }

      if (prices) {
        await updateCardPrices(input.cardId, {
          priceNm: prices.priceNm,
          priceLp: prices.priceLp,
          priceMp: prices.priceMp,
          priceHp: prices.priceHp,
          priceDmg: prices.priceDmg,
          gradedPrices: prices.gradedPrices,
        });
      }

      return getCardById(input.cardId);
    }),

  // Get recent scans for user
  recentScans: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      return getRecentScans(ctx.user.id, input.limit);
    }),
});

export { fetchScrydexPrices, fetchScryfallPrice };
