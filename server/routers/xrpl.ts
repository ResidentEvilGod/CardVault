import { randomInt } from "node:crypto";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  confirmXrplPaymentIntent,
  createXrplPaymentIntent,
  getXrplPaymentHistory,
  getXrplPaymentIntent,
} from "../db";
import { buildXrplQuote, getXrplSettings, verifyXrplPayment } from "../xrpl";
import { CREDIT_PACKS } from "./credits";

const transactionHashSchema = z.string().regex(/^[A-Fa-f0-9]{64}$/, "Enter a valid 64-character XRPL transaction hash");

export const xrplRouter = router({
  createPackPayment: protectedProcedure
    .input(z.object({ packId: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const pack = CREDIT_PACKS.find((candidate) => candidate.id === input.packId);
      if (!pack) throw new TRPCError({ code: "NOT_FOUND", message: "Credit pack not found" });

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      const invoiceId = `cv_${nanoid(20)}`;
      const destinationTag = randomInt(1, 4_294_967_295);
      const quote = await buildXrplQuote({
        invoiceId,
        packPriceCents: pack.price,
        destinationTag,
        expiresAt,
      });

      await createXrplPaymentIntent({
        invoiceId,
        userId: ctx.user.id,
        packId: pack.id,
        credits: pack.credits,
        destinationAddress: quote.destinationAddress,
        destinationTag: quote.destinationTag,
        amountDrops: quote.amountDrops,
        amountXrp: quote.amountXrp,
        status: "pending",
        expiresAt: quote.expiresAt,
      });

      return {
        ...quote,
        packName: pack.name,
        credits: pack.credits,
        network: process.env.XRPL_NETWORK_WS?.includes("altnet") ? "testnet" : "configured",
      };
    }),

  verifyPackPayment: protectedProcedure
    .input(z.object({
      invoiceId: z.string().regex(/^cv_[A-Za-z0-9_-]{20}$/),
      transactionHash: transactionHashSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const intent = await getXrplPaymentIntent(input.invoiceId, ctx.user.id);
      if (!intent) throw new TRPCError({ code: "NOT_FOUND", message: "Payment invoice not found" });
      if (intent.status === "confirmed") {
        return { status: "already_processed" as const, creditsGranted: intent.credits };
      }
      if (intent.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invoice is ${intent.status}` });
      }

      let verified;
      try {
        verified = await verifyXrplPayment(input.transactionHash, intent);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Unable to verify XRPL payment",
        });
      }

      try {
        const result = await confirmXrplPaymentIntent({
          invoiceId: input.invoiceId,
          transactionHash: verified.transactionHash,
          sourceAddress: verified.sourceAddress,
          destinationAddress: verified.destinationAddress,
          destinationTag: verified.destinationTag,
          amountDrops: verified.amountDrops,
          ledgerIndex: verified.ledgerIndex,
          confirmedAt: verified.confirmedAt,
        });

        return {
          ...result,
          transactionHash: verified.transactionHash,
          explorerUrl: `https://testnet.xrpscan.com/tx/${verified.transactionHash}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "CONFLICT",
          message: error instanceof Error ? error.message : "Payment was already processed",
        });
      }
    }),

  getInvoice: protectedProcedure
    .input(z.object({ invoiceId: z.string().regex(/^cv_[A-Za-z0-9_-]{20}$/) }))
    .query(async ({ ctx, input }) => {
      const intent = await getXrplPaymentIntent(input.invoiceId, ctx.user.id);
      if (!intent) throw new TRPCError({ code: "NOT_FOUND", message: "Payment invoice not found" });
      return intent;
    }),

  history: protectedProcedure.query(({ ctx }) => getXrplPaymentHistory(ctx.user.id)),

  configuration: protectedProcedure.query(() => {
    const { destinationAddress, networkWs } = getXrplSettings();
    return {
      destinationAddress,
      network: networkWs.includes("altnet") ? "testnet" : "configured",
    };
  }),
});
