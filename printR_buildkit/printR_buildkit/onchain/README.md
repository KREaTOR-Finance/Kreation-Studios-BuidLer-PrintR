# PrintR On-Chain (Solana) — Program-Enforced Settlement (Switchboard SRS)

This kit is wired for Switchboard's **Solana Randomness Service** (SRS) using the official `solana-randomness-service` crate.

- Program ID: `RANDMo5gFnqnXJW5Z52KNmd24sAo95KAd5VbiCtq5Rh` citeturn1view0turn1view1
- Lifecycle: CPI `simple_randomness_v1` → oracle fulfills → invokes callback with randomness bytes appended. citeturn1view0

## Where to look
- Anchor program: `/onchain/anchor/programs/printr/src/lib.rs`
- Wiring notes: `/onchain/SRS_WIRING_NOTES.md`
- Frontend flow: `/frontend/src/state/PROGRAM_ENFORCED_FLOW.md`
