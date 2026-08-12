# CardVault — AI-Powered Trading Card Valuation Platform

A fantasy-themed mobile app for scanning, identifying, and valuating trading cards (Magic: The Gathering, Pokémon, Lorcana, Yu-Gi-Oh!, One Piece, and more) with real-time pricing, digital binder management, eBay listing generation, and credit-based monetization.

---

## ✅ What's Working

### Core Features

- **AI Card Scanning & Identification** — Upload or photograph any trading card; the Vision LLM instantly identifies it and retrieves live market prices

- **Multi-TCG Support** — Magic: The Gathering, Pokémon, Lorcana, Yu-Gi-Oh!, One Piece, and 50+ other TCGs via Scrydex API

- **Live Market Pricing** — Real-time card valuations for both raw and graded cards (PSA, BGS, CGC) by grade level

- **Graded Card Support** — Display prices for all PSA grades (1–10), BGS, and CGC alongside raw card values

- **Digital Binder** — Save identified cards to a personal collection with portfolio value tracking

- **eBay Listing Generator** — AI-crafted titles and descriptions optimized for eBay search visibility; one-click copy-to-clipboard

### Backend & Database

- **tRPC Full-Stack** — Type-safe end-to-end RPC with automatic TypeScript inference

- **9 Database Tables** — Users, cards, binder cards, scan sessions, credit transactions, listing templates, listing drafts, app config, and price update jobs

- **Query Helpers** — Optimized database functions for all major operations

- **Admin Dashboard** — Live stats (total users, scans, binder cards, high-value scans), configurable alert threshold, manual credit grants

### Monetization & Payments

- **Stripe Integration** — Full checkout flow for one-time credit packs and recurring subscriptions

- **Credit Packs** — Apprentice (25/$2.99), Vault (100/$9.99), Archmage (300/$24.99)

- **Subscriptions** — Archmage Monthly ($9.99/mo), Archmage Annual ($79.99/yr)

- **Webhook Handler** — Automatic account crediting after successful payment (test mode verified)

- **Free Tier** — 5 scan credits on signup; no credit card required

### User Experience

- **Fantasy Dark Theme** — Ornate parchment aesthetic with gold accents, arcane typography (Cinzel Decorative, MedievalSharp)

- **Fully Responsive** — Desktop sidebar (collapsible), mobile hamburger drawer, tested at 390×844px

- **13 Full Pages** — Landing, Scan, Card Detail, Binder, Sell Assistant, Sales Activity, Listing Templates, Credits, Purchase History, Admin, Profile, Settings, Help Center

- **Authentication** — Manus OAuth with session management

### Testing & Quality

- **14 Vitest Tests** — Auth, credits, admin guards, Stripe validation, sell router, templates, binder, profile

- **Zero TypeScript Errors** — Full type safety across frontend and backend

- **Zero Console Errors** — Clean dev server logs

### Scheduled Jobs

- **Nightly Price Update** — Heartbeat cron job registered (task_uid: `euoFCfDfR4AfjJ8NNyg3qg`) to refresh all binder card prices daily at 6am UTC

- **Owner Notifications** — Email alerts when high-value cards (above configurable threshold) are scanned

---

## ⏳ What Still Needs to Be Done

### Pre-Deployment (Owner Actions)

- [ ] **Claim Stripe Sandbox** — Visit the link in project Settings → Payment to activate test environment (required before processing real payments)

- [ ] **Add Scrydex API Key** — Go to `/admin` in the live app after deployment and enter your Scrydex API key (without it, app falls back to Scryfall/LLM only)

- [ ] **Test Stripe Payments** — Use test card `4242 4242 4242 4242` to verify checkout and webhook fulfillment end-to-end

- [ ] **Verify Nightly Cron** — After publishing, confirm the heartbeat job fires at 6am UTC by checking `/api/scheduled/price-update` logs

### Post-Deployment (Optional Enhancements)

- [ ] **Scrydex Vision API Integration** — Currently using Vision LLM + Scrydex search; optionally integrate Scrydex Vision API for image-based card recognition

- [ ] **Advanced Filters** — Add rarity, set, language filters to binder search

- [ ] **Bulk Operations** — Batch add/remove cards from binder

- [ ] **Price History Charts** — Visualize card price trends over time

- [ ] **Marketplace Integrations** — Direct TCGPlayer, CardKingdom, StarCityGames listing links (currently eBay only)

- [ ] **Social Features** — Share binder, compare collections, community forums

- [ ] **Mobile App** — Native iOS/Android via Expo (currently web-only)

- [ ] **Analytics Dashboard** — User acquisition, retention, revenue tracking

- [ ] **Email Notifications** — Alerts for price drops, new listings, subscription renewals

- [ ] **Grading Service Links** — Direct PSA, BGS, CGC submission flows

- [ ] **Inventory Sync** — Automatic sync with eBay/TCGPlayer active listings

- [ ] **Advanced Binder Tools** — Wishlist, trade tracking, condition history

- [ ] **API for Third Parties** — Public REST API for integrations

- [ ] **Dark/Light Theme Toggle** — Currently dark-only; add theme switcher

- [ ] **Internationalization** — Multi-language support (currently English only)

- [ ] **Performance Optimization** — Image lazy-loading, pagination for large binders

- [ ] **Accessibility Audit** — WCAG 2.1 AA compliance review

### Known Limitations

- **Scrydex API Key Required** — Without it, card identification and pricing fall back to Vision LLM + Scryfall (MTG only)

- **Nightly Job Requires Deployment** — Scheduled price updates only work against the live production URL; they won't run in sandbox

- **Stripe Test Mode Only** — Currently configured for Stripe test environment; production keys needed for live payments

- **No Real-Time Updates** — Binder prices update nightly, not in real-time (by design for cost efficiency)

- **Single Admin** — Only the app owner can access `/admin` dashboard

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+

- pnpm 10+

- MySQL/TiDB database

- Stripe test account (for payment testing)

- Manus account (for OAuth and deployment)

### Installation

```bash
# Clone the repository
git clone https://github.com/ResidentEvilGod/CardVault.git
cd CardVault

# Install dependencies
pnpm install

# Set up environment variables
# Create a .env.local file with:
# DATABASE_URL=mysql://user:password@localhost:3306/cardvault
# JWT_SECRET=your-secret-key
# STRIPE_SECRET_KEY=sk_test_...
# VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Run database migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Start dev server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Windows Users

The project now includes `cross-env` for Windows compatibility. Simply run:
```bash
pnpm dev
```

No additional setup needed! The `NODE_ENV` variable will work correctly on Windows, Mac, and Linux.

### Testing Stripe Payments (Sandbox)

1. Sign in at `/credits`
2. Click any "Buy Credits" or "Subscribe Now" button
3. Use test card: `4242 4242 4242 4242` (any future expiry, any CVC)
4. Verify webhook credits your account in real-time

### Running Tests

```bash
pnpm test
```

All 14 tests should pass with zero errors.

### TypeScript Check

```bash
pnpm check
```

Should show zero errors.

---

## 📁 Project Structure

```
CardVault/
├── client/
│   ├── src/
│   │   ├── pages/              # 13 feature pages
│   │   ├── components/         # UI components + AppLayout
│   │   ├── lib/trpc.ts         # tRPC client setup
│   │   ├── index.css           # Fantasy dark theme
│   │   └── App.tsx             # Routes & layout
│   ├── index.html              # Entry point with fonts
│   └── public/                 # Static assets (favicon, etc.)
├── server/
│   ├── routers/                # tRPC routers (cards, binder, credits, stripe, etc.)
│   ├── db.ts                   # Database query helpers
│   ├── priceUpdateHandler.ts   # Nightly price refresh logic
│   ├── stripeWebhookHandler.ts # Stripe webhook handler
│   ├── _core/                  # Framework plumbing (OAuth, context, etc.)
│   └── routers.ts              # Main router aggregator
├── drizzle/
│   ├── schema.ts               # Database schema (9 tables)
│   └── migrations/             # Generated SQL migrations
├── shared/                     # Shared types & constants
├── references/                 # Integration guides (LLM, storage, etc.)
├── package.json                # Dependencies & scripts
└── README.md                   # This file
```

---

## 🎨 Design & Theming

The app uses a **fantasy card shop aesthetic** with:

- **Color Palette** — Dark parchment (#0a0a0a), gold accents (#d4af37), purple highlights (#7c3aed)

- **Typography** — Cinzel Decorative (headings), MedievalSharp (fantasy text), Cinzel (body)

- **Components** — Ornate borders, glowing accents, arcane animations

- **Responsive** — Mobile-first design; tested on 390×844px (iPhone) and 1280×720px (desktop)

---

## 🔌 External APIs & Integrations

| Service | Purpose | Status |
| --- | --- | --- |
| **Scrydex API** | TCG pricing, card search, graded prices | ✅ Ready (key needed) |
| **Scryfall API** | MTG card data, fallback pricing | ✅ Integrated |
| **Vision LLM** | Card image identification | ✅ Integrated |
| **Stripe** | Payment processing, subscriptions | ✅ Test mode ready |
| **Manus OAuth** | User authentication | ✅ Integrated |
| **Manus Notifications** | Owner email alerts | ✅ Integrated |
| **Manus Heartbeat** | Scheduled nightly jobs | ✅ Registered |

---

## 📊 Database Schema

| Table | Purpose |
| --- | --- |
| `users` | User accounts, auth, subscription status |
| `cards` | Card metadata (name, set, price, graded prices) |
| `binderCards` | User's saved cards with condition/notes |
| `scanSessions` | Card scan history & identification results |
| `creditTransactions` | Credit pack purchases & usage |
| `listingTemplates` | Saved eBay listing templates |
| `listingDrafts` | In-progress eBay listings |
| `appConfig` | Admin settings (alert threshold, etc.) |
| `priceUpdateJobs` | Nightly job tracking & status |

---

## 🛠️ Development Workflow

### Adding a New Feature

1. **Update schema** in `drizzle/schema.ts`

1. **Generate migration** — `pnpm drizzle-kit generate`

1. **Apply migration** — Use Manus UI to run SQL

1. **Add query helpers** in `server/db.ts`

1. **Create tRPC router** in `server/routers/feature.ts`

1. **Build frontend** in `client/src/pages/FeatureName.tsx`

1. **Write tests** in `server/feature.test.ts`

1. **Update todo.md** and commit

### Deploying

1. Ensure all tests pass: `pnpm test`

1. Verify zero TypeScript errors: `pnpm check`

1. Create checkpoint in Manus UI

1. Click **Publish** button

1. Complete post-deployment steps (claim Stripe, add API keys, verify cron)

---

## 📝 License

MIT

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository

1. Create a feature branch (`git checkout -b feature/amazing-feature`)

1. Commit your changes (`git commit -m 'Add amazing feature'`)

1. Push to the branch (`git push origin feature/amazing-feature`)

1. Open a Pull Request

---

## 📧 Support

For issues, questions, or feature requests, please open a GitHub issue or contact the team at resmaster19@gmail.com.

---

## 🎯 Roadmap

**Q3 2026**

- [ ] Scrydex Vision API integration

- [ ] Advanced binder filters

- [ ] Price history charts

**Q4 2026**

- [ ] Native mobile app (Expo)

- [ ] Social features (share binder, compare collections)

- [ ] TCGPlayer & CardKingdom integrations

**Q1 2027**

- [ ] Public API for third-party integrations

- [ ] Analytics dashboard

- [ ] Internationalization (multi-language support)


