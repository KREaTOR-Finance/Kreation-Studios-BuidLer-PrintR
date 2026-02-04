# Test Plan (Trust-first MVP)

## Unit tests
- Mechanics constants match spec
- market regime multiplier bounds
- mc damp clamp bounds
- computeTickReturn clamps within +/- rMax
- nextPrice respects P_MIN
- Break Point threshold (loss >= C/L, K=1.0) – (implemented in mechanics module)
- realized points cap clamp

## Integration tests (backend)
- 4 sessions exist and tick every 5 seconds when VRF queue has samples
- VRF queue maintains 3 buffered samples per session
- OPEN rejected during CLOSING/ENDED
- CLOSE rejected before min-hold (1 tick)
- End-of-session forfeits open positions (MVP next step: implement end settlement + summary)
