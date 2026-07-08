import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "./credits";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getAppUrl() {
  return process.env.VITE_APP_URL || "https://cardvault.manus.space";
}

export const stripeRouter = router({
  // Create checkout session for credit pack
  createPackCheckout: protectedProcedure
    .input(z.object({ packId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      if (!stripe) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment processing not configured. Please contact support." });
      }

      const pack = CREDIT_PACKS.find(p => p.id === input.packId);
      if (!pack) throw new TRPCError({ code: "NOT_FOUND", message: "Pack not found" });

      const appUrl = getAppUrl();

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `CardVault ${pack.name}`,
              description: `${pack.credits} scan credits for CardVault`,
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        }],
        metadata: {
          userId: String(ctx.user.id),
          packId: pack.id,
        },
        success_url: `${appUrl}/credits?success=true&pack=${pack.id}`,
        cancel_url: `${appUrl}/credits?canceled=true`,
        customer_email: ctx.user.email ?? undefined,
      });

      return { url: session.url };
    }),

  // Create checkout session for subscription
  createSubscriptionCheckout: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      if (!stripe) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment processing not configured. Please contact support." });
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.id === input.planId);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });

      const appUrl = getAppUrl();

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `CardVault ${plan.name} Subscription`,
              description: "unlimited" in plan
                ? "Unlimited card scans per month"
                : `${plan.creditsPerMonth} scan credits per month`,
            },
            unit_amount: plan.price,
            recurring: { interval: plan.interval as "month" },
          },
          quantity: 1,
        }],
        metadata: {
          userId: String(ctx.user.id),
          packId: plan.id,
        },
        success_url: `${appUrl}/credits?success=true&plan=${plan.id}`,
        cancel_url: `${appUrl}/credits?canceled=true`,
        customer_email: ctx.user.email ?? undefined,
      });

      return { url: session.url };
    }),

  // Create customer portal session for managing subscription
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripe();
    if (!stripe) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Payment processing not configured." });
    }

    if (!ctx.user.stripeCustomerId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active subscription found." });
    }

    const appUrl = getAppUrl();
    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.user.stripeCustomerId,
      return_url: `${appUrl}/settings`,
    });

    return { url: session.url };
  }),
});
