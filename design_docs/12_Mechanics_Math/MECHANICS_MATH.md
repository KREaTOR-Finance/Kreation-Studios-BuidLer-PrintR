# PrintR Mechanics Math (v1 Locked)

This document defines the **exact simulation mechanics** for PrintR price ticks, demand influence, dynamic volatility/clamps, points, leverage, and Break Point.

**Core invariants**
- Tick cadence: **5 seconds**
- Randomness: **one VRF sample per tick per session**
- Supply tiers: **1M / 10M / 100M / 1B**
- Initial price: **1..100**
- Minimum price: **P_min = 0.01**
- Minimum hold: **1 tick**
- Max 1 open position per session per player
- Percent-based points: 1% move = `C * L` points
- Max leverage = 5x
- End-of-session: any open position is a **forfeit** (0 points, counted)

---

## 1) Notation

- `S` = supply (one of the tiers)
- `P_t` = price at tick `t`
- `MC_t = S * P_t` = conceptual market cap proxy
- `M` = market index (1..100), drawn once per session
- `A` = archetype (DEEP_POOL | STANDARD | THIN_FLOAT | WHIPSAW | TREND_DAY)

- `z_t ∈ [-1, +1]` = VRF-derived signed noise sample per tick
- `D_t ∈ [-1, +1]` = demand pressure (net long-short exposure)

---

## 2) Market regime multiplier (session-stable)

Map `M ∈ [1,100]` to `g(M) ∈ [0.70, 1.30]`:

\[
g(M)=g_{min} + (g_{max}-g_{min}) \left(\frac{M-1}{99}\right)^{\gamma}
\]

Constants:
- `g_min = 0.70`
- `g_max = 1.30`
- `gamma = 1.15`

---

## 3) Market-cap dampening

Reference market cap anchor:

- `MC_ref = 100,000,000`

Raw damp:

\[
d(MC)=\sqrt{\frac{MC_{ref}}{MC+\epsilon}}
\]

Clamped damp:

\[
d_c = clamp(d, 0.20, 3.00)
\]

Constants:
- `d_min = 0.20`
- `d_max = 3.00`
- `epsilon ≈ 1e-9`

---

## 4) Archetypes (v1 constants)

Each archetype defines base volatility `sigma0`, base demand coefficient `beta0`, and an archetype clamp multiplier `m_arch`.

| Archetype | sigma0 | beta0 | m_arch |
|---|---:|---:|---:|
| DEEP_POOL | 0.020 | 0.010 | 0.70 |
| STANDARD | 0.030 | 0.015 | 1.00 |
| THIN_FLOAT | 0.050 | 0.025 | 1.25 |
| WHIPSAW | 0.040 | 0.012 | 1.10 |
| TREND_DAY | 0.035 | 0.020 | 0.95 |

---

## 5) Demand pressure

Each open position contributes exposure:

- exposure = `C * L`, where
  - `C` = committed points (1..1000)
  - `L` = leverage (1..5)

Long and short exposure:

- `E_long = Σ exposure (LONG open positions)`
- `E_short = Σ exposure (SHORT open positions)`

Normalize:

\[
D_t = clamp\left(\frac{E_{long} - E_{short}}{N \cdot 1000}, -1, +1\right)
\]

Where `N` is active players in the session (stubbed at 25 in code; wire to room).

---

## 6) Dynamic per-tick clamp rMax

Clamp bounds:
- `R_lo = 0.01` (1% per tick)
- `R_hi = 0.10` (10% per tick)

\[
rMax_t = clamp\big(R_{hi} \cdot g(M) \cdot d_c(MC_t) \cdot m_{arch},\ R_{lo},\ R_{hi}\big)
\]

---

## 7) Tick return and price update

Compute coefficients:

- `sigma_t = sigma0(A) * g(M) * d_c(MC_t)`
- `beta_t  = beta0(A)  * g(M) * d_c(MC_t)`

Tick return:

\[
r_t = sigma_t z_t + beta_t D_t
\]

Apply clamp:

\[
r_t \leftarrow clamp(r_t, -rMax_t, +rMax_t)
\]

Update price:

\[
P_{t+1}=max(P_{min},\ P_t(1+r_t))
\]

---

## 8) Points (percent-based)

Directional sign:
- `dir = +1` for LONG
- `dir = -1` for SHORT

Unrealized points:

\[
pct = \frac{P_{now}-P_{entry}}{P_{entry}}
\]

\[
U = C \cdot L \cdot dir \cdot (pct \cdot 100)
\]

Realized on close is clamped by a cap:

- `cap(C,L) = C * L * 5`

\[
R = clamp(U, -cap, +cap)
\]

Score:
- `scoreRealized` accumulates realized closes and Break Point forced closes
- `scoreDisplay = scoreRealized + Σ U(open positions)`

---

## 9) Leverage + Break Point (5x max)

Stability budget:

\[
B = \frac{C}{L}
\]

Break Point triggers (forced close) if loss exceeds budget:

\[
max(0, -U) \ge B \cdot K
\]

Constant:
- `K = 1.0`

**Effect**
- Forced close at current tick
- Marks `wasBreakPoint = true`
- Applies realized delta `R` to `scoreRealized`
- **Does not consume a marker** (no extra ammo penalty)

---

## 10) Rules enforcement

- Min hold: cannot close until `tickIndex - entryTickIndex >= 1`
- Max 1 open position per session at a time (enforced in commit)
- End-of-session: any open position becomes a forfeit; losses apply, gains are zeroed (counted)

---

## Implementation note (VRF wiring)
Frontend currently uses deterministic PRNG as a placeholder for `z_t`.
When wiring Switchboard SRS:
- Replace `prngZ(seed, tickIndex)` with VRF-derived `z_t`.
- Preserve all clamps and coefficients exactly to maintain fairness.
