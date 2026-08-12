import type { Request, Response } from "express";
import { eq, or } from "drizzle-orm";
import { creditTransactions, users } from "../drizzle/schema";
import { addCredits, getDb } from "./db";
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "./routers/credits";

function parseUserId(value: unknown) {
  const userId = typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return res.status(503).json({ error: "Stripe webhook is not configured" });
  }

  let event: {
    id?: string;
    type?: string;
    data?: { object?: unknown };
  };

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey);
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody || !sig) return res.status(400).json({ error: "Missing webhook signature" });
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret) as unknown as typeof event;
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed", err instanceof Error ? err.message : "unknown error");
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  if (event.id?.startsWith("evt_test_")) {
    return res.json({ verified: true });
  }

  const db = await getDb();
  if (!db) return res.status(500).json({ error: "DB not available" });

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data?.object as {
          id?: string;
          metadata?: { userId?: string; packId?: string; paymentRail?: string };
        } | undefined;
        const userId = parseUserId(paymentIntent?.metadata?.userId);
        const packId = paymentIntent?.metadata?.packId;
        if (!userId || !packId || !paymentIntent?.id) break;

        const existing = await db.select({ id: creditTransactions.id })
          .from(creditTransactions)
          .where(eq(creditTransactions.stripePaymentIntentId, paymentIntent.id))
          .limit(1);
        if (existing.length > 0) break;

        const pack = CREDIT_PACKS.find(candidate => candidate.id === packId);
        if (pack) {
          await addCredits(userId, pack.credits, "purchase", `Purchased ${pack.name} (${pack.credits} credits)`, {
            stripePaymentIntentId: paymentIntent.id,
            packId,
          });
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data?.object as {
          id?: string;
          metadata?: { userId?: string; packId?: string };
          payment_intent?: string;
          subscription?: string;
          customer?: string;
          mode?: string;
        } | undefined;
        const userId = parseUserId(session?.metadata?.userId);
        const packId = session?.metadata?.packId;
        if (!userId || !session?.id) break;

        const duplicateFilters = [eq(creditTransactions.stripeSessionId, session.id)];
        if (typeof session.payment_intent === "string") {
          duplicateFilters.push(eq(creditTransactions.stripePaymentIntentId, session.payment_intent));
        }
        const existing = await db.select({ id: creditTransactions.id })
          .from(creditTransactions)
          .where(or(...duplicateFilters))
          .limit(1);
        if (existing.length > 0) break;

        if (session.mode === "payment" && packId) {
          const pack = CREDIT_PACKS.find(candidate => candidate.id === packId);
          if (pack) {
            await addCredits(userId, pack.credits, "purchase", `Purchased ${pack.name} (${pack.credits} credits)`, {
              stripeSessionId: session.id,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
              packId,
            });
          }
        } else if (session.mode === "subscription") {
          const plan = SUBSCRIPTION_PLANS.find(candidate => candidate.id === packId);
          if (plan && !("unlimited" in plan)) {
            await addCredits(userId, plan.creditsPerMonth, "subscription_grant", `${plan.name} subscription credits`, {
              stripeSessionId: session.id,
              packId,
            });
          }
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
        const subscription = event.data?.object as {
          id?: string;
          status?: string;
          current_period_end?: number;
        } | undefined;
        if (!subscription?.id) break;
        const userResult = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscription.id)).limit(1);
        const user = userResult[0];
        if (user) {
          const status = subscription.status === "active" ? "active"
            : subscription.status === "canceled" ? "canceled"
            : subscription.status === "past_due" ? "past_due"
            : "none";
          await db.update(users).set({
            subscriptionStatus: status,
            subscriptionEndsAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : undefined,
          }).where(eq(users.id, user.id));
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data?.object as {
          id?: string;
          subscription?: string;
        } | undefined;
        if (!invoice?.id || !invoice.subscription) break;
        const existing = await db.select({ id: creditTransactions.id })
          .from(creditTransactions)
          .where(eq(creditTransactions.stripeInvoiceId, invoice.id))
          .limit(1);
        if (existing.length > 0) break;

        const userResult = await db.select().from(users).where(eq(users.stripeSubscriptionId, invoice.subscription)).limit(1);
        const user = userResult[0];
        if (user?.subscriptionPlan) {
          const plan = SUBSCRIPTION_PLANS.find(candidate => candidate.id === user.subscriptionPlan);
          if (plan && !("unlimited" in plan)) {
            await addCredits(user.id, plan.creditsPerMonth, "subscription_grant", `Monthly ${plan.name} subscription renewal`, {
              stripeInvoiceId: invoice.id,
              packId: user.subscriptionPlan,
            });
          }
        }
        break;
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Processing error", err instanceof Error ? err.message : "unknown error");
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}
