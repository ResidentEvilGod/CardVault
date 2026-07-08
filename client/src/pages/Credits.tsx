import { trpc } from "@/lib/trpc";
import {
  CheckCircle,
  Crown,
  Loader2,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const CREDIT_PACKS = [
  { id: "pack_25", name: "Apprentice Pack", credits: 25, price: 2.99, popular: false, desc: "Perfect for casual collectors" },
  { id: "pack_100", name: "Vault Pack", credits: 100, price: 9.99, popular: true, desc: "Best value for regular scanners" },
  { id: "pack_300", name: "Archmage Pack", credits: 300, price: 24.99, popular: false, desc: "For serious collectors" },
];

const SUBSCRIPTION_PLANS = [
  {
    id: "sub_monthly",
    name: "Archmage Monthly",
    price: 9.99,
    interval: "month",
    features: ["Unlimited card scans", "Priority AI processing", "Daily price updates", "eBay listing generator", "Graded card prices", "Email support"],
    icon: Crown,
    color: "var(--gold)",
  },
  {
    id: "sub_yearly",
    name: "Archmage Annual",
    price: 79.99,
    interval: "year",
    features: ["Everything in Monthly", "Save 33% vs monthly", "Priority support", "Early access to new features"],
    icon: Star,
    color: "oklch(0.65 0.22 280)",
    badge: "Best Value",
  },
];

export default function Credits() {
  const { data: balance, refetch } = trpc.credits.balance.useQuery();

  const packCheckoutMutation = trpc.stripe.createPackCheckout.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) window.location.href = data.url; },
    onError: (err: { message?: string }) => toast.error(err.message || "Failed to start checkout"),
  });

  const subCheckoutMutation = trpc.stripe.createSubscriptionCheckout.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) window.location.href = data.url; },
    onError: (err: { message?: string }) => toast.error(err.message || "Failed to start checkout"),
  });

  const portalMutation = trpc.stripe.createPortalSession.useMutation({
    onSuccess: (data: { url: string }) => { if (data.url) window.location.href = data.url; },
    onError: () => toast.error("Failed to open billing portal"),
  });

  const isSubscribed = balance?.subscriptionStatus === "active";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">Credits & Plans</h1>
        <p className="text-muted-foreground text-sm">Choose the right plan for your collection needs.</p>
      </div>

      {/* Current balance */}
      <div className="fantasy-card p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.22 0.06 55 / 0.4)", border: "1px solid oklch(0.78 0.16 75 / 0.3)" }}>
              <Zap className="w-6 h-6" style={{ color: "var(--gold)" }} />
            </div>
            <div>
              <div className="text-xs font-heading text-muted-foreground uppercase tracking-wider mb-1">Your Current Balance</div>
              {isSubscribed ? (
                <div className="font-heading text-2xl font-bold" style={{ color: "var(--gold)" }}>∞ Unlimited Scans</div>
              ) : (
                <div className="font-heading text-2xl font-bold" style={{ color: "var(--gold)" }}>
                  {balance?.scanCredits ?? 0} <span className="text-base font-normal text-muted-foreground">scan credits</span>
                </div>
              )}
              {isSubscribed && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Crown className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
                  <span className="text-sm font-heading" style={{ color: "var(--gold)" }}>Archmage Subscriber</span>
                </div>
              )}
            </div>
          </div>
          {isSubscribed && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="btn-arcane text-sm"
            >
              {portalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              Manage Subscription
            </button>
          )}
        </div>
      </div>

      {/* Subscription plans */}
      {!isSubscribed && (
        <div className="mb-10">
          <div className="ornate-divider mb-6">
            <span className="font-heading text-sm text-muted-foreground tracking-widest uppercase">Unlimited Plans</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const Icon = plan.icon;
              return (
                <div key={plan.id} className="fantasy-card p-6 relative"
                  style={{ borderColor: plan.badge ? "oklch(0.55 0.25 290 / 0.5)" : undefined }}>
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rune-badge text-xs"
                      style={{ color: plan.color, borderColor: `${plan.color}60` }}>
                      <Sparkles className="w-3 h-3" /> {plan.badge}
                    </div>
                  )}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${plan.color}20`, border: `1px solid ${plan.color}40` }}>
                      <Icon className="w-5 h-5" style={{ color: plan.color }} />
                    </div>
                    <div>
                      <h3 className="font-heading text-base font-semibold text-foreground">{plan.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="font-heading text-2xl font-bold" style={{ color: plan.color }}>${plan.price}</span>
                        <span className="text-xs text-muted-foreground">/{plan.interval}</span>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: plan.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => subCheckoutMutation.mutate({ planId: plan.id })}
                    disabled={subCheckoutMutation.isPending}
                    className="w-full btn-fantasy text-sm"
                    style={plan.badge ? { background: `linear-gradient(135deg, ${plan.color}, oklch(0.45 0.22 295))` } : {}}
                  >
                    {subCheckoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                    Subscribe Now
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Credit packs */}
      <div>
        <div className="ornate-divider mb-6">
          <span className="font-heading text-sm text-muted-foreground tracking-widest uppercase">Credit Packs</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.id} className={`fantasy-card p-5 relative ${pack.popular ? "glow-gold" : ""}`}
              style={pack.popular ? { borderColor: "oklch(0.78 0.16 75 / 0.6)" } : {}}>
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rune-badge text-xs">
                  <Star className="w-3 h-3" /> Popular
                </div>
              )}
              <div className="text-center mb-4">
                <div className="font-heading text-base font-semibold text-foreground mb-1">{pack.name}</div>
                <div className="price-display">${pack.price}</div>
                <div className="text-xs text-muted-foreground mt-1">{pack.desc}</div>
              </div>
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg mb-4"
                style={{ background: "oklch(0.18 0.04 55 / 0.3)", border: "1px solid oklch(0.45 0.10 60 / 0.3)" }}>
                <Zap className="w-4 h-4" style={{ color: "var(--gold)" }} />
                <span className="font-heading text-lg font-bold" style={{ color: "var(--gold)" }}>{pack.credits}</span>
                <span className="text-sm text-muted-foreground">scans</span>
              </div>
              <div className="text-xs text-center text-muted-foreground mb-4">
                ${(pack.price / pack.credits).toFixed(3)} per scan • Never expires
              </div>
              <button
                onClick={() => packCheckoutMutation.mutate({ packId: pack.id })}
                disabled={packCheckoutMutation.isPending}
                className={`w-full ${pack.popular ? "btn-fantasy" : "btn-arcane"} text-sm`}
              >
                {packCheckoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Buy {pack.credits} Credits
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Free tier note */}
      <div className="mt-8 p-4 rounded-lg text-center"
        style={{ background: "oklch(0.16 0.03 50 / 0.5)", border: "1px solid oklch(0.30 0.05 55 / 0.3)" }}>
        <p className="text-sm text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 inline mr-1" style={{ color: "var(--gold)" }} />
          New accounts receive <strong style={{ color: "var(--gold)" }}>5 free scan credits</strong> to get started. No credit card required.
        </p>
      </div>
    </div>
  );
}
