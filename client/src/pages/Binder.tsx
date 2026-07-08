import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const CONDITION_LABELS: Record<string, string> = {
  NM: "NM", LP: "LP", MP: "MP", HP: "HP", DMG: "DMG",
};

const TCG_COLORS: Record<string, string> = {
  pokemon: "oklch(0.65 0.20 50)",
  mtg: "oklch(0.55 0.22 280)",
  lorcana: "oklch(0.55 0.20 200)",
  yugioh: "oklch(0.55 0.18 160)",
  other: "oklch(0.40 0.08 55)",
};

export default function Binder() {
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();

  const { data: binderData, isLoading } = trpc.binder.list.useQuery();

  const removeMutation = trpc.binder.remove.useMutation({
    onSuccess: () => {
      toast.success("Removed from binder");
      utils.binder.list.invalidate();
    },
    onError: () => toast.error("Failed to remove card"),
  });

  const filtered = (binderData ?? []).filter(({ card }) =>
    card.cardName.toLowerCase().includes(search.toLowerCase()) ||
    (card.setName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    card.tcg.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = (binderData ?? []).reduce((sum, { binder }) => {
    return sum + parseFloat(binder.currentValue ?? "0");
  }, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gold)" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-gradient-gold mb-1">My Binder</h1>
          <p className="text-muted-foreground text-sm">Your card collection with live market values</p>
        </div>
        <div className="fantasy-card p-4 text-center">
          <div className="text-xs text-muted-foreground font-heading uppercase tracking-wider mb-1">
            <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
            Portfolio Value
          </div>
          <div className="price-display">${totalValue.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground mt-1">{binderData?.length ?? 0} cards</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search your binder..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1"
          style={{
            background: "oklch(0.18 0.03 50)",
            border: "1px solid oklch(0.35 0.06 55)",

          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ background: "oklch(0.18 0.04 55 / 0.3)" }}>
            <BookOpen className="w-10 h-10" style={{ color: "var(--gold)", opacity: 0.5 }} />
          </div>
          <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
            {search ? "No cards found" : "Your binder is empty"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            {search ? "Try a different search term." : "Scan your first card to start building your collection."}
          </p>
          {!search && (
            <Link href="/scan">
              <button className="btn-fantasy text-sm">
                <Wand2 className="w-4 h-4" />
                Scan Your First Card
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ binder, card }) => {
            const accentColor = TCG_COLORS[card.tcg] ?? TCG_COLORS.other;
            return (
              <div key={binder.id} className="fantasy-card card-hover overflow-hidden">
                {/* Color accent bar */}
                <div className="h-1" style={{ background: accentColor }} />

                <div className="p-4">
                  <div className="flex gap-3">
                    {card.officialImageUrl && (
                      <img
                        src={card.officialImageUrl}
                        alt={card.cardName}
                        className="w-16 h-22 object-cover rounded flex-shrink-0"
                        style={{ boxShadow: "0 2px 8px oklch(0 0 0 / 0.4)" }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5 flex-wrap mb-1">
                        <span className="text-xs font-heading uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}>
                          {card.tcg}
                        </span>
                        {binder.isGraded && (
                          <span className="text-xs font-heading uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: "oklch(0.55 0.25 290 / 0.2)", color: "var(--arcane-light)", border: "1px solid oklch(0.55 0.25 290 / 0.4)" }}>
                            {binder.gradingCompany} {binder.gradeLevel}
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading text-sm font-semibold text-foreground leading-tight mb-0.5 truncate">
                        {card.cardName}
                      </h3>
                      {card.setName && (
                        <p className="text-xs text-muted-foreground truncate mb-2">{card.setName}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-muted-foreground font-heading uppercase tracking-wider">
                            {binder.isGraded ? "Graded" : CONDITION_LABELS[binder.condition]}
                          </div>
                          <div className="font-heading font-bold text-base" style={{ color: "var(--gold)" }}>
                            {binder.currentValue ? `$${parseFloat(binder.currentValue).toFixed(2)}` : "—"}
                          </div>
                        </div>
                        {binder.quantity > 1 && (
                          <span className="text-xs text-muted-foreground">×{binder.quantity}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: "oklch(0.25 0.04 55 / 0.5)" }}>
                    <Link href={`/card/${card.id}`} className="flex-1">
                      <button className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded transition-all hover:opacity-80"
                        style={{ background: "oklch(0.20 0.04 55 / 0.5)", color: "var(--gold)", border: "1px solid oklch(0.45 0.10 60 / 0.4)" }}>
                        <Sparkles className="w-3 h-3" />
                        Details
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </Link>
                    <Link href="/sell-assistant" className="flex-1">
                      <button className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded transition-all hover:opacity-80"
                        style={{ background: "oklch(0.18 0.04 55 / 0.3)", color: "oklch(0.65 0.05 55)", border: "1px solid oklch(0.35 0.06 55 / 0.4)" }}>
                        <Tag className="w-3 h-3" />
                        Sell
                      </button>
                    </Link>
                    <button
                      onClick={() => removeMutation.mutate({ id: binder.id })}
                      disabled={removeMutation.isPending}
                      className="flex items-center justify-center p-1.5 rounded transition-all hover:opacity-80"
                      style={{ background: "oklch(0.18 0.04 25 / 0.3)", color: "oklch(0.55 0.22 25)", border: "1px solid oklch(0.45 0.12 25 / 0.3)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
