# Stripe Webhook Rules (Authoritative)

## Required Stripe Settings
- Use Stripe Checkout
- Include `playerRef` in checkout `metadata`
- Include `bundle` in checkout `metadata`

## Events
Handle at minimum:
- `checkout.session.completed` → credit sessions
Optionally:
- `charge.refunded` → reverse sessions if policy requires

## Security
- Verify signature using `STRIPE_WEBHOOK_SECRET`
- Use raw body (do not JSON parse before verification)

## Idempotency
- Use Stripe `event.id` as `external_ref` in ledger
- Reject duplicates by unique constraint or lookup

## Credit math
- `BUNDLE_10` adds +40 sessions
- `BUNDLE_100` adds +500 sessions
