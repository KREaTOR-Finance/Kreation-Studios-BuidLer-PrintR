# PrintR Build Checklist (Supplemental)

This checklist fills in build and ship steps not covered in the shell checklist. Execute in order.

| Step | Status | Files touched | Commands to verify | Definition of Done |
| --- | --- | --- | --- | --- |
| 1 | [x] | N/A | `npm install` (backend, frontend), `npm run build` (backend/frontend), `npm run test` (backend) | Dependencies installed and baseline build/test failures captured. |
| 2 | [x] | `backend/src/index.ts`, `backend/src/routes/credits.ts`, `backend/src/routes/payments.ts`, `backend/src/routes/webhooks.ts` | `npm run build` (backend) | Duplicate routes removed and server boots with modular routes. |
| 3 | [x] | `backend/src/credits/postgresCreditsStore.ts`, `backend/src/credits/sqliteCreditsStore.ts`, `backend/src/credits/store.ts`, `backend/sql/migrations/001_init.sql`, `backend/sql/migrations/002_supabase_postgres.sql` | `npm run build` (backend) | Credits ledger/balance implemented for Postgres with SQLite fallback and non-negative enforcement. |
| 4 | [x] | `backend/src/routes/credits.ts` | `npm run build` (backend) | Join endpoint enforces LIVE/FINAL_COMMIT_WARNING consumption and CLOSING spectator rules with idempotency. |
| 5 | [x] | `backend/src/routes/payments.ts`, `backend/src/payments/stripe.ts` | `npm run build` (backend) | Stripe checkout returns URL and bundle/session metadata with required metadata. |
| 6 | [x] | `backend/src/routes/webhooks.ts` | `npm run build` (backend) | Stripe webhook verifies signature, handles checkout completion, and is idempotent. |
| 7 | [x] | `frontend/src/hooks/useCreditsBalance.ts`, `frontend/src/components/site/SiteNav.tsx`, `frontend/src/screens/HomeScreen.tsx`, `frontend/src/screens/ProfileScreen.tsx`, `frontend/src/components/Card.tsx`, `frontend/tsconfig.json` | `npm run build` (frontend) | Sessions balance shown in lobby/header/profile/store and store checkout wiring works. |
| 8 | [x] | `frontend/src/state/useGameMachine.ts`, `frontend/src/state/machine.ts`, `frontend/src/screens/LiveRoundScreen.tsx`, `frontend/src/screens/HomeScreen.tsx` | `npm run build` (frontend) | Out-of-credits guardrail and spectator messaging implemented, join uses backend. |
| 9 | [x] | `backend/src/credits/creditsStore.test.ts`, `backend/src/credits/sqliteCreditsStore.ts` | `npm run test` (backend) | Tests cover consume idempotency, webhook idempotency, and negative balance prevention. |
| 10 | [x] | `README.md`, `backend/.env.example`, `frontend/.env.local.example`, `CHECKLIST.md`, `BUILD_CHECKLIST.md` | N/A | Documentation and env examples updated; checklists reflect current status. |
