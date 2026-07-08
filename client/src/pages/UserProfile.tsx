import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Crown, Loader2, Settings, User, Zap } from "lucide-react";
import { Link } from "wouter";

export default function UserProfile() {
  const { user, isAuthenticated } = useAuth();
  const { data: balance } = trpc.credits.balance.useQuery(undefined, { enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <User className="w-16 h-16 mb-4" style={{ color: "var(--gold)", opacity: 0.3 }} />
        <h2 className="font-display text-2xl font-bold text-gradient-gold mb-2">Sign in to view your profile</h2>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">My Profile</h1>
        <p className="text-muted-foreground text-sm">Your account details and subscription status.</p>
      </div>

      <div className="space-y-5">
        {/* User info */}
        <div className="fantasy-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-display font-bold"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 55), oklch(0.55 0.25 290))", color: "white" }}>
              {(user?.name ?? "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground">{user?.name ?? "Adventurer"}</h2>
              {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
              {user?.role === "admin" && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Crown className="w-3.5 h-3.5" style={{ color: "var(--gold)" }} />
                  <span className="text-xs font-heading" style={{ color: "var(--gold)" }}>Admin</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg" style={{ background: "oklch(0.18 0.03 50)" }}>
              <div className="text-xs font-heading text-muted-foreground uppercase tracking-wider mb-1">Member Since</div>
              <div className="font-heading text-sm font-semibold text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
              </div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "oklch(0.18 0.03 50)" }}>
              <div className="text-xs font-heading text-muted-foreground uppercase tracking-wider mb-1">Login Method</div>
              <div className="font-heading text-sm font-semibold text-foreground capitalize">{user?.loginMethod ?? "Manus"}</div>
            </div>
          </div>
        </div>

        {/* Subscription status */}
        <div className="fantasy-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" style={{ color: "var(--gold)" }} />
            <h3 className="font-heading text-base font-semibold text-foreground">Scan Credits & Subscription</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg text-center" style={{ background: "oklch(0.18 0.04 55 / 0.3)", border: "1px solid oklch(0.45 0.10 60 / 0.3)" }}>
              <div className="text-xs font-heading text-muted-foreground uppercase tracking-wider mb-1">Scan Credits</div>
              <div className="font-heading text-2xl font-bold" style={{ color: "var(--gold)" }}>
                {balance?.subscriptionStatus === "active" ? "∞" : (balance?.scanCredits ?? 0)}
              </div>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ background: "oklch(0.18 0.04 55 / 0.3)", border: "1px solid oklch(0.45 0.10 60 / 0.3)" }}>
              <div className="text-xs font-heading text-muted-foreground uppercase tracking-wider mb-1">Total Scans</div>
              <div className="font-heading text-2xl font-bold text-foreground">{balance?.totalScansUsed ?? 0}</div>
            </div>
          </div>

          {balance?.subscriptionStatus === "active" ? (
            <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: "oklch(0.18 0.06 55 / 0.3)", border: "1px solid oklch(0.72 0.18 55 / 0.4)" }}>
              <Crown className="w-5 h-5 flex-shrink-0" style={{ color: "var(--gold)" }} />
              <div>
                <div className="font-heading text-sm font-semibold" style={{ color: "var(--gold)" }}>Active Subscription</div>
                <div className="text-xs text-muted-foreground">{balance.subscriptionPlan}</div>
              </div>
            </div>
          ) : (
            <Link href="/credits">
              <button className="btn-fantasy w-full text-sm">
                <Zap className="w-4 h-4" />
                Upgrade to Unlimited
              </button>
            </Link>
          )}
        </div>

        {/* Quick links */}
        <div className="fantasy-card p-5">
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">Quick Links</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/settings", label: "Account Settings", icon: Settings },
              { href: "/purchase-history", label: "Purchase History", icon: Zap },
              { href: "/binder", label: "My Binder", icon: User },
              { href: "/credits", label: "Buy Credits", icon: Crown },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <button className="w-full flex items-center gap-2 p-3 rounded-lg text-sm font-heading text-left transition-all hover:opacity-80"
                  style={{ background: "oklch(0.18 0.03 50)", border: "1px solid oklch(0.30 0.05 55 / 0.4)", color: "oklch(0.65 0.05 55)" }}>
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--gold)" }} />
                  {label}
                </button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
