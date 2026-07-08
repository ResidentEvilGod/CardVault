import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BarChart3,
  BookOpen,
  Crown,
  Loader2,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [grantUserId, setGrantUserId] = useState("");
  const [grantAmount, setGrantAmount] = useState("10");
  const [threshold, setThreshold] = useState("100");

  const { data: stats, isLoading } = trpc.admin.stats.useQuery();
  const { data: highValueScans } = trpc.admin.highValueScans.useQuery();
  const { data: configArr } = trpc.admin.getConfig.useQuery();
  const config = configArr ? Object.fromEntries(configArr.map(c => [c.key, c.value])) : {};

  const setConfigMutation = trpc.admin.setConfig.useMutation({
    onSuccess: () => toast.success("Config updated!"),
    onError: () => toast.error("Failed to update config"),
  });

  const grantMutation = trpc.credits.adminGrant.useMutation({
    onSuccess: () => { toast.success("Credits granted!"); setGrantUserId(""); },
    onError: (err: { message?: string }) => toast.error(err.message || "Failed to grant credits"),
  });


  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Crown className="w-16 h-16 mb-4" style={{ color: "var(--gold)", opacity: 0.3 }} />
        <h2 className="font-display text-2xl font-bold text-gradient-gold mb-2">Admin Access Required</h2>
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gold)" }} /></div>;

  const inputStyle = { background: "oklch(0.18 0.03 50)", border: "1px solid oklch(0.35 0.06 55)", color: "oklch(0.92 0.04 60)" };

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-7 h-7" style={{ color: "var(--gold)" }} />
          <h1 className="font-display text-3xl font-bold text-gradient-gold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-sm">Manage your CardVault application.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Users", value: stats?.userCount ?? 0, icon: Users, color: "oklch(0.65 0.18 200)" },
          { label: "Total Scans", value: stats?.totalScans ?? 0, icon: Wand2, color: "var(--gold)" },
          { label: "Binder Cards", value: (highValueScans?.length ?? 0), icon: BookOpen, color: "oklch(0.60 0.20 160)" },
          { label: "High Value Scans", value: (highValueScans?.length ?? 0), icon: Zap, color: "oklch(0.65 0.22 280)" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="fantasy-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stat.color}20`, border: `1px solid ${stat.color}40` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
                </div>
                <div>
                  <div className="font-heading text-xl font-bold" style={{ color: stat.color }}>{stat.value.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground font-heading uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* High-value threshold config */}
        <div className="fantasy-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" style={{ color: "var(--gold)" }} />
            <h3 className="font-heading text-base font-semibold text-foreground">High-Value Alert Threshold</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            You'll receive an email notification when a card valued above this amount is scanned.
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
                placeholder={String(config['high_value_threshold'] ?? 100)}
                className="w-full pl-7 pr-3 py-2 rounded text-sm"
                style={inputStyle}
              />
            </div>
            <button
              onClick={() => setConfigMutation.mutate({ key: 'high_value_threshold', value: threshold })}
              disabled={setConfigMutation.isPending}
              className="btn-fantasy text-sm px-4"
            >
              {setConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              Save
            </button>
          </div>
          {config['high_value_threshold'] && (
            <p className="text-xs text-muted-foreground mt-2">
              Current threshold: <span style={{ color: "var(--gold)" }}>${config['high_value_threshold']}</span>
            </p>
          )}
        </div>

        {/* Grant credits */}
        <div className="fantasy-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5" style={{ color: "var(--gold)" }} />
            <h3 className="font-heading text-base font-semibold text-foreground">Grant Credits to User</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider block mb-1">User ID</label>
              <input type="number" value={grantUserId} onChange={e => setGrantUserId(e.target.value)} placeholder="Enter user ID" className="w-full px-3 py-2 rounded text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider block mb-1">Credits Amount</label>
              <input type="number" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} min="1" className="w-full px-3 py-2 rounded text-sm" style={inputStyle} />
            </div>
            <button
              onClick={() => grantMutation.mutate({ userId: parseInt(grantUserId), amount: parseInt(grantAmount) })}
              disabled={!grantUserId || grantMutation.isPending}
              className="btn-fantasy text-sm w-full"
            >
              {grantMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Grant Credits
            </button>
          </div>
        </div>

        {/* Recent high-value scans */}
        <div className="fantasy-card p-5 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: "var(--gold)" }} />
            <h3 className="font-heading text-base font-semibold text-foreground">Recent High-Value Scans</h3>
          </div>
          {!highValueScans?.length ? (
            <p className="text-sm text-muted-foreground">No high-value scans yet.</p>
          ) : (
            <div className="space-y-2">
              {highValueScans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "oklch(0.18 0.03 50)" }}>
                  <div>
                    <span className="font-heading text-sm font-semibold text-foreground">Scan #{scan.id}</span>
                    <span className="text-xs text-muted-foreground ml-2">User #{scan.userId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {scan.estimatedValue && <span className="font-heading text-sm font-bold" style={{ color: "var(--gold)" }}>${parseFloat(scan.estimatedValue).toFixed(2)}</span>}
                    <span className="text-xs text-muted-foreground">{new Date(scan.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
