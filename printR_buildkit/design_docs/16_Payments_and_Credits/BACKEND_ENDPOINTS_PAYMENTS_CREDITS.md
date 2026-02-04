# Backend Endpoints — Payments & Credits (Build Contract)

Base URL: backend server

## Auth / Identity
Frontend must send one of:
- `x-printr-player: tg:<telegram_user_id>`
Optionally:
- `x-printr-wallet: <solana_pubkey>`

Backend treats `x-printr-player` as the authoritative PlayerRef.

---

## GET /api/credits/balance
Returns current sessions balance for PlayerRef.

Response:
```json
{ "playerRef":"tg:123", "sessionsBalance": 40 }
```

---

## POST /api/sessions/:sessionId/join
Consumes **1 session credit** only if joinable (LIVE or FINAL_COMMIT_WARNING).
If session is in CLOSING, returns spectator response (0 credits).

Request body:
```json
{ "mode": "play" }
```

Response (play):
```json
{ "join":"play", "sessionId":"...", "sessionsBalance": 39 }
```

Response (spectate):
```json
{ "join":"spectate", "sessionId":"...", "phase":"CLOSING", "sessionsBalance": 40 }
```

Errors:
- 402 `INSUFFICIENT_SESSIONS`
- 409 `SESSION_NOT_JOINABLE`

Idempotency:
- Client sends `Idempotency-Key` header (uuid) per join attempt.

---

## POST /api/payments/stripe/checkout
Creates Stripe Checkout session for a bundle.

Request:
```json
{ "bundle": "BUNDLE_10" }
```

Bundles:
- `BUNDLE_10` → +40 sessions ($10)
- `BUNDLE_100` → +500 sessions ($100)

Response:
```json
{ "checkoutUrl": "https://checkout.stripe.com/..." }
```

---

## POST /webhooks/stripe
Stripe webhook receiver (raw body verification).
On `checkout.session.completed`:
- Look up `playerRef` from metadata
- Apply ledger entry + update balance

Response:
- 200 OK on valid signature
