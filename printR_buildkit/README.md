# BuidLer PrintR — Ultimate All-In Kit v2 (Progression)

Includes:
- Build shell (React + Telegram) + Solana trajectory scaffolding
- Switchboard SRS program-enforced randomness scaffold
- Complete game design pack
- UI/UX specs (Figma component map + play + parallel + micro animations)
- Frontend state machine (parallel play + commit/close routing)
- Player progression system (badges, trophies, leaderboards, rewards, profile)

## Key paths
- printR_buildkit/frontend/src/state/gameMachine.ts
- design_docs/09_UI_UX_Specs/
- design_docs/10_Player_Progression/

## Added: UI Screens Specs
- design_docs/11_UI_Screens_Specs (profile, trophy cabinet, leaderboards, badge unlock modal, post-session and post-season summaries)

## Added: Mechanics Math (v1 locked)
- design_docs/12_Mechanics_Math/MECHANICS_MATH.md
- frontend mechanics implemented in printR_buildkit/frontend/src/state/gameMachine.ts

## v5 Additions (Trust-first MVP)
- Backend scaffold + VRF queue + mechanics tests: printR_buildkit/backend
- TradingView-like chart component: printR_buildkit/frontend/src/components/charts/TradingViewLikeChart.tsx
- Kickoff docs: design_docs/13_Engineering_Kickoff/

## Local development

### Backend
1) Copy `printR_buildkit/backend/.env.example` to `printR_buildkit/backend/.env` and set:
   - `DATABASE_URL` (Supabase Postgres) or `DATABASE_PATH` (SQLite fallback)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`
   - `USE_SWITCHBOARD_VRF=true` and `SOLANA_*` vars for server-authoritative VRF
2) If using Supabase, apply the migration:
   - `printR_buildkit/backend/sql/migrations/002_supabase_postgres.sql`
3) Install and run:
   - `cd printR_buildkit/backend`
   - `npm install`
   - `npm run dev`

### Smoke test (local)
From `printR_buildkit/backend` (backend must be running):
- `npm run smoke`
- Requires a player with credits (run Stripe test checkout or seed DB).

### Seed credits (local SQLite)
From `printR_buildkit/backend`:
- `npm run seed:credits -- --player tg:demo --amount 40`

### Stripe webhook (local)
Forward Stripe events to the backend:
```
stripe listen --forward-to http://localhost:3001/webhooks/stripe
```

### Frontend
1) Copy `printR_buildkit/frontend/.env.local.example` to `printR_buildkit/frontend/.env.local` and set `VITE_API_BASE`.
2) Install and run:
   - `cd printR_buildkit/frontend`
   - `npm install`
   - `npm run dev`
