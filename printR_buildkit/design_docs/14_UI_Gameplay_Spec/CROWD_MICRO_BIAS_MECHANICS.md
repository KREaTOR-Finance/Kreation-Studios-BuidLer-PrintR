# Crowd Micro-Bias (Final 30s Only)

## Goal
Allow the crowd to **slightly** influence last-moment price direction without overpowering:
- VRF randomness
- archetype volatility
- player skill

## When active
Only during `FINAL_COMMIT_WARNING` (T-30s → T-0).

## Inputs
Compute net exposure across all players who have committed in this session:

- `E_long = Σ (commitPoints * leverage)` for LONG commits
- `E_short = Σ (commitPoints * leverage)` for SHORT commits
- `E_total = E_long + E_short`

`netPressure = (E_long - E_short) / max(E_total, ε)` where ε prevents divide-by-zero.

## Bias function
- `biasMax = 0.05` (5% max probability shift)
- `bias = clamp(netPressure * biasMax, -biasMax, +biasMax)`

## Application
If baseline up-move probability is `p_up_base`:
- `p_up = clamp(p_up_base + bias, 0.01, 0.99)` during FINAL_COMMIT_WARNING.

Everything else stays unchanged (VRF magnitude, rMax, damp, archetype σ).
