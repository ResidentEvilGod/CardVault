import { trpc } from "@/lib/trpc";
import {
  Archive,
  CheckCircle,
  ExternalLink,
  Loader2,
  Package,
  ShoppingBag,
  Tag,
  Trash2,
  Wand2,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "oklch(0.65 0.08 55)", bg: "oklch(0.20 0.04 55 / 0.3)" },
  listed: { label: "Listed", color: "oklch(0.65 0.18 200)", bg: "oklch(0.18 0.06 200 / 0.3)" },
  sold: { label: "Sold", color: "oklch(0.60 0.20 160)", bg: "oklch(0.18 0.06 160 / 0.3)" },
  archived: { label: "Archived", color: "oklch(0.50 0.05 55)", bg: "oklch(0.18 0.02 50 / 0.3)" },
};

export default function SalesActivity() {
  const utils = trpc.useUtils();
  const { data: sales, isLoading } = trpc.sell.list.useQuery();

  const updateStatusMutation = trpc.sell.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); utils.sell.list.invalidate(); },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = trpc.sell.delete.useMutation({
    onSuccess: () => { toast.success("Listing removed"); utils.sell.list.invalidate(); },
    onError: () => toast.error("Failed to delete"),
  });

  const totalListed = (sales ?? []).filter(s => s.sale.status === "listed").length;
  const totalSold = (sales ?? []).filter(s => s.sale.status === "sold").length;
  const totalSoldValue = (sales ?? []).filter(s => s.sale.status === "sold").reduce((sum, s) => sum + parseFloat(s.sale.soldPrice ?? s.sale.askingPrice ?? "0"), 0);

  if (isLoading) return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gold)" }} /></div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">Sales Activity</h1>
        <p className="text-muted-foreground text-sm">Track your cards prepared for sale and their current status.</p>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Active Listings", value: totalListed, icon: Tag, color: "oklch(0.65 0.18 200)" },
          { label: "Cards Sold", value: totalSold, icon: CheckCircle, color: "oklch(0.60 0.20 160)" },
          { label: "Total Earned", value: `$${totalSoldValue.toFixed(2)}`, icon: Package, color: "var(--gold)" },
        ].map((stat) => { const Icon = stat.icon; return (
          <div key={stat.label} className="fantasy-card p-4 text-center">
            <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
            <div className="font-heading text-xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-muted-foreground font-heading uppercase tracking-wider mt-1">{stat.label}</div>
          </div>
        ); })}
      </div>
      {!sales?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="w-16 h-16 mb-4" style={{ color: "var(--gold)", opacity: 0.3 }} />
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">No listings yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Use the Sell Assistant to generate your first eBay listing.</p>
          <Link href="/sell-assistant"><button className="btn-fantasy text-sm"><Wand2 className="w-4 h-4" />Go to Sell Assistant</button></Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map(({ sale, card }) => {
            const statusCfg = STATUS_CONFIG[sale.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;
            return (
              <div key={sale.id} className="fantasy-card p-4">
                <div className="flex items-start gap-4">
                  {card.officialImageUrl && <img src={card.officialImageUrl} alt={card.cardName} className="w-12 h-16 object-cover rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <h3 className="font-heading text-sm font-semibold text-foreground">{card.cardName}</h3>
                        {sale.listingTitle && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sale.listingTitle}</p>}
                      </div>
                      <span className="text-xs font-heading px-2 py-0.5 rounded flex-shrink-0" style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}40` }}>{statusCfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {sale.askingPrice && <span className="font-heading text-sm font-bold" style={{ color: "var(--gold)" }}>${parseFloat(sale.askingPrice).toFixed(2)}</span>}
                      <div className="flex items-center gap-2 ml-auto">
                        {sale.status === "draft" && <button onClick={() => updateStatusMutation.mutate({ id: sale.id, status: "listed" })} className="text-xs px-2 py-1 rounded" style={{ background: "oklch(0.18 0.06 200 / 0.3)", color: "oklch(0.65 0.18 200)", border: "1px solid oklch(0.65 0.18 200 / 0.4)" }}>Mark Listed</button>}
                        {sale.status === "listed" && <button onClick={() => updateStatusMutation.mutate({ id: sale.id, status: "sold" })} className="text-xs px-2 py-1 rounded" style={{ background: "oklch(0.18 0.06 160 / 0.3)", color: "oklch(0.60 0.20 160)", border: "1px solid oklch(0.60 0.20 160 / 0.4)" }}>Mark Sold</button>}
                        {sale.ebaySearchUrl && <a href={sale.ebaySearchUrl} target="_blank" rel="noopener noreferrer"><button className="text-xs px-2 py-1 rounded flex items-center gap-1" style={{ background: "oklch(0.18 0.04 55 / 0.3)", color: "oklch(0.65 0.05 55)", border: "1px solid oklch(0.35 0.06 55 / 0.4)" }}><ExternalLink className="w-3 h-3" />eBay</button></a>}
                        <button onClick={() => deleteMutation.mutate({ id: sale.id })} className="p-1 rounded" style={{ background: "oklch(0.18 0.04 25 / 0.3)", color: "oklch(0.55 0.22 25)" }}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
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
