import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import {
  BookOpen,
  ChevronRight,
  Shield,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Wand2,
  Zap,
} from "lucide-react";
import { Link } from "wouter";

const FEATURES = [
  {
    icon: Wand2,
    title: "AI Card Identification",
    desc: "Upload a photo and our arcane vision instantly identifies your card — Magic, Pokémon, Lorcana, and more.",
    color: "var(--arcane-light)",
  },
  {
    icon: TrendingUp,
    title: "Live Market Prices",
    desc: "Real-time valuations from Scrydex and Scryfall. Raw cards, graded slabs (PSA, BGS, CGC) — all covered.",
    color: "var(--gold)",
  },
  {
    icon: BookOpen,
    title: "Digital Binder",
    desc: "Organize your collection with daily price updates. Your portfolio value, always current.",
    color: "oklch(0.60 0.20 160)",
  },
  {
    icon: Tag,
    title: "eBay Listing Generator",
    desc: "AI-crafted titles and descriptions optimized for search. Link directly to eBay with one click.",
    color: "oklch(0.65 0.18 200)",
  },
  {
    icon: Shield,
    title: "Graded Card Support",
    desc: "PSA, BGS, CGC — view graded prices by grade level and grading company alongside raw values.",
    color: "oklch(0.65 0.20 0)",
  },
  {
    icon: Zap,
    title: "Flexible Credits",
    desc: "Free tier to start. Buy scan packs or subscribe for unlimited access. Pay only for what you use.",
    color: "oklch(0.72 0.18 55)",
  },
];

const TCG_BADGES = ["Magic: The Gathering", "Pokémon", "Lorcana", "Yu-Gi-Oh!", "One Piece", "More..."];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ── Top Nav ── */}
      <nav className="sticky top-0 z-50 border-b" style={{
        background: "oklch(0.12 0.02 50 / 0.95)",
        borderColor: "oklch(0.28 0.06 55 / 0.5)",
        backdropFilter: "blur(12px)",
      }}>
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.18 55), oklch(0.55 0.25 290))" }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gradient-gold">CardVault</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/help-center">
              <span className="font-heading text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Help</span>
            </Link>
            {isAuthenticated ? (
              <Link href="/scan">
                <button className="btn-fantasy text-sm">
                  <Wand2 className="w-4 h-4" />
                  Open App
                </button>
              </Link>
            ) : (
              <button onClick={() => startLogin()} className="btn-fantasy text-sm">
                <Star className="w-4 h-4" />
                Enter the Vault
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 md:py-36">
        {/* Background orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
            style={{ background: "oklch(0.55 0.25 290)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl"
            style={{ background: "oklch(0.72 0.18 55)" }} />
        </div>

        <div className="container relative text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rune-badge mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Card Valuation</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            <span className="text-gradient-gold">Unlock the True</span>
            <br />
            <span className="text-foreground">Value of Your Cards</span>
          </h1>

          <p className="font-body text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Snap a photo. Get instant AI identification and live market prices for Magic, Pokémon, and more.
            Build your binder, track your portfolio, and sell with confidence.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            {isAuthenticated ? (
              <Link href="/scan">
                <button className="btn-fantasy text-base px-8 py-3">
                  <Wand2 className="w-5 h-5" />
                  Scan Your First Card
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            ) : (
              <button onClick={() => startLogin()} className="btn-fantasy text-base px-8 py-3">
                <Star className="w-5 h-5" />
                Start Free — 5 Scans
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <Link href="/help-center">
              <button className="btn-arcane text-base px-8 py-3">
                <BookOpen className="w-5 h-5" />
                See How It Works
              </button>
            </Link>
          </div>

          {/* TCG badges */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {TCG_BADGES.map((tcg) => (
              <span key={tcg} className="rune-badge text-xs">{tcg}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(180deg, transparent, oklch(0.14 0.025 50 / 0.5), transparent)" }} />
        <div className="container relative">
          <div className="text-center mb-14">
            <div className="ornate-divider">
              <span className="font-heading text-sm text-muted-foreground tracking-widest uppercase">The Arcane Arts</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gradient-gold mt-4">
              Everything a Collector Needs
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="fantasy-card card-hover p-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${f.color}20`, border: `1px solid ${f.color}40` }}>
                    <Icon className="w-6 h-6" style={{ color: f.color }} />
                  </div>
                  <h3 className="font-heading text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="ornate-divider">
              <span className="font-heading text-sm text-muted-foreground tracking-widest uppercase">Pricing</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gradient-gold mt-4">
              Simple, Transparent Pricing
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { name: "Free", price: "$0", desc: "5 free scans to start", features: ["5 card scans", "Basic identification", "Price lookup", "Binder storage"], cta: "Start Free", highlight: false },
              { name: "Archmage", price: "$9.99/mo", desc: "Unlimited scanning power", features: ["Unlimited scans", "Priority AI processing", "Daily price updates", "eBay listing generator", "Graded card prices"], cta: "Go Unlimited", highlight: true },
              { name: "Vault Pack", price: "$9.99", desc: "100 scan credits, no expiry", features: ["100 scan credits", "No subscription needed", "All premium features", "Never expires"], cta: "Buy Credits", highlight: false },
            ].map((plan) => (
              <div key={plan.name} className={`fantasy-card p-6 relative ${plan.highlight ? "glow-gold" : ""}`}
                style={plan.highlight ? { borderColor: "oklch(0.78 0.16 75 / 0.6)" } : {}}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rune-badge text-xs">
                    <Star className="w-3 h-3" /> Most Popular
                  </div>
                )}
                <div className="font-heading text-lg font-bold text-foreground mb-1">{plan.name}</div>
                <div className="price-display mb-1">{plan.price}</div>
                <div className="text-xs text-muted-foreground mb-4">{plan.desc}</div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--gold)" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                {isAuthenticated ? (
                  <Link href="/credits">
                    <button className={`w-full ${plan.highlight ? "btn-fantasy" : "btn-arcane"} text-sm`}>
                      {plan.cta}
                    </button>
                  </Link>
                ) : (
                  <button onClick={() => startLogin()} className={`w-full ${plan.highlight ? "btn-fantasy" : "btn-arcane"} text-sm`}>
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-8" style={{ borderColor: "oklch(0.28 0.06 55 / 0.4)" }}>
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "var(--gold)" }} />
            <span className="font-display text-sm text-gradient-gold">CardVault</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/help-center"><span className="hover:text-foreground transition-colors cursor-pointer">Help</span></Link>
            <Link href="/credits"><span className="hover:text-foreground transition-colors cursor-pointer">Pricing</span></Link>
          </div>
          <div className="text-xs text-muted-foreground">
            © 2024 CardVault. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
