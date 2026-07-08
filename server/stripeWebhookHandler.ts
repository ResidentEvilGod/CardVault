import type { Request, Response } from "express";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { addCredits } from "./db";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "./routers/credits";

export async function stripeWebhookHandler(req: Request, res: Response) {
  // We'll validate the Stripe signature when Stripe is set up
  const sig = req.headers["stripe-signature"];
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    return res.status(400).json({ error: "Stripe not configured" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any;

  try {
    if (webhookSecret && sig) {
      // Dynamic import Stripe to avoid issues if not installed
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeSecretKey);
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        return res.status(400).json({ error: "No raw body" });
      }
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret) as typeof event;
    } else {
      event = req.body as typeof event;
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error:", err);
    return res.status(400).json({ error: "Webhook error" });
  }

  const db = await getDb();
  if (!db) return res.status(500).json({ error: "DB not available" });

  // Handle test events from Stripe verification
  if (event.id && event.id.startsWith('evt_test_')) {
    console.log('[Webhook] Test event detected, returning verification response');
    return res.json({ verified: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          id: string;
          metadata?: { userId?: string; packId?: string };
          payment_intent?: string;
          subscription?: string;
          customer?: string;
          mode?: string;
        };
        const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
        const packId = session.metadata?.packId;

        if (!userId) break;

        if (session.mode === "payment" && packId) {
          // One-time credit pack purchase
          const pack = CREDIT_PACKS.find(p => p.id === packId);
          if (pack) {
            await addCredits(userId, pack.credits, "purchase", `Purchased ${pack.name} (${pack.credits} credits)`, {
              stripeSessionId: session.id,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
              packId,
            });
          }
        } else if (session.mode === "subscription") {
          // Subscription started - grant monthly credits
          const plan = SUBSCRIPTION_PLANS.find(p => p.id === packId);
          if (plan && !('unlimited' in plan)) {
            await addCredits(userId, plan.creditsPerMonth, "subscription_grant", `${plan.name} subscription credits`, {
              stripeSessionId: session.id,
            });
          }
          // Update subscription status
          if (session.customer) {
            await db.update(users).set({
              subscriptionStatus: "active",
              subscriptionPlan: packId ?? undefined,
              stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
              stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : undefined,
            }).where(eq(users.id, userId));
          }
        }
        break;
      }

      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const subscription = event.data.object as {
          id: string;
          status: string;
          customer: string;
          current_period_end?: number;
        };
        // Find user by Stripe subscription ID
        const userResult = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscription.id)).limit(1);
        const user = userResult[0];
        if (user) {
          const status = subscription.status === "active" ? "active"
            : subscription.status === "canceled" ? "canceled"
            : subscription.status === "past_due" ? "past_due"
            : "none";

          await db.update(users).set({
            subscriptionStatus: status as "none" | "active" | "canceled" | "past_due",
            subscriptionEndsAt: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : undefined,
          }).where(eq(users.id, user.id));
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as {
          subscription?: string;
          customer?: string;
        };
        // Grant monthly credits for subscription renewal
        if (invoice.subscription) {
          const userResult = await db.select().from(users).where(eq(users.stripeSubscriptionId, invoice.subscription as string)).limit(1);
          const user = userResult[0];
          if (user && user.subscriptionPlan) {
            const plan = SUBSCRIPTION_PLANS.find(p => p.id === user.subscriptionPlan);
            if (plan && !('unlimited' in plan)) {
              await addCredits(user.id, plan.creditsPerMonth, "subscription_grant", `Monthly ${plan.name} subscription renewal`);
            }
          }
        }
        break;
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return res.status(500).json({ error: "Processing error" });
  }
}
