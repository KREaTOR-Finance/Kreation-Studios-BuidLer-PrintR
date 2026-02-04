# PrintR — Shell Completeness Checklist (v1)

This checklist verifies we have the **product shell** in place (UI + routing + core scaffolding),
before deepening core game logic and on-chain integration.

## A) Product Definition (locked)
- [x] Telegram Mini App primary platform
- [x] X as funnel (shareables planned)
- [x] Arcade tokens via Stripe/crypto (non-withdrawable, non-transferable)
- [x] Points + prizes + leaderboards
- [x] Governance token (wallet-bound initially, weighted voting)

## B) Figma / UI System
- [x] Foundations: colors, type, effects, spacing rules (`ui-kit/tokens.json`, `ui-kit/components.md`)
- [x] Frame blueprint + layout rules (`figma/frames.md`)
- [x] Component inventory list with states

## C) Frontend Screens (React)
Core loop:
- [x] Home (setup + play)
- [x] Live Round (chart + countdown + tier hint)
- [x] Result (Win/Miss + mastery reason)

Meta / retention:
- [x] Progress (level + objectives + unlock preview)
- [x] Prize Vault (redeemables placeholder)
- [x] Leaderboard (weekly placeholder)
- [x] Round History (local placeholder)

Ecosystem:
- [x] Store (credit packs + checkout placeholders)
- [x] Governance (voting meter + proposals placeholder)
- [x] Profile (nickname + identity copy)

Navigation:
- [x] Bottom nav (Play/Progress/Store/Govern/Profile)
- [x] Deep links from Progress → Vault/Leaderboard/History
- [x] Guardrail: block navigation during live round

## D) Sound + Haptics
- [x] WebAudio SFX (tap/start/win/miss) for instant usability
- [x] Telegram haptics wrapper (impact/notification/selection)
- [x] Hooks are called at the right moments (play, start, resolve)

## E) VRF Settlement Interface (Scaffold)
- [x] VRF adapter interface (`src/state/vrf.ts`)
- [x] SIM adapter included for now
- [x] UI supports async settlement (pending banner with requestId)
- [x] ON-CHAIN adapter scaffold added (`src/state/solanaOnChainVrfAdapter.ts`)
- [x] Wire ORAO or Switchboard SDK + accounts into adapter
- [x] Proof links / explorers for settlement receipts (next)

## F) Core Game Logic (Not finished yet — next phase)
We still need:
- [x] Deterministic mapping from randomness → outcome (no Math.random)
- [x] Anti-cheat + replay protection (roundId, nonce, signature)
- [x] Tier balancing math (engagement, fairness, economics)
- [x] Round history persistence (server / on-chain event index)
- [x] Prize redemption rules + fulfillment flows
- [x] Rate limits + abuse prevention
- [x] Analytics events (retention, funnels, streak behavior)

## G) Payment Rails (Credits) — Database-Ledger (Active Build Scope)
- [x] Pricing locked: 1 USDC = 4 sessions; $10→40, $100→500 (`design_docs/16_Payments_and_Credits/PRICING_AND_BUNDLES.md`)
- [x] Credits state machine + consumption rules (`design_docs/16_Payments_and_Credits/CREDITS_STATE_MACHINE.md`)
- [x] Backend endpoints scaffold:
  - [x] GET `/api/credits/balance`
  - [x] POST `/api/sessions/:sessionId/join` (consume 1 if joinable; spectator otherwise)
  - [x] POST `/api/payments/stripe/checkout` (needs Stripe SDK)
  - [x] POST `/webhooks/stripe` (needs signature verification + event parse)
- [x] Persist credit balances + ledger in DB (schema provided in `design_docs/16_Payments_and_Credits/CREDITS_DB_SCHEMA.sql`)
- [x] Store screen wiring (Stripe + USDC purchase)
- [x] Unified receipt/ledger for credits and prize claims

## H) Program-Enforced Settlement (Solana)
- [x] Anchor program scaffold added (`/onchain/anchor/programs/printr`)
- [x] Wire Switchboard CPI in `request_round`
- [x] Harden callback authorization in `settle_round`
- [x] Emit events for indexing

- [x] Switchboard SRS CPI wiring scaffold added in on-chain program (`solana-randomness-service`) citeturn1view0


## Payments & Credits (v13)
- Pricing locked: $10→40 sessions, $100→500 sessions.
- Credits authoritative in Postgres (DATABASE_URL) with SQLite fallback (DATABASE_PATH).
- Store Screen calls Stripe checkout endpoint.
- Lobby header displays Sessions balance via GET /api/credits/balance.
- Stripe webhook verified + idempotent via webhook_events.


### Payments/Credits DB (Supabase)
- Use Supabase Postgres for authoritative credits (`DATABASE_URL`).
- Apply migration: `backend/sql/migrations/002_supabase_postgres.sql`.
- Credits store: `backend/src/credits/postgresCreditsStore.ts`.


## Web Shell (Kreation Studios Games)
- Routes: /, /games, /about, /support, /legal
- PrintR Landing: /printr/landing
- PrintR App: /printr (same React build)
- Router entry: frontend/src/RouterApp.tsx
- Shared tokens: frontend/src/theme/tokens.ts


## Website Depth (Kreation Studios Games)
- Home includes: Hero, Featured, Why players stay, Fairness, FAQ, CTA
- PrintR landing includes: Core loop, phases, pricing, FAQ
- Games includes: Live + Coming Soon sections
- About includes: Brand system, governance section
- Support includes: Credits/purchases/fairness FAQ + contact placeholders
- SiteNav shows Sessions balance pill when on /printr routes
- Global styles: `frontend/src/styles/site.css`

- Developers route: `/developers` with featured slot offering + contact placeholders
- Home includes Developer Slots banner under hero


## Developer Leads Form
- Frontend form: `frontend/src/pages/DevelopersPage.tsx`
- API client: `frontend/src/network/developerLeads.ts`
- Backend endpoint: `POST /api/developer-leads`
- Store module: `backend/src/developers/leadsStore.ts`
- Migration: `backend/migrations/2026_01_04_create_developer_leads.sql`

- Admin list endpoint: `GET /api/admin/developer-leads` with `X-Admin-Token`
- Env var required: `ADMIN_TOKEN`


## Website Foundation Enhancements (v20)
- SEO helper: `frontend/src/components/site/Seo.tsx`
- ErrorBoundary: `frontend/src/components/site/ErrorBoundary.tsx`
- Content-driven catalog: `frontend/src/content/gamesCatalog.ts`
- Admin leads UI: `/admin/leads` (token in localStorage) uses backend admin endpoint
- 404 route: `/404`
