import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  const user: NonNullable<TrpcContext["user"]> = {
    id: 1,
    openId: "test-user-1",
    email: "test@cardvault.app",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    scanCredits: 5,
    totalScansUsed: 0,
    subscriptionStatus: "none",
    subscriptionPlan: null,
    subscriptionEndsAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("CardVault Security & Abuse Prevention Integration Tests", () => {
  it("blocks non-admin users from accessing admin config", async () => {
    const caller = appRouter.createCaller(makeCtx({ role: "user" }));
    await expect(caller.admin.getConfig()).rejects.toThrow();
  });

  it("validates input boundaries on admin configuration updates", async () => {
    const adminCaller = appRouter.createCaller(makeCtx({ role: "admin" }));
    await expect(
      adminCaller.admin.setConfig({ key: "high_value_threshold", value: "invalid_number" })
    ).rejects.toThrow();
  });

  it("validates base64 image payload length and mime types on scan mutation", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.cards.scan({ imageBase64: "too-short", mimeType: "image/jpeg" })
    ).rejects.toThrow();
  });
});
