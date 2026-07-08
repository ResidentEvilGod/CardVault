import { BookOpen, Camera, ChevronDown, ChevronUp, DollarSign, Package, ShoppingCart, Star, Zap } from "lucide-react";
import { useState } from "react";

const SECTIONS = [
  {
    icon: Camera,
    title: "Getting the Best Scan Results",
    color: "var(--gold)",
    items: [
      { q: "How do I get the most accurate card identification?", a: "Place your card on a flat, non-reflective surface with good lighting. Avoid shadows across the card face. Make sure the entire card is visible in the frame, including all four corners. Natural daylight or a bright lamp works best." },
      { q: "What card types are supported?", a: "CardVault supports Magic: The Gathering, Pokémon, and other major TCGs. Our AI recognizes card names, set symbols, collector numbers, and artwork to identify cards accurately." },
      { q: "Why did my scan fail or return low confidence?", a: "Low confidence usually means the image was blurry, had poor lighting, or the card was partially obscured. Try retaking the photo with better lighting and ensure the card fills most of the frame." },
      { q: "Can I scan graded cards?", a: "Yes! You can scan graded cards in their slabs. The AI will identify the card and we'll display graded prices by grade level (PSA 10, PSA 9, BGS 9.5, etc.) alongside raw card values." },
    ],
  },
  {
    icon: DollarSign,
    title: "Understanding Card Values",
    color: "oklch(0.60 0.20 160)",
    items: [
      { q: "Where do the prices come from?", a: "Prices are sourced from the Scrydex API and Scryfall API, which aggregate real market data from recent sales and listings. Prices reflect current market conditions." },
      { q: "How often are prices updated?", a: "Prices for cards in your binder are refreshed nightly via an automated job. When you scan a new card, you get the latest price at the moment of the scan." },
      { q: "What do NM, LP, MP, HP, DMG mean?", a: "These are card condition grades: NM (Near Mint), LP (Lightly Played), MP (Moderately Played), HP (Heavily Played), and DMG (Damaged). NM represents the highest value; each lower grade typically reduces value by 10–30%." },
      { q: "What are graded card prices?", a: "Graded cards have been professionally evaluated by companies like PSA, BGS, or CGC and sealed in a protective case. A PSA 10 (Gem Mint) can be worth 5–10x the raw NM price for popular cards." },
    ],
  },
  {
    icon: Package,
    title: "Using Your Binder",
    color: "oklch(0.65 0.18 200)",
    items: [
      { q: "How do I add a card to my binder?", a: "After scanning a card and viewing its details, click the 'Add to Binder' button. You can set the condition, quantity, and whether it's a graded copy." },
      { q: "How does daily price updating work?", a: "Every night, CardVault automatically refreshes the market price for every card saved in your binder. You'll always see up-to-date values without needing to re-scan." },
      { q: "Can I track multiple copies of the same card?", a: "Yes! You can add multiple entries for the same card with different conditions or quantities. Each entry is tracked independently." },
    ],
  },
  {
    icon: ShoppingCart,
    title: "Writing Better eBay Listings",
    color: "oklch(0.65 0.22 280)",
    items: [
      { q: "How does the listing generator work?", a: "Select a card from your binder and open the Sell Assistant. CardVault's AI generates an eye-catching title and detailed description optimized for eBay search visibility, including condition, set, and key attributes." },
      { q: "Can I customize the generated listing?", a: "Absolutely. The generated title and description are fully editable. You can also save listing templates with your preferred shipping details and boilerplate text to speed up future listings." },
      { q: "How do I link to eBay?", a: "After generating your listing, click 'Search eBay' to see comparable listings, or use the 'Create eBay Listing' button to open eBay's sell form pre-populated with your card details." },
    ],
  },
  {
    icon: Zap,
    title: "Credits & Subscriptions",
    color: "oklch(0.72 0.18 55)",
    items: [
      { q: "How many free scans do I get?", a: "New accounts receive 5 free scan credits to get started. Each card scan costs 1 credit." },
      { q: "What's the difference between credit packs and subscriptions?", a: "Credit packs are one-time purchases that never expire. Subscriptions give you unlimited scans for a monthly or annual fee — ideal for active collectors who scan frequently." },
      { q: "Do unused credits expire?", a: "No! Credit pack credits never expire. They'll be there whenever you need them." },
    ],
  },
];

export default function HelpCenter() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <BookOpen className="w-8 h-8" style={{ color: "var(--gold)" }} />
          <h1 className="font-display text-3xl font-bold text-gradient-gold">Help Center</h1>
        </div>
        <p className="text-muted-foreground text-sm">Everything you need to know about using CardVault.</p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="fantasy-card overflow-hidden">
              <div className="flex items-center gap-3 p-5 border-b" style={{ borderColor: "oklch(0.30 0.05 55 / 0.3)" }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${section.color}20`, border: `1px solid ${section.color}40` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: section.color }} />
                </div>
                <h2 className="font-heading text-base font-semibold text-foreground">{section.title}</h2>
              </div>
              <div className="divide-y" style={{ borderColor: "oklch(0.25 0.04 55 / 0.3)" }}>
                {section.items.map((item, idx) => {
                  const key = `${section.title}-${idx}`;
                  const isOpen = openItems[key];
                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggle(key)}
                        className="w-full flex items-center justify-between p-4 text-left transition-all hover:opacity-80"
                      >
                        <span className="font-heading text-sm font-semibold text-foreground pr-4">{item.q}</span>
                        {isOpen
                          ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                        }
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-5 rounded-xl text-center"
        style={{ background: "oklch(0.16 0.04 55 / 0.4)", border: "1px solid oklch(0.35 0.08 55 / 0.3)" }}>
        <Star className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--gold)" }} />
        <h3 className="font-heading text-base font-semibold text-foreground mb-1">Still need help?</h3>
        <p className="text-sm text-muted-foreground">
          Can't find what you're looking for? Reach out to us and we'll be happy to assist.
        </p>
      </div>
    </div>
  );
}
