import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getXrplSettings } from "../xrpl";
import {
  getAllConfig,
  getAllUsers,
  getHighValueScans,
  getPriceUpdateJob,
  getRecentScanSessions,
  getTotalScanCount,
  getUserCount,
  setConfig,
  updateUser,
} from "../db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // Dashboard stats
  stats: adminProcedure.query(async () => {
    const [userCount, totalScans, priceJob] = await Promise.all([
      getUserCount(),
      getTotalScanCount(),
      getPriceUpdateJob(),
    ]);
    return { userCount, totalScans, priceJob };
  }),

  // User list
  users: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return getAllUsers(input.limit, input.offset);
    }),

  // Recent scan sessions
  recentScans: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      return getRecentScanSessions(input.limit);
    }),

  // High value scans
  highValueScans: adminProcedure.query(async () => {
    return getHighValueScans();
  }),

  // Get all config
  getConfig: adminProcedure.query(async () => {
    return getAllConfig();
  }),

  paymentStatus: adminProcedure.query(() => {
    const stripeSecretConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
    const stripePublishableConfigured = Boolean(process.env.VITE_STRIPE_PUBLISHABLE_KEY);
    const stripeWebhookConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
    let xrplConfigured = false;
    let xrplNetwork = "not configured";
    let xrplDestinationAddress: string | null = null;

    try {
      const settings = getXrplSettings();
      xrplConfigured = true;
      xrplNetwork = settings.networkWs.includes("altnet") ? "testnet" : "configured";
      xrplDestinationAddress = settings.destinationAddress;
    } catch {
      // Keep status safe and actionable without exposing secret configuration values.
    }

    return {
      stripe: {
        secretConfigured: stripeSecretConfigured,
        publishableConfigured: stripePublishableConfigured,
        webhookConfigured: stripeWebhookConfigured,
        walletCheckoutConfigured: stripeSecretConfigured && stripePublishableConfigured && stripeWebhookConfigured,
        note: "Apple Pay and Google Pay also require processor activation and domain verification in Stripe.",
      },
      xrpl: {
        configured: xrplConfigured,
        network: xrplNetwork,
        destinationAddress: xrplDestinationAddress,
        note: "Use the XRPL testnet until payment verification and operational controls are approved for production.",
      },
    };
  }),

  // Update config value
  setConfig: adminProcedure
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      await setConfig(input.key, input.value);
      return { success: true };
    }),

  // Update user role or credits
  updateUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin"]).optional(),
      scanCredits: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { userId, ...data } = input;
      await updateUser(userId, data);
      return { success: true };
    }),
});
