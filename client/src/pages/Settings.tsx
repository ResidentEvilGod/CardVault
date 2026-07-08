import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { LogOut, Settings as SettingsIcon, Shield, User } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <SettingsIcon className="w-16 h-16 mb-4" style={{ color: "var(--gold)", opacity: 0.3 }} />
        <h2 className="font-display text-2xl font-bold text-gradient-gold mb-2">Sign in to access settings</h2>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account preferences.</p>
      </div>

      <div className="space-y-5">
        {/* Account info */}
        <div className="fantasy-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-5 h-5" style={{ color: "var(--gold)" }} />
            <h3 className="font-heading text-base font-semibold text-foreground">Account Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider block mb-1">Display Name</label>
              <div className="px-3 py-2 rounded text-sm text-foreground" style={{ background: "oklch(0.18 0.03 50)", border: "1px solid oklch(0.30 0.05 55 / 0.4)" }}>
                {user?.name ?? "—"}
              </div>
            </div>
            <div>
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider block mb-1">Email Address</label>
              <div className="px-3 py-2 rounded text-sm text-foreground" style={{ background: "oklch(0.18 0.03 50)", border: "1px solid oklch(0.30 0.05 55 / 0.4)" }}>
                {user?.email ?? "—"}
              </div>
            </div>
            <div>
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider block mb-1">Account Role</label>
              <div className="px-3 py-2 rounded text-sm text-foreground capitalize" style={{ background: "oklch(0.18 0.03 50)", border: "1px solid oklch(0.30 0.05 55 / 0.4)" }}>
                {user?.role ?? "user"}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Account details are managed through Manus OAuth. To update your name or email, please update your Manus profile.</p>
        </div>

        {/* Privacy & Security */}
        <div className="fantasy-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-5 h-5" style={{ color: "var(--gold)" }} />
            <h3 className="font-heading text-base font-semibold text-foreground">Privacy & Security</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "oklch(0.18 0.03 50)" }}>
              <div>
                <div className="font-heading text-sm font-semibold text-foreground">Authentication</div>
                <div className="text-xs text-muted-foreground">Secured via Manus OAuth</div>
              </div>
              <div className="text-xs font-heading px-2 py-1 rounded" style={{ background: "oklch(0.20 0.10 160 / 0.3)", color: "oklch(0.60 0.20 160)", border: "1px solid oklch(0.40 0.15 160 / 0.4)" }}>
                Active
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "oklch(0.18 0.03 50)" }}>
              <div>
                <div className="font-heading text-sm font-semibold text-foreground">Session</div>
                <div className="text-xs text-muted-foreground">Signed in as {user?.name}</div>
              </div>
              <button
                onClick={() => { logout(); toast.success("Signed out successfully"); }}
                className="flex items-center gap-1.5 text-xs font-heading px-3 py-1.5 rounded transition-all hover:opacity-80"
                style={{ background: "oklch(0.18 0.04 25 / 0.3)", color: "oklch(0.55 0.22 25)", border: "1px solid oklch(0.35 0.15 25 / 0.4)" }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Data */}
        <div className="fantasy-card p-6">
          <h3 className="font-heading text-base font-semibold text-foreground mb-4">Your Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            CardVault stores your card scans, binder collection, and listing templates. All data is associated with your Manus account and can be deleted upon request.
          </p>
          <p className="text-xs text-muted-foreground">
            For data deletion requests or privacy concerns, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
}
