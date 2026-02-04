# BuidLer PrintR — React Frontend + Builder Handoff Checklist (Extensive)

## v13 Addendum — Payments/Credits Completion
- ✅ SQLite CreditsStore implementation (`backend/src/credits/sqliteCreditsStore.ts`) + migrations.
- ✅ Stripe SDK integration in backend (`backend/src/payments/stripe.ts`) + endpoints.
- ✅ Store screen purchase UI (two bundles) + checkout redirect.
- ✅ Lobby header includes Sessions balance (TopStats pill).

_Last updated: 2026-01-04_

This checklist is intended to be **exhaustive** and usable by:
- React/TMA frontend builders
- Backend builders
- Solana program builders
- QA / release manager

Legend:
- ✅ = present in kit / spec complete
- ⚠️ = present but scaffold/stub/TODO remains
- ❌ = not present / must be created

---

## 0) Kit Inventory Snapshot (for sanity)
- Total files (excluding folders): **108**
- Frontend: **46**
- Backend: **14**
- Onchain: **6**
- Figma: **2**
- UI Kit: **2**
- Design Docs: **35**

---

## 1) Project Bootstrap & Consistency

### 1.1 Repo structure matches expected layout
- ✅ `printR_buildkit/README.md`
- ✅ `printR_buildkit/CHECKLIST.md`
- ✅ `printR_buildkit/frontend/README.md`
- ✅ `printR_buildkit/backend/.env.example`

### 1.2 Naming + language consistency (“Commit/Close”, “Session”, “Closing”)
- ✅ Design specs use the same verbs: **COMMIT**, **CLOSE**, **Close at End Price**
- ✅ Crowd Tape terms aligned: “prints”, “final 30s”, “LAST CHANCE TO COMMIT”
- 🔲 Confirm in UI copy everywhere (Lobby, Play, Closing, Summary, Leaderboards)

### 1.3 Mobile-first layout rules enforced
- ✅ `design_docs/14_UI_Gameplay_Spec/PLAY_SCREEN_MOBILE_BROKER_LAYOUT.md`
- ✅ No scroll, no pop-ups in live play (spec)
- 🔲 Confirm responsive behavior in iOS Telegram WebApp viewport

---

## 2) Gameplay UX — Must-Match Specs (UI Signoff)

### 2.1 Play screen layout (broker terminal)
- ✅ Chart occupies ~65–70% (top)
- ✅ Controls occupy ~30–35% (bottom)
- ✅ HUD hierarchy: Price → Score → Chart → Time/Phase → Controls
- ✅ VRF proof access: tiny ⓘ badge + modal

**Spec:** ✅ `design_docs/14_UI_Gameplay_Spec/PLAY_SCREEN_MOBILE_BROKER_LAYOUT.md`

### 2.2 Two-step “weighted” commit/close interaction
- ✅ “press/hold to arm (~200ms) → release to execute” (spec)
- 🔲 Implement with haptics + micro glow, no confirm modals
- 🔲 Prevent accidental multiple sends (debounce / lock per tick)

### 2.3 Chart ↔ Score coupling (intensity driver)
- ✅ Spec requires synchronous updates
- 🔲 Implement “Unrealized strip”: Entry → Now, Unrealized Δ points

### 2.4 Closing phase behaviors (no surprise forfeits)
- ✅ Closing state defined
- ✅ Forfeit rule defined (open position at end without valid close)
- ✅ Close-at-End-Price option defined
- ✅ Final 30s “Last chance to commit” warning

**Spec:** ✅ `design_docs/14_UI_Gameplay_Spec/CLOSING_PHASE_STATE_MACHINE.md`

### 2.5 Bottom panel role-based rules (player vs spectator)
- ✅ Spectators: **Crowd Tape** occupies the bottom panel (controls area)
- ✅ Players in CLOSING: **Pressure Board** occupies most of bottom panel + Close control remains
- ✅ No “disabled controls as primary UI” rule

**Spec:** ✅ `design_docs/14_UI_Gameplay_Spec/SPECTATOR_AND_CLOSING_BOTTOM_PANEL_LAYOUT.md`

---

## 3) Crowd Tape + Micro-Bias (Final 30 seconds)

### 3.1 Crowd Tape display modes (privacy-safe)
- ✅ Mode A: anonymous handles (default)
- ✅ Mode B: opt-in profile identified
- ✅ Mode C: short wallet hash in modal only
- ✅ Mode D: private rooms (future)

**Spec:** ✅ `design_docs/14_UI_Gameplay_Spec/CROWD_TAPE_SPEC.md`  
**Privacy:** ✅ `design_docs/14_UI_Gameplay_Spec/CROWD_TAPE_PRIVACY_RULES.md`

### 3.2 Crowd Tape gating
- ✅ ON only during FINAL_COMMIT_WARNING (T-30s)
- ✅ OFF in LIVE and CLOSING

### 3.3 Crowd Micro-Bias (tiny, capped)
- ✅ Bias defined
- ✅ Cap: `biasMax = 0.05` (5%) and only in FINAL_COMMIT_WARNING

**Mechanics:** ✅ `design_docs/14_UI_Gameplay_Spec/CROWD_MICRO_BIAS_MECHANICS.md`  
- 🔲 Implementation must keep VRF + archetype dominant

---

## 4) VRF / Fairness / Trust UX

### 4.1 UI proof access (confidence)
- ✅ `frontend/src/components/vrf/VrfProofBadge.tsx`
- ✅ `frontend/src/components/vrf/VrfProofModal.tsx`
- ✅ Hook exposes last tick VRF: `frontend/src/hooks/useSessionFeed.ts`

### 4.2 Proof payload standard
- ✅ Payload spec: `design_docs/13_Engineering_Kickoff/VRF_PROOF_PAYLOAD.md`
- ✅ Tick schema includes proof object: `backend/src/types/events.ts`

### 4.3 Switchboard SRS wiring status
- ⚠️ Backend provider is scaffold-only:
  - `backend/src/vrf/switchboardSrsProvider.ts` contains `ensureRandomnessAccount()` and `commitRevealRead()` stubs

- ⚠️ Frontend on-chain adapter is scaffold-only:
  - `frontend/src/state/solanaOnChainVrfAdapter.ts` (explicit TODOs)
  - `frontend/src/state/useGameMachine.ts` includes TODO for `playerRef` wiring

---

## 5) Session Lifecycle, Entry Rules, and Edge Cases

### 5.1 Join-in-progress
- ✅ Allowed in LIVE and FINAL_COMMIT_WARNING
- ✅ In CLOSING: join as spectator (no commits)
- 🔲 Lobby must clearly label session phase BEFORE join

### 5.2 Late join protection (final 2 minutes)
- ✅ Spectator UX required (Crowd Tape + CTA)
- 🔲 Ensure join button changes to “Spectate” when phase=CLOSING

### 5.3 One position max + min hold
- ✅ Spec: one position per session
- 🔲 Enforce min hold 1 tick
- 🔲 Enforce no new commit while position open

---

## 6) Progression: Badges, Trophies, Leaderboards, Summary Screens

### 6.1 Screens present in kit
- ✅ Included in UI kit + docs (per v3+ additions)
- 🔲 Confirm final list exists in Figma frames and component map

### 6.2 Required behavior checklist
- 🔲 Badge unlock modal (non-blocking)
- 🔲 Trophy cabinet (profile)
- 🔲 Leaderboard (session + season)
- 🔲 Post-session summary (play again CTA)
- 🔲 Post-season summary (rank/tier changes)

---

## 7) Payments (Credits) — Database-Ledger (Locked)

### 7.1 Pricing & Bundles (locked)
- ✅ 1 USDC = 4 sessions
- ✅ $10 → 40 sessions (minimum)
- ✅ $100 → 500 sessions

**Spec:** ✅ `design_docs/16_Payments_and_Credits/PRICING_AND_BUNDLES.md`

### 7.2 Credits state machine (authoritative)
- ✅ Purchase (Stripe/USDC) → balance increment
- ✅ Consume on session join (LIVE / FINAL_COMMIT_WARNING)
- ✅ Spectating free (CLOSING join consumes 0)
- ✅ Idempotency required for join consumption

**Spec:** ✅ `design_docs/16_Payments_and_Credits/CREDITS_STATE_MACHINE.md`

### 7.3 Backend endpoints contract
- ✅ GET `/api/credits/balance`
- ✅ POST `/api/sessions/:sessionId/join` (consumes 1 session if joinable; spectator otherwise)
- ⚠️ POST `/api/payments/stripe/checkout` scaffold-only (requires Stripe SDK)
- ⚠️ POST `/webhooks/stripe` scaffold-only (requires signature verification + event parsing)

**Spec:** ✅ `design_docs/16_Payments_and_Credits/BACKEND_ENDPOINTS_PAYMENTS_CREDITS.md`  
**Webhook:** ✅ `design_docs/16_Payments_and_Credits/STRIPE_WEBHOOK_RULES.md`

### 7.4 Database schema (minimum)
- ✅ players
- ✅ credit_balances
- ✅ credit_ledger (append-only)

**Schema:** ✅ `design_docs/16_Payments_and_Credits/CREDITS_DB_SCHEMA.sql`

### 7.5 Required UI display
- ✅ Profile shows Sessions Balance
- 🔲 Lobby header shows Sessions Balance
- 🔲 Store screen offers bundles ($10 / $100) and shows purchase results

**Frontend additions:** ✅ `frontend/src/hooks/useCreditsBalance.ts`, ✅ `frontend/src/network/httpClient.ts`


## 8) Telegram WebApp / Wallet / Identity

### 8.1 Identity model
- 🔲 Telegram user id as primary profile id (TMA)
- 🔲 Optional Solana wallet connect (Phantom / etc.)
- ⚠️ Frontend TODO: `playerRef: "telegram_or_wallet"`

### 8.2 Session entitlement
- 🔲 Credits balance stored server-side (authoritative)
- 🔲 Client shows credits, but server validates all marker usage

---

## 9) Backend (Trust-first MVP) Readiness

### 9.1 WebSocket feed
- ✅ `backend/src` exists; ensure tick events include vrf metadata
- 🔲 Confirm event schemas match frontend expectations

### 9.2 Session runtime
- 🔲 Must implement:
  - session creation & discovery (4 parallel sessions)
  - phase transitions (LIVE → FINAL_COMMIT_WARNING → CLOSING → ENDED)
  - join handling (player vs spectator)

### 9.3 Persistence
- 🔲 Store:
  - session results
  - per-user season stats
  - proof refs (tx sigs) and/or randomness account pointers

---

## 10) On-chain Program (Solana) — Program-Enforced Mode

### 10.1 Program artifacts present
- ✅ `printR_buildkit/onchain/` directory exists (kit-level)
- ⚠️ Confirm program spec completeness: requests, settlement PDA, proof refs

### 10.2 Required on-chain behaviors
- 🔲 One VRF per tick per session (as designed)
- 🔲 Program stores:
  - committed slot
  - reveal tx signature / proof reference
  - output hash/bytes pointer
- 🔲 Deterministic bytes→z mapping matches spec

---

## 11) QA / Testing Matrix (Must run before launch)

### 11.1 Functional smoke
- 🔲 Start session, join mid-session, commit, close, score updates
- 🔲 Final 30s: tape appears, commits still possible, micro-bias active
- 🔲 Closing: no commits, close works, close-at-end works
- 🔲 Forfeit triggers only when warranted (warned)

### 11.2 Edge-case tests
- 🔲 Join within closing: spectator UI only
- 🔲 Network drop during close: idempotent close request
- 🔲 Double taps / repeated hold: no duplicate actions
- 🔲 Multiple sessions (2–4): focus selection correct

### 11.3 Trust UX
- 🔲 VRF modal always opens
- 🔲 Proof refs display correctly (tx sigs / randomness account)
- 🔲 No sensitive wallet leakage in tape by default

---

## 12) Performance / Feel (Non-negotiable)

- 🔲 60fps chart render on mid-tier phones
- 🔲 No layout shifts on tick
- 🔲 Haptics do not stutter
- 🔲 Tape updates batched (avoid re-render storms)
- 🔲 Memory capped (ticks slice window)

---

## 13) “Known TODO / Stub” List (from code scan)

### Backend
- ⚠️ `backend/src/vrf/switchboardSrsProvider.ts`
  - `ensureRandomnessAccount()` not implemented
  - `commitRevealRead()` not implemented

### Frontend
- ⚠️ `frontend/src/state/solanaOnChainVrfAdapter.ts` scaffold-only
- ⚠️ `frontend/src/state/useGameMachine.ts`
  - TODO: wire `playerRef` to Telegram ID + wallet pubkey

---

## Appendix A) File Index (High level)

### Root/Other
- `README.md`
- `printR_buildkit/README.md`
- `printR_buildkit/CHECKLIST.md`

### Figma
- `printR_buildkit/figma/README.md`
- `printR_buildkit/figma/frames.md`

### UI Kit
- `printR_buildkit/ui-kit/tokens.json`
- `printR_buildkit/ui-kit/components.md`

### Backend (paths)
- `printR_buildkit/backend/.env.example`
- `printR_buildkit/backend/package.json`
- `printR_buildkit/backend/src/engine/mechanics.test.ts`
- `printR_buildkit/backend/src/engine/mechanics.ts`
- `printR_buildkit/backend/src/engine/models.ts`
- `printR_buildkit/backend/src/engine/sessionEngine.ts`
- `printR_buildkit/backend/src/index.ts`
- `printR_buildkit/backend/src/server/ws.ts`
- `printR_buildkit/backend/src/types/events.ts`
- `printR_buildkit/backend/src/vrf/devProvider.ts`
- `printR_buildkit/backend/src/vrf/provider.ts`
- `printR_buildkit/backend/src/vrf/queue.ts`
- `printR_buildkit/backend/src/vrf/switchboardSrsProvider.ts`
- `printR_buildkit/backend/tsconfig.json`

### Onchain (paths)
- `printR_buildkit/onchain/README.md`
- `printR_buildkit/onchain/SRS_WIRING_NOTES.md`
- `printR_buildkit/onchain/anchor/Anchor.toml`
- `printR_buildkit/onchain/anchor/Cargo.toml`
- `printR_buildkit/onchain/anchor/programs/printr/Cargo.toml`
- `printR_buildkit/onchain/anchor/programs/printr/src/lib.rs`

### Frontend (paths)
- `printR_buildkit/frontend/COMPONENT_MAP.md`
- `printR_buildkit/frontend/README.md`
- `printR_buildkit/frontend/index.html`
- `printR_buildkit/frontend/package.json`
- `printR_buildkit/frontend/src/App.tsx`
- `printR_buildkit/frontend/src/components/Avatar.tsx`
- `printR_buildkit/frontend/src/components/Badge.tsx`
- `printR_buildkit/frontend/src/components/Button.tsx`
- `printR_buildkit/frontend/src/components/Card.tsx`
- `printR_buildkit/frontend/src/components/CreditPackCard.tsx`
- `printR_buildkit/frontend/src/components/EmptyState.tsx`
- `printR_buildkit/frontend/src/components/ListRow.tsx`
- `printR_buildkit/frontend/src/components/NavBar.tsx`
- `printR_buildkit/frontend/src/components/ObjectiveCard.tsx`
- `printR_buildkit/frontend/src/components/PendingSettlementBanner.tsx`
- `printR_buildkit/frontend/src/components/ProgressBar.tsx`
- `printR_buildkit/frontend/src/components/ProposalCard.tsx`
- `printR_buildkit/frontend/src/components/Selectors.tsx`
- `printR_buildkit/frontend/src/components/TopStats.tsx`
- `printR_buildkit/frontend/src/components/WeightedVoteMeter.tsx`
- `printR_buildkit/frontend/src/components/charts/TradingViewLikeChart.tsx`
- `printR_buildkit/frontend/src/components/vrf/VrfProofBadge.tsx`
- `printR_buildkit/frontend/src/components/vrf/VrfProofModal.tsx`
- `printR_buildkit/frontend/src/hooks/useSessionFeed.ts`
- `printR_buildkit/frontend/src/main.tsx`
- `printR_buildkit/frontend/src/network/wsClient.ts`
- `printR_buildkit/frontend/src/screens/GovernanceScreen.tsx`
- `printR_buildkit/frontend/src/screens/HistoryScreen.tsx`
- `printR_buildkit/frontend/src/screens/HomeScreen.tsx`
- `printR_buildkit/frontend/src/screens/LeaderboardScreen.tsx`
- `printR_buildkit/frontend/src/screens/LiveRoundScreen.tsx`
- `printR_buildkit/frontend/src/screens/ProfileScreen.tsx`
- `printR_buildkit/frontend/src/screens/ProgressScreen.tsx`
- `printR_buildkit/frontend/src/screens/ResultScreen.tsx`
- `printR_buildkit/frontend/src/screens/StoreScreen.tsx`
- `printR_buildkit/frontend/src/screens/VaultScreen.tsx`
- `printR_buildkit/frontend/src/state/HapticsProvider.tsx`
- `printR_buildkit/frontend/src/state/PROGRAM_ENFORCED_FLOW.md`
- `printR_buildkit/frontend/src/state/SoundProvider.tsx`
- `printR_buildkit/frontend/src/state/gameMachine.ts`
- `printR_buildkit/frontend/src/state/machine.ts`
- `printR_buildkit/frontend/src/state/solanaOnChainVrfAdapter.ts`
- `printR_buildkit/frontend/src/state/useGameMachine.ts`
- `printR_buildkit/frontend/src/state/vrf.ts`
- `printR_buildkit/frontend/src/styles/app.css`
- `printR_buildkit/frontend/src/styles/tokens.css`
- _(Frontend list truncated in this appendix view; full file list remains in repo/zip)_

### Design Docs (paths)
- `design_docs/01_Game_Design/ONE_PAGE_GDD.md`
- `design_docs/02_Game_Mechanics/CORE_MECHANICS.md`
- `design_docs/03_Economy_and_Credits/CREDITS_AND_MARKERS.md`
- `design_docs/04_Asset_Creation/ASSET_CREATION_FLOW.md`
- `design_docs/05_Sessions_and_Rounds/ASSET_SESSIONS.md`
- `design_docs/06_Volatility_Model/VOLATILITY_BY_SUPPLY.md`
- `design_docs/07_Tech_Architecture/TECH_STACK.md`
- `design_docs/08_Future_Expansion/ROADMAP.md`
- `design_docs/09_UI_UX_Specs/FIGMA_COMPONENT_MAP.md`
- `design_docs/09_UI_UX_Specs/MICRO_ANIMATIONS_SPEC.md`
- `design_docs/09_UI_UX_Specs/PARALLEL_PLAY_SPEC.md`
- `design_docs/09_UI_UX_Specs/PLAY_SCREEN_SPEC.md`
- `design_docs/10_Player_Progression/BADGES.md`
- `design_docs/10_Player_Progression/LEADERBOARDS.md`
- `design_docs/10_Player_Progression/PLAYER_PROFILE.md`
- `design_docs/10_Player_Progression/REWARDS.md`
- `design_docs/10_Player_Progression/TROPHIES.md`
- `design_docs/11_UI_Screens_Specs/BADGE_UNLOCK_MODAL_SPEC.md`
- `design_docs/11_UI_Screens_Specs/LEADERBOARD_SCREEN_SPEC.md`
- `design_docs/11_UI_Screens_Specs/POST_SEASON_SUMMARY_SPEC.md`
- `design_docs/11_UI_Screens_Specs/POST_SESSION_SUMMARY_SPEC.md`
- `design_docs/11_UI_Screens_Specs/PROFILE_SCREEN_SPEC.md`
- `design_docs/11_UI_Screens_Specs/TROPHY_CABINET_SPEC.md`
- `design_docs/12_Mechanics_Math/MECHANICS_MATH.md`
- `design_docs/13_Engineering_Kickoff/ENGINEERING_KICKOFF.md`
- `design_docs/13_Engineering_Kickoff/SWITCHBOARD_SRS_WIRING.md`
- `design_docs/13_Engineering_Kickoff/TEST_PLAN.md`
- `design_docs/13_Engineering_Kickoff/UI_VRF_BADGE_INTEGRATION.md`
- `design_docs/13_Engineering_Kickoff/VRF_PROOF_PAYLOAD.md`
- `design_docs/14_UI_Gameplay_Spec/CLOSING_PHASE_STATE_MACHINE.md`
- `design_docs/14_UI_Gameplay_Spec/CROWD_MICRO_BIAS_MECHANICS.md`
- `design_docs/14_UI_Gameplay_Spec/CROWD_TAPE_PRIVACY_RULES.md`
- `design_docs/14_UI_Gameplay_Spec/CROWD_TAPE_SPEC.md`
- `design_docs/14_UI_Gameplay_Spec/PLAY_SCREEN_MOBILE_BROKER_LAYOUT.md`
- `design_docs/14_UI_Gameplay_Spec/SPECTATOR_AND_CLOSING_BOTTOM_PANEL_LAYOUT.md`
- _(Design docs list truncated in this appendix view; full file list remains in repo/zip)_


## 14) Web Kit (Kreation Studios Games) + Host Bridge

- ✅ Single-brand tokens: `frontend/src/theme/tokens.ts`
- ✅ Site shell routes: `/`, `/games`, `/about`, `/support`, `/legal`
- ✅ PrintR marketing route: `/printr/landing`
- ✅ PrintR app route: `/printr` (plus subroutes `/printr/store`, `/printr/profile`, `/printr/leaderboards`)
- ✅ Router root: `frontend/src/RouterApp.tsx`
- ✅ Telegram host bridge: `frontend/src/host/hostBridge.ts` and `frontend/src/hooks/useHost.ts`
- 🔲 Telegram initData verification middleware (backend) to be added when ready


### Web Shell Content Depth (v16)
- ✅ Global styles: `frontend/src/styles/site.css`
- ✅ Reusable components: `frontend/src/components/site/SiteComponents.tsx`
- ✅ Home: featured + retention + trust + FAQ + CTA
- ✅ PrintR landing: core loop + phases + pricing + FAQ
- ✅ SiteNav sessions balance pill on /printr
- ✅ README + local env examples


### Developer Leads (Submit your game)
- ✅ Website form posts to backend endpoint (no email placeholder dependency)
- ✅ Backend supports Supabase Postgres via DATABASE_URL or SQLite fallback
- ✅ Migration included for Supabase

- ✅ Admin ops: list developer leads via `GET /api/admin/developer-leads` (X-Admin-Token)
