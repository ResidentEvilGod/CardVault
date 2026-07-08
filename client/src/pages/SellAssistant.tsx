import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  CheckCircle,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
  Tag,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function SellAssistant() {
  const [selectedBinder, setSelectedBinder] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | undefined>(undefined);
  const [generatedListing, setGeneratedListing] = useState<{
    title: string;
    description: string;
    ebaySearchUrl: string;
  } | null>(null);

  const { data: binderData, isLoading: binderLoading } = trpc.binder.list.useQuery();
  const { data: templates } = trpc.templates.list.useQuery();

  const generateMutation = trpc.sell.generateListing.useMutation({
    onSuccess: (data) => {
      setGeneratedListing(data);
      toast.success("Listing generated!");
    },
    onError: (err) => toast.error(err.message || "Failed to generate listing"),
  });

  const handleGenerate = () => {
    if (!selectedBinder) return;
    generateMutation.mutate({
      binderCardId: selectedBinder,
      templateId: selectedTemplate,
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">Sell Assistant</h1>
        <p className="text-muted-foreground">Generate eye-catching eBay listings with AI-crafted titles and descriptions.</p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Select card */}
        <div className="fantasy-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-heading text-sm font-bold"
              style={{ background: "oklch(0.72 0.18 55 / 0.2)", color: "var(--gold)", border: "1px solid oklch(0.72 0.18 55 / 0.4)" }}>
              1
            </div>
            <h3 className="font-heading text-base font-semibold text-foreground">Select a Card from Your Binder</h3>
          </div>

          {binderLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading binder...</span>
            </div>
          ) : !binderData?.length ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground text-sm mb-3">No cards in your binder yet.</p>
              <Link href="/scan">
                <button className="btn-fantasy text-sm">
                  <Wand2 className="w-4 h-4" />
                  Scan a Card First
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {binderData.map(({ binder, card }) => (
                <button
                  key={binder.id}
                  onClick={() => setSelectedBinder(binder.id)}
                  className="flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                  style={{
                    background: selectedBinder === binder.id ? "oklch(0.22 0.06 55 / 0.5)" : "oklch(0.18 0.03 50)",
                    border: `1px solid ${selectedBinder === binder.id ? "oklch(0.72 0.18 55 / 0.6)" : "oklch(0.30 0.05 55 / 0.4)"}`,
                  }}
                >
                  {card.officialImageUrl && (
                    <img src={card.officialImageUrl} alt={card.cardName} className="w-10 h-14 object-cover rounded flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-heading text-xs font-semibold text-foreground truncate">{card.cardName}</div>
                    <div className="text-xs text-muted-foreground truncate">{card.setName ?? card.tcg.toUpperCase()}</div>
                    {binder.isGraded && (
                      <div className="text-xs" style={{ color: "var(--arcane-light)" }}>
                        {binder.gradingCompany} {binder.gradeLevel}
                      </div>
                    )}
                    {card.priceNm && (
                      <div className="text-xs font-heading font-bold" style={{ color: "var(--gold)" }}>
                        ${parseFloat(card.priceNm).toFixed(2)}
                      </div>
                    )}
                  </div>
                  {selectedBinder === binder.id && (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--gold)" }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Template */}
        {templates && templates.length > 0 && (
          <div className="fantasy-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-heading text-sm font-bold"
                style={{ background: "oklch(0.72 0.18 55 / 0.2)", color: "var(--gold)", border: "1px solid oklch(0.72 0.18 55 / 0.4)" }}>
                2
              </div>
              <h3 className="font-heading text-base font-semibold text-foreground">Choose a Listing Template (Optional)</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTemplate(undefined)}
                className="px-3 py-1.5 rounded text-xs font-heading transition-all"
                style={{
                  background: !selectedTemplate ? "oklch(0.22 0.06 55 / 0.5)" : "oklch(0.18 0.03 50)",
                  border: `1px solid ${!selectedTemplate ? "oklch(0.72 0.18 55 / 0.6)" : "oklch(0.30 0.05 55 / 0.4)"}`,
                  color: !selectedTemplate ? "var(--gold)" : "oklch(0.65 0.05 55)",
                }}
              >
                No Template
              </button>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className="px-3 py-1.5 rounded text-xs font-heading transition-all"
                  style={{
                    background: selectedTemplate === t.id ? "oklch(0.22 0.06 55 / 0.5)" : "oklch(0.18 0.03 50)",
                    border: `1px solid ${selectedTemplate === t.id ? "oklch(0.72 0.18 55 / 0.6)" : "oklch(0.30 0.05 55 / 0.4)"}`,
                    color: selectedTemplate === t.id ? "var(--gold)" : "oklch(0.65 0.05 55)",
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!selectedBinder || generateMutation.isPending}
          className="btn-fantasy w-full text-base py-3"
          style={{ opacity: !selectedBinder ? 0.5 : 1 }}
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Crafting your listing...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate eBay Listing
            </>
          )}
        </button>

        {/* Generated listing */}
        {generatedListing && (
          <div className="fantasy-card p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5" style={{ color: "oklch(0.60 0.20 160)" }} />
              <h3 className="font-heading text-base font-semibold" style={{ color: "oklch(0.70 0.18 160)" }}>
                Listing Generated!
              </h3>
            </div>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider">eBay Title</label>
                <button
                  onClick={() => copyToClipboard(generatedListing.title, "Title")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
              <div className="p-3 rounded-lg font-heading text-sm text-foreground"
                style={{ background: "oklch(0.18 0.03 50)", border: "1px solid oklch(0.30 0.05 55 / 0.4)" }}>
                {generatedListing.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{generatedListing.title.length}/80 characters</div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider">Description</label>
                <button
                  onClick={() => copyToClipboard(generatedListing.description, "Description")}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
              <div className="p-3 rounded-lg text-sm text-muted-foreground max-h-48 overflow-y-auto"
                style={{ background: "oklch(0.18 0.03 50)", border: "1px solid oklch(0.30 0.05 55 / 0.4)" }}
                dangerouslySetInnerHTML={{ __html: generatedListing.description }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <a href={generatedListing.ebaySearchUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <button className="btn-fantasy w-full text-sm">
                  <Tag className="w-4 h-4" />
                  View on eBay
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </a>
              <Link href="/sales-activity" className="flex-1">
                <button className="btn-arcane w-full text-sm">
                  <BookOpen className="w-4 h-4" />
                  View Sales
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
