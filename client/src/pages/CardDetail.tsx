import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Tag,
} from "lucide-react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";

const CONDITION_LABELS: Record<string, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};

export default function CardDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const cardId = parseInt(id ?? "0");

  const { data: card, isLoading, refetch } = trpc.cards.getById.useQuery({ id: cardId }, { enabled: !!cardId });

  const refreshMutation = trpc.cards.refreshPrices.useMutation({
    onSuccess: () => {
      toast.success("Prices refreshed!");
      refetch();
    },
    onError: () => toast.error("Failed to refresh prices"),
  });

  const addToBinderMutation = trpc.binder.add.useMutation({
    onSuccess: () => toast.success("Added to your binder!"),
    onError: () => toast.error("Failed to add to binder"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--gold)" }} />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Card not found.</p>
      </div>
    );
  }

  const gradedPrices = card.gradedPrices as Record<string, Record<string, number>> | null;

  const ebayUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${card.cardName} ${card.setName ?? ""}`)}`;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-1">{card.cardName}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`rune-badge badge-${card.tcg} text-xs`}>{card.tcg.toUpperCase()}</span>
          {card.setName && <span className="text-sm text-muted-foreground">{card.setName}</span>}
          {card.cardNumber && <span className="text-sm text-muted-foreground">#{card.cardNumber}</span>}
          {card.rarity && <span className="rune-badge text-xs">{card.rarity}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Card image */}
        <div className="md:col-span-2">
          <div className="fantasy-card p-4 flex items-center justify-center">
            {card.officialImageUrl || card.uploadedImageUrl ? (
              <img
                src={card.officialImageUrl ?? card.uploadedImageUrl ?? ""}
                alt={card.cardName}
                className="w-full max-w-[220px] rounded-lg"
                style={{ boxShadow: "0 8px 32px oklch(0 0 0 / 0.5)" }}
              />
            ) : (
              <div className="w-full aspect-[2.5/3.5] rounded-lg flex items-center justify-center"
                style={{ background: "oklch(0.18 0.04 55 / 0.3)" }}>
                <Sparkles className="w-12 h-12" style={{ color: "var(--gold)", opacity: 0.3 }} />
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-3 space-y-4">
          {/* Raw prices */}
          <div className="fantasy-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">Raw Card Prices</h3>
              <button
                onClick={() => refreshMutation.mutate({ cardId: card.id })}
                disabled={refreshMutation.isPending}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries({
                NM: card.priceNm,
                LP: card.priceLp,
                MP: card.priceMp,
                HP: card.priceHp,
                DMG: card.priceDmg,
              }).map(([cond, price]) => price && (
                <div key={cond} className="p-3 rounded-lg" style={{ background: "oklch(0.18 0.03 50)" }}>
                  <div className="text-xs text-muted-foreground font-heading uppercase tracking-wider mb-1">
                    {CONDITION_LABELS[cond]}
                  </div>
                  <div className="font-heading font-bold" style={{ color: "var(--gold)" }}>
                    ${parseFloat(price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            {card.pricesUpdatedAt && (
              <p className="text-xs text-muted-foreground mt-3">
                Updated {new Date(card.pricesUpdatedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Graded prices */}
          {gradedPrices && Object.keys(gradedPrices).length > 0 && (
            <div className="fantasy-card p-5">
              <h3 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Graded Card Prices</h3>
              {Object.entries(gradedPrices).map(([company, grades]) => (
                <div key={company} className="mb-4 last:mb-0">
                  <div className="text-xs font-heading font-semibold mb-2" style={{ color: "var(--arcane-light)" }}>{company}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(grades).sort(([a], [b]) => parseFloat(b) - parseFloat(a)).map(([grade, price]) => {
                      const gradeNum = parseFloat(grade);
                      const gradeClass = gradeNum >= 10 ? "grade-10" : gradeNum >= 9 ? "grade-9" : gradeNum >= 8 ? "grade-8" : "grade-lower";
                      return (
                        <div key={grade} className={`p-2 rounded border text-center ${gradeClass}`}
                          style={{ background: "oklch(0.16 0.03 50)" }}>
                          <div className="text-xs font-heading font-bold">{grade}</div>
                          <div className="text-xs font-semibold">${price.toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => addToBinderMutation.mutate({ cardId: card.id })}
              disabled={addToBinderMutation.isPending}
              className="btn-fantasy text-sm"
            >
              {addToBinderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
              Add to Binder
            </button>
            <a href={ebayUrl} target="_blank" rel="noopener noreferrer">
              <button className="btn-arcane w-full text-sm">
                <Tag className="w-4 h-4" />
                Search eBay
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
