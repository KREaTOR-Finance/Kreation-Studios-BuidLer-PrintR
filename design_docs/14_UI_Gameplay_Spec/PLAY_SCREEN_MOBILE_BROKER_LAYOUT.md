# Play Screen – Mobile Broker Layout (Final)

## Core Principle
The play screen must read like a **professional broker terminal** optimized for mobile:
- Chart dominates attention
- Decisions feel weighted
- Actions are fast, deliberate, and irreversible

## Screen Structure

### Upper Zone (≈65–70%)
Chart + Primary HUD
- TradingView-style line chart
- Live price (dominant)
- Player score (dominant)
- Unrealized P&L strip (entry → current)
- Time remaining / phase indicator
- Minimal VRF proof badge (ⓘ)

Rule: Price movement and score movement must animate together.

### Lower Zone (≈30–35%)
Action Console
- Direction toggle (Long / Short)
- Commit size slider
- Primary action button:
  - COMMIT (no open position)
  - CLOSE (open position)
- Two-step interaction:
  - Tap + hold ≈200ms to arm
  - Release to execute

No scrolling. No popups during live play.

## FINAL_COMMIT_WARNING (Last 30s)
- Banner: FINAL 30s — LAST CHANCE TO COMMIT
- Optional overlay: Crowd Tape (broker prints)
- Mechanics: Crowd Micro-Bias may apply (capped)
