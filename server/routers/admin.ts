import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
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
