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

export function isSensitiveConfigKey(key: string): boolean {
  return /(api[_-]?key|secret|token|password|private)/i.test(key);
}

export function redactConfigRows<T extends { key: string; value: string }>(rows: T[]) {
  return rows.map((row) => ({
    ...row,
    value: isSensitiveConfigKey(row.key) ? "[configured]" : row.value,
    isSensitive: isSensitiveConfigKey(row.key),
  }));
}

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
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(100_000).default(0) }))
    .query(async ({ input }) => {
      return getAllUsers(input.limit, input.offset);
    }),

  // Recent scan sessions
  recentScans: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      return getRecentScanSessions(input.limit);
    }),

  // High value scans
  highValueScans: adminProcedure.query(async () => {
    return getHighValueScans();
  }),

  // Get all config
  getConfig: adminProcedure.query(async () => {
    return redactConfigRows(await getAllConfig());
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
    .input(z.object({
      key: z.enum(["high_value_threshold", "scrydex_api_key"]),
      value: z.string().trim().min(1).max(512),
    }))
    .mutation(async ({ input }) => {
      if (input.key === "high_value_threshold") {
        const threshold = Number(input.value);
        if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1_000_000) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Threshold must be between 0 and 1,000,000." });
        }
      }
      await setConfig(input.key, input.value);
      return { success: true };
    }),

  // Update user role or credits
  updateUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["user", "admin"]).optional(),
      scanCredits: z.number().int().min(0).max(1_000_000).optional(),
    }))
    .mutation(async ({ input }) => {
      const { userId, ...data } = input;
      await updateUser(userId, data);
      return { success: true };
    }),
});
