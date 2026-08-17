import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { addCredits, getCreditTransactions } from "../db";

// Credit pack definitions
export const CREDIT_PACKS = [
  { id: "pack_10", name: "Starter Pack", credits: 10, price: 199, stripePriceId: "" },
  { id: "pack_25", name: "Collector Pack", credits: 25, price: 399, stripePriceId: "" },
  { id: "pack_100", name: "Vault Pack", credits: 100, price: 999, stripePriceId: "" },
] as const;

export const SUBSCRIPTION_PLANS = [
  { id: "sub_basic", name: "Apprentice", creditsPerMonth: 50, price: 499, interval: "month", stripePriceId: "" },
  { id: "sub_pro", name: "Archmage", creditsPerMonth: -1, price: 999, interval: "month", stripePriceId: "", unlimited: true },
] as const;

export const creditsRouter = router({
  // Get current balance and subscription status
  balance: protectedProcedure.query(({ ctx }) => {
    return {
      scanCredits: ctx.user.scanCredits,
      totalScansUsed: ctx.user.totalScansUsed,
      subscriptionStatus: ctx.user.subscriptionStatus,
      subscriptionPlan: ctx.user.subscriptionPlan,
      subscriptionEndsAt: ctx.user.subscriptionEndsAt,
    };
  }),

  // Get transaction history
  history: protectedProcedure.query(async ({ ctx }) => {
    return getCreditTransactions(ctx.user.id);
  }),

  // Get available packs and plans
  packs: protectedProcedure.query(() => {
    return { packs: CREDIT_PACKS, plans: SUBSCRIPTION_PLANS };
  }),

  // Admin: grant credits to user
  adminGrant: adminProcedure
    .input(z.object({
      userId: z.number().int().positive(),
      amount: z.number().int().min(1).max(1_000_000),
      description: z.string().trim().max(256).optional(),
    }))
    .mutation(async ({ input }) => {
      await addCredits(input.userId, input.amount, "admin_grant", input.description ?? "Admin credit grant");
      return { success: true };
    }),
});
