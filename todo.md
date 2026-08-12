# CardVault - Trading Card Valuator TODO

## Phase 1: Database Schema & Setup
- [x] Design and create DB schema: users (extend), cards, binder_cards, credit_transactions, subscriptions, listing_templates, sale_items, scan_sessions
- [x] Apply all migrations via webdev_execute_sql
- [x] Add Stripe secrets via webdev_request_secrets

## Phase 2: Server-Side (tRPC Routers)
- [x] cards router: scan/identify card via LLM vision + Scrydex Vision API
- [x] cards router: fetch live prices from Scrydex API (raw + graded)
- [x] cards router: fetch MTG prices from Scryfall API fallback
- [x] binder router: add/remove/list cards in binder
- [x] binder router: update card notes and condition
- [x] credits router: get balance, deduct scan credits
- [x] credits router: purchase credit packs (Stripe one-time)
- [x] credits router: subscribe/manage subscription (Stripe recurring)
- [x] stripe router: create checkout session, handle webhooks
- [x] sell router: generate eBay listing title + description via LLM
- [x] sell router: list/track sale items
- [x] listing-templates router: CRUD for saved templates
- [x] admin router: dashboard stats, user list, config (alert threshold)
- [x] admin router: scan activity log
- [x] notifications: owner email alert for high-value card scans

## Phase 3: Nightly Price Update Job
- [x] Heartbeat job: nightly refresh of all binder card prices via Scrydex API
- [x] Register heartbeat in server (task_uid: euoFCfDfR4AfjJ8NNyg3qg, runs 6am UTC daily)

## Phase 4: Fantasy UI Theme & Layout
- [x] Fantasy dark parchment color palette in index.css
- [x] Google Fonts: Cinzel Decorative + MedievalSharp + Cinzel
- [x] Global AppLayout with sidebar (desktop collapsible) + hamburger drawer (mobile)
- [x] Fantasy ornate card component
- [x] Glowing accent animations

## Phase 5: Landing Page & Core Pages
- [x] / Landing page with hero, features, pricing CTA
- [x] /scan - Card scanner page with upload + camera
- [x] /card/:id - Card detail page with prices, graded values, eBay link

## Phase 6: Binder & Sell Pages
- [x] /binder - Digital binder with card grid, filters, total value
- [x] /sell-assistant - eBay listing generator
- [x] /sales-activity - Cards listed for sale, status tracking
- [x] /listing-templates - Saved shipping/description templates

## Phase 7: Credits & Payments
- [x] /credits - Credit balance, packs, subscription plans
- [x] /purchase-history - Transaction history
- [x] Stripe checkout flow (one-time packs + subscription)
- [x] Stripe webhook handler to credit accounts

## Phase 8: Admin & Profile Pages
- [x] /admin - Dashboard with stats, user list, scan log, config
- [x] /user-profile - Notification prefs, marketplace links, subscription status
- [x] /settings - Account details, payment methods
- [x] /help-center - Tutorials and tips

## Phase 9: Tests
- [x] Vitest: auth.logout test
- [x] Vitest: auth.me tests
- [x] Vitest: binder router tests
- [x] Vitest: credits router tests
- [x] Vitest: admin router tests (FORBIDDEN guard)
- [x] Vitest: stripe checkout invalid pack/plan tests
- [x] Vitest: sell.generateListing NOT_FOUND test
- [x] Vitest: templates.list test
- [x] Vitest: profile.update test
- [x] All 17 tests passing, zero TypeScript errors

## Post-Deployment Steps (for owner)
- [ ] Add Scrydex API key in Admin Dashboard (/admin → App Config)
- [ ] Claim Stripe sandbox at https://dashboard.stripe.com/claim_sandbox/YWNjdF8xVHF5TUpBMlR3dkttc0xkLDE3ODQxNTkzMzcv100BrbIaDkq
- [ ] Test Stripe payments with card 4242 4242 4242 4242
- [ ] Deploy and verify nightly price update fires at 6am UTC

- [x] Integrate XRPL payment intents, transaction verification, and idempotent credit fulfillment
- [x] Add Apple Pay and Google Pay express checkout through a supported fiat payment processor
- [x] Add payment-method configuration, status, and user-facing checkout states
- [x] Harden critical security controls: headers, rate limiting, body limits, HTTPS behavior, CORS, and webhook verification
- [x] Add database migration and tests for XRPL and payment security changes
- [x] Run typecheck, tests, build, and review deployment configuration
- [x] Commit and push verified payment and security changes to GitHub after explicit user authorization
