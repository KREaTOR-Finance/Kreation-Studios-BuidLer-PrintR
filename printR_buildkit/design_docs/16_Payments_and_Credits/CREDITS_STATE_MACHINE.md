# Credits State Machine (Authoritative)

This defines how credits are purchased, stored, displayed, and consumed.

## Entities
- **PlayerRef**: canonical identity string: `tg:<telegram_user_id>` (primary). Optional linked wallet: `sol:<pubkey>`.
- **Credit Balance**: integer count of *sessions available*.
- **Credit Ledger**: append-only records for audit.

## States (per purchase + consumption)

### IDLE
Player has `balance >= 0`. UI displays balance in Profile + Lobby.

Transitions:
- `BUY_INTENT` → Purchasing (Stripe/USDC)
- `JOIN_SESSION_INTENT` → Consuming
- `REFUND_INTENT` → Refunding (admin/support)

### PURCHASING_STRIPE
- Create Stripe Checkout session
- Await redirect + webhook confirmation

Transitions:
- `STRIPE_CHECKOUT_CREATED` → AwaitingWebhook
- `STRIPE_CANCELLED` → IDLE

### PURCHASING_USDC (Solana)
- Player sends USDC to treasury
- Backend verifies on-chain tx and credits balance

Transitions:
- `USDC_TX_SEEN` → VerifyingOnChain
- `USDC_VERIFY_OK` → IDLE (with credit increment)
- `USDC_VERIFY_FAIL` → IDLE (no credit)

### AWAITING_WEBHOOK (Stripe)
- Only webhook is authoritative for crediting

Transitions:
- `STRIPE_WEBHOOK_COMPLETED` → IDLE (with credit increment)
- `STRIPE_WEBHOOK_FAILED` → IDLE (no credit)

### CONSUMING (Join)
Triggered by `POST /api/sessions/:id/join`

Rules:
- Must be phase LIVE or FINAL_COMMIT_WARNING
- Must have `balance >= 1`
- Must be idempotent per `(playerRef, sessionId)` within a small window

Transitions:
- `CONSUME_OK` → IN_SESSION
- `INSUFFICIENT_BALANCE` → IDLE (error)
- `SESSION_NOT_JOINABLE` → IDLE (spectator prompt)

### IN_SESSION
- Balance already consumed
- Player plays normally
- Spectating does not consume

### REFUNDING (Support/Admin)
- Append ledger entry (+N) and update balance
- Used for failed chargebacks, goodwill, system errors

## Required UI Signals
- Balance always visible in Profile (top area)
- Balance visible in Lobby header
- “Not enough sessions” modal directs to Purchase
- During CLOSING join: show “Spectating — no session cost”

## Ledger (minimum fields)
- id, playerRef, deltaSessions, reason, source, externalRef, createdAt
