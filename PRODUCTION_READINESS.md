# PrintR — Production Readiness (MWA) — Comprehensive Checklist

Date: 2026-03-04 (America/Denver)

This is a **production preparation** document for PrintR’s Mobile Web App (MWA): pay → play → results → leaderboard.
It is written as a *work plan + risk register + acceptance criteria*.

---

## 0) Current State Snapshot (what we have)

### Core loop
- **Sessions**: generated/stepped every 5s in backend, ephemeral in-memory session runtimes.
- **Gameplay**: WS-based. Player intent OPEN/CLOSE. Points realized on close.
- **Commits-per-session**: 10 commits per *session you join* (spectators can watch with 0 commits).
- **Results persistence**: session-end results persisted to SQLite if `DATABASE_PATH` set.
- **Leaderboard**: all-time sum of session results (`/api/leaderboard/all`) + per-session board.

### Payments
- Stripe checkout endpoint exists.
- Solana pay intent/confirm exists (server-verified).
- Credits consumption happens on `POST /api/sessions/:sessionId/join`.

### Known instability
- Backend dev process has been SIGKILL’d multiple times (needs process manager + crash resilience).

---

## 1) Production Definition (what “done” means)

### Minimum viable production
1. Users can **connect wallet (MWA)** reliably.
2. Users can **buy credits** (Stripe and/or Solana) and see balance.
3. Users can **join a session**:
   - without credits → spectate
   - with credits → play, 10 commits for that session
4. Backend **records final scores** at session end and produces leaderboards.
5. Ops can observe uptime, errors, payments, and abuse.

### Non-goals for first prod
- Reward distribution / guardian staking / SKR airdrop automation (tracked as future work).

---

## 2) High-Risk Items (must address before production)

### 2.1 Identity + attribution (Wallet vs PlayerRef vs PlayerId)
**Risk:** leaderboard/results incorrectly attributed if wallet not present or if playerId changes.

**Target:**
- Wallet pubkey is **authoritative identity** for results and leaderboards.

**Work:**
- Ensure wallet is captured consistently:
  - from MWA wallet adapter connection
  - sent to backend on WS connect (already)
  - also sent on join request and persisted
- Define fallback rules (if no wallet: spectate only; do not post results under playerId).

**Acceptance:** Results rows have `wallet` populated for all “play” entries.

### 2.2 Credit gating & anti-fraud
**Risk:** Client can open positions without paying, or can replay/forge join.

**Target:**
- Backend must require a **server-issued play permit/token** to OPEN.

**Work:**
- Replace current in-memory `playPermits` with a signed token check:
  - validate `playToken` (JWT/HMAC) in `PLAYER_INTENT OPEN` events
  - token bound to `{wallet, sessionId, expiresAt}`
- Enforce idempotency on join/credit consume.

**Acceptance:** A player cannot OPEN unless they have a valid token from join.

### 2.3 Persistence & crash recovery
**Risk:** restarting backend resets sessions/player state; users lose open positions; results may not write.

**Work:**
- Use a real store for:
  - sessions (optional) or at least results/credits/receipts
  - player session state (commitsRemaining, scoreRealized) OR make state reconstructible
- Ensure session end triggers results write exactly-once.
- Decide whether sessions are *ephemeral rounds* or *scheduled rounds* (recommended: scheduled).

**Acceptance:** Backend restart does not lose credits or finalized results; ongoing sessions recover deterministically.

### 2.4 Payments & webhooks
**Risk:** credits not credited, double-credit, refund abuse.

**Work:**
- Stripe:
  - configure webhook verification
  - handle `checkout.session.completed`, `payment_intent.succeeded`, refunds/chargebacks
  - make crediting idempotent by Stripe event id
- Solana:
  - confirm logic must verify:
    - recipient
    - reference
    - mint
    - amount
    - cluster
  - signature replay protection (store already exists)

**Acceptance:** Credits increment exactly once per successful payment; refunds revoke credits safely.

### 2.5 Rate limiting, abuse, and WS hardening
**Risk:** WS spam, join spam, DoS.

**Work:**
- Per-IP + per-wallet limits
- WS message schema validation (zod exists) + close on repeated invalid messages
- Add max connections per IP

---

## 3) Backend Engineering Checklist

### 3.1 Configuration / environment variables
- [ ] Produce a full `.env.production.example` with required keys.
- [ ] Document required values for:
  - `DATABASE_URL` or `DATABASE_PATH`
  - `CORS_ORIGIN`
  - Stripe keys + success/cancel URLs
  - Solana RPC / switchboard config
  - Admin token(s)

### 3.2 Database migrations
- [ ] All stores must have migrations and must run on startup:
  - credits, receipts, analytics, referrals, solana intents, results.
- [ ] Add a `migrate` command (one-shot) for deployment pipelines.

### 3.3 Session lifecycle
- [ ] Define session cadence:
  - fixed schedule (recommended) vs dynamic regeneration
- [ ] Ensure deterministic end and results finalize:
  - finalize once
  - prevent late writes

### 3.4 Results & leaderboard API
- [ ] Add pagination + limits
- [ ] Add day/week scopes (even if hidden)
- [ ] Add `GET /api/leaderboard/session/:id` rank + wallet abbr fields

### 3.5 Logging + observability
- [ ] Structured logging (JSON) with request ids
- [ ] Metrics: ws connections, tick loop latency, payment events, join/consume events
- [ ] Error tracking (Sentry or equivalent)

### 3.6 Process management
- [ ] Run backend under PM2/systemd/Docker with restart policy
- [ ] Health checks: `/health` + readiness
- [ ] Graceful shutdown: stop tick loop, flush writes

---

## 4) Frontend (MWA) Checklist

### 4.1 Wallet UX
- [ ] Clear “Connected as XXXX…YYYY” state
- [ ] Store page: disable SOL/SKR buttons until wallet connected
- [ ] Explicit network indicator (devnet/mainnet)

### 4.2 Pay → Play handoff
- [ ] On return from Stripe, refresh balance and show “credited” toast
- [ ] Store should display **credits balance** prominently

### 4.3 Spectate vs play mode
- [ ] In-game: show spectate banner (done)
- [ ] Disable COMMIT UI when spectating
- [ ] Offer Store link

### 4.4 Leaderboard
- [ ] Minimal view (done): rank, wallet abbr, raw sum score
- [ ] Add loading skeleton + error retry

### 4.5 Performance & stability
- [ ] Remove heavy animations that trigger repaints
- [ ] Ensure chart renderer doesn’t cause layout thrash
- [ ] Bundle size review

---

## 5) Security Checklist

- [ ] Enforce HTTPS + HSTS in production
- [ ] CORS locked down to allowed origins
- [ ] Validate all incoming payloads
- [ ] Secrets management (no keys in repo)
- [ ] Stripe webhook signature verification
- [ ] Solana confirm endpoint replay protection (already has signature store; verify in prod)

---

## 6) Deployment Checklist

### 6.1 Environments
- [ ] Devnet staging
- [ ] Mainnet production
- [ ] Feature flags for:
  - switchboard VRF
  - payments providers

### 6.2 CI/CD
- [ ] Build backend + frontend
- [ ] Run typecheck/tests
- [ ] Run migrations
- [ ] Deploy and run smoke tests

### 6.3 Smoke tests (manual + automated)
1. Load landing in Telegram webview
2. Connect wallet via MWA
3. Buy credits (Stripe or Solana)
4. Join session
5. Commit and close
6. Wait for session end
7. Verify results appear on per-session leaderboard
8. Verify all-time leaderboard sums

---

## 7) Reward System (future, not required for prod launch)

### Guardian staking + SKR yield distribution
- Define accounting model:
  - stake principal tracking
  - yield periods
  - distribution weights (rank-based)
- Add a job/cron to compute reward allocations
- Airdrop execution with audited keys

---

## 8) Immediate Next Actions (recommended order)

1. **Make play authorization cryptographic** (playToken required for OPEN).
2. **Stripe webhook + idempotent crediting**.
3. **Persist player session state** (commitsRemaining/scoreRealized) or store intents and reconstruct.
4. **Daily/weekly leaderboard scopes** (keep UI minimal, but backend ready).
5. **Hardening**: rate limits, ws close-on-abuse, metrics.

---

## Appendix A — API inventory (current)
- `GET /sessions`
- `GET /health`
- `POST /api/sessions/:sessionId/join`
- `POST /api/payments/stripe/checkout`
- `POST /api/payments/solana/intent`
- `POST /api/payments/solana/confirm`
- `GET /api/leaderboard/all`
- `GET /api/leaderboard/session/:sessionId`

---

## Appendix B — Definitions
- **Commit**: OPEN action that consumes 1 of 10 commit credits for a joined session.
- **Close**: closes an open position; does not consume commit credits.
- **Session credit**: entitlement to join a session as a player (consumes 1 balance).
