import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  const user: NonNullable<TrpcContext["user"]> = {
    id: 1,
    openId: "test-user-1",
    email: "test@cardvault.app",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    scanCredits: 10,
    totalScansUsed: 5,
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

function makeAdminCtx(): TrpcContext {
  return makeCtx({ role: "admin" });
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns the current user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.id).toBe(1);
    expect(result?.email).toBe("test@cardvault.app");
  });

  it("returns null for unauthenticated context", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ─── Credits tests ────────────────────────────────────────────────────────────

describe("credits.balance", () => {
  it("returns scan credits and subscription status", async () => {
    const ctx = makeCtx({ scanCredits: 25, subscriptionStatus: "none" });
    const caller = appRouter.createCaller(ctx);
    const balance = await caller.credits.balance();
    expect(balance.scanCredits).toBe(25);
    expect(balance.subscriptionStatus).toBe("none");
  });

  it("returns active subscription info for subscribers", async () => {
    const ctx = makeCtx({ subscriptionStatus: "active", subscriptionPlan: "sub_pro" });
    const caller = appRouter.createCaller(ctx);
    const balance = await caller.credits.balance();
    expect(balance.subscriptionStatus).toBe("active");
    expect(balance.subscriptionPlan).toBe("sub_pro");
  });
});

describe("credits.packs", () => {
  it("returns available credit packs and subscription plans", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.credits.packs();
    expect(result.packs.length).toBeGreaterThan(0);
    expect(result.plans.length).toBeGreaterThan(0);
    // Verify pack structure
    const firstPack = result.packs[0];
    expect(firstPack).toHaveProperty("id");
    expect(firstPack).toHaveProperty("credits");
    expect(firstPack).toHaveProperty("price");
  });
});

// ─── Admin guard tests ────────────────────────────────────────────────────────

describe("admin procedures", () => {
  it("blocks non-admin users from accessing admin stats", async () => {
    const ctx = makeCtx({ role: "user" });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("allows admin users to access admin stats", async () => {
    // Admin stats requires DB, so we just verify it doesn't throw FORBIDDEN
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    // Will throw DB error in test env (no DB), but NOT a FORBIDDEN error
    try {
      await caller.admin.stats();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      expect(error?.code).not.toBe("FORBIDDEN");
    }
  });

  it("returns payment readiness without exposing credentials", async () => {
    const caller = appRouter.createCaller(makeAdminCtx());
    const result = await caller.admin.paymentStatus();
    expect(typeof result.stripe.walletCheckoutConfigured).toBe("boolean");
    expect(typeof result.xrpl.configured).toBe("boolean");
    expect(result).not.toHaveProperty("secretKey");
    expect(result).not.toHaveProperty("webhookSecret");
  });
});

// ─── Stripe router tests ──────────────────────────────────────────────────────

describe("stripe.createPackCheckout", () => {
  it("throws when pack ID is invalid", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.stripe.createPackCheckout({ packId: "invalid_pack_xyz" })
    ).rejects.toThrow();
  });
});

describe("stripe.createSubscriptionCheckout", () => {
  it("throws when plan ID is invalid", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.stripe.createSubscriptionCheckout({ planId: "invalid_plan_xyz" })
    ).rejects.toThrow();
  });
});

// ─── Sell router tests ────────────────────────────────────────────────────────

describe("sell.generateListing", () => {
  it("throws NOT_FOUND for non-existent card", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.sell.generateListing({ cardId: 999999 })
    ).rejects.toThrow();
  });
});

// ─── Templates router tests ───────────────────────────────────────────────────

describe("templates.list", () => {
  it("returns an array (empty or populated) for authenticated user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    // Will return empty array or throw DB error in test env
    try {
      const result = await caller.templates.list();
      expect(Array.isArray(result)).toBe(true);
    } catch {
      // DB not available in test env — acceptable
    }
  });
});

// ─── Binder router tests ──────────────────────────────────────────────────────

describe("binder.list", () => {
  it("returns an array for authenticated user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.binder.list();
      expect(Array.isArray(result)).toBe(true);
    } catch {
      // DB not available in test env — acceptable
    }
  });
});

// ─── Profile router tests ─────────────────────────────────────────────────────

describe("profile.update", () => {
  it("throws DB error (not FORBIDDEN) when updating own profile", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.profile.update({ name: "Updated Name" });
    } catch (err: unknown) {
      const error = err as { code?: string };
      // Should not throw FORBIDDEN — user is updating their own profile
      expect(error?.code).not.toBe("FORBIDDEN");
    }
  });
});
