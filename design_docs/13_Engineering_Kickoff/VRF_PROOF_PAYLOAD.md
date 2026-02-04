# VRF Proof Payload (UI-facing)

Goal: give players a tiny, confidence-building way to verify the randomness behind each tick.

## Payload shape (per tick)
This is attached to `TICK.vrf.proof` (optional until Switchboard wiring is complete):

```json
{
  "provider": "switchboard",
  "randomnessAccount": "....",
  "commitTxSig": "....",
  "revealTxSig": "....",
  "committedSlot": 123,
  "revealedSlot": 126,
  "outputHex": "0x....",
  "fetchedAtMs": 1700000000000
}
```

## Mapping randomness -> z
We deterministically map randomness bytes to `z ∈ [-1, +1]`:

- Take first 8 bytes as `u64` big-endian
- `u = u64 / 2^64` in `[0,1)`
- `z = 2u - 1` in `[-1,1)`

This is implemented in:
- `backend/src/vrf/switchboardSrsProvider.ts` → `bytesToSignedUnit(bytes)`
