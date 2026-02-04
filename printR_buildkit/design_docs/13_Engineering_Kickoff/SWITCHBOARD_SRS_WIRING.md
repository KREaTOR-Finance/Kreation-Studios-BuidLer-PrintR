# Switchboard SRS (On-Demand Randomness) Wiring Notes

Included in this kit:
- `printR_buildkit/backend/src/vrf/switchboardSrsProvider.ts`

## What you need to implement
The provider is intentionally a skeleton:
- Create/initialize a Switchboard Randomness account per session
- Commit -> reveal -> read randomness bytes
- Convert bytes into `z ∈ [-1,+1]` deterministically
- Return `proofRef` (e.g., reveal tx signature + randomness account pubkey + slot)

## Required env vars
- `USE_SWITCHBOARD_VRF=true`
- `SOLANA_RPC_URL=...`
- `SOLANA_PAYER_SECRETKEY_BASE58=...` OR `SOLANA_PAYER_KEYPAIR_PATH=...`

## Recommended approach for 5-second ticks
We already designed the system around buffering:
- Use `VrfQueue` depth=3
- Pre-commit multiple future slots per session
- Reveal per tick
