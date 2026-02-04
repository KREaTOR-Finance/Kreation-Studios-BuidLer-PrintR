# Store Screen Spec — Session Credits (Stripe)

## Purpose
Allow players to purchase **session credits** quickly, with minimal friction, from mobile Telegram.

## Pricing (locked)
- 1 USDC = 4 sessions (reference pricing)
- Stripe bundles:
  - $10 → 40 sessions (minimum)
  - $100 → 500 sessions (best value)

## UI Requirements
- Display current **Sessions balance** at top (same as lobby header)
- Two primary packs:
  - Minimum Pack (40 / $10)
  - Bulk Pack (500 / $100)
- Purchase button states:
  - idle
  - busy: “Opening Checkout…”
  - error: show message unobtrusively
- “Refresh balance” button (debug + user confidence)

## Flow
1. Player taps pack
2. Frontend calls `POST /api/payments/stripe/checkout` with `{ bundle }`
3. Backend returns `{ url }`
4. Telegram WebApp uses `openLink(url)` if available, else `window.location.href = url`
5. Stripe completes → webhook credits the user
6. User returns → Store and Profile show updated balance

## Non-goals (v1)
- No refunds UI
- No promo codes UI (Stripe supports allow_promotion_codes server-side)
- No crypto checkout UI (USDC rails can be added later)
