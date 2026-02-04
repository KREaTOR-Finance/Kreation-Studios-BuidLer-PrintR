# Switchboard Solana Randomness Service (SRS) — Wiring Notes

Key facts:
- Program ID: `RANDMo5gFnqnXJW5Z52KNmd24sAo95KAd5VbiCtq5Rh` citeturn1view0turn1view1
- CPI call: `solana_randomness_service::cpi::simple_randomness_v1(...)` citeturn1view0
- Callback is invoked by the oracle; randomness bytes are appended to instruction data. citeturn1view0

## In PrintR
### request_round
- Initializes `Round` PDA as Pending
- Builds callback instruction for `settle_round`
- Calls SRS CPI with:
  - request, escrow, state, mint, payer, system_program, token_program, associated_token_program citeturn1view0

### settle_round
- Validates:
  - request pubkey matches `Round.sb_request`
  - SRS program id matches
- Parses first 32 bytes from appended randomness
- Deterministically maps randomness → WIN/MISS
- Writes settlement to Round + updates PlayerProfile
