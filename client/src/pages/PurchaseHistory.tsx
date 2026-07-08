import { trpc } from "@/lib/trpc";
import { CheckCircle, Loader2, Package, XCircle, Zap } from "lucide-react";

const STATUS_CONFIG = {
  completed: { label: "Completed", icon: CheckCircle, color: "oklch(0.60 0.20 160)" },
  pending: { label: "Pending", icon: Loader2, color: "oklch(0.65 0.18 200)" },
  failed: { label: "Failed", icon: XCircle, color: "oklch(0.55 0.22 25)" },
  refunded: { label: "Refunded", icon: XCircle, color: "oklch(0.55 0.10 55)" },
};

export default function PurchaseHistory() {
  const { data: purchases, isLoading } = trpc.credits.history.useQuery();

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">Purchase History</h1>
        <p className="text-muted-foreground text-sm">All your credit pack purchases and subscription payments.</p>
      </div>

      {!purchases?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-16 h-16 mb-4" style={{ color: "var(--gold)", opacity: 0.3 }} />
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">No purchases yet</h3>
          <p className="text-muted-foreground text-sm">Your purchase history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
              {purchases.map((p: { id: number; description: string | null; amount: number; type: string; createdAt: Date }) => {
            return (
              <div key={p.id} className="fantasy-card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.22 0.06 55 / 0.3)", border: "1px solid oklch(0.45 0.10 60 / 0.3)" }}>
                    <Zap className="w-5 h-5" style={{ color: "var(--gold)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading text-sm font-semibold text-foreground truncate">{p.description}</h3>
                      <span className="text-xs font-heading flex-shrink-0" style={{ color: p.amount > 0 ? "oklch(0.60 0.20 160)" : "oklch(0.55 0.22 25)" }}>
                        {p.amount > 0 ? "Credit" : "Debit"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="font-heading text-base font-bold" style={{ color: p.amount > 0 ? "var(--gold)" : "oklch(0.55 0.22 25)" }}>
                        {p.amount > 0 ? `+${p.amount}` : p.amount} credits
                      </span>
                      <span className="text-xs text-muted-foreground">{p.type}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
