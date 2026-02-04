# PrintR — Mobile Play Screen Spec (Telegram-First)

## Layout
- Chart Area: ~65–70% height (hero)
- Top-left HUD overlay: Price, Score, Markers, Timer, Phase
- Bottom Control Deck: Commit, Close, Mode Toggle, Hint Line
- Commit Slider: vertical; appears above Commit; release=commit

## Tick cadence
- Price updates every 5 seconds
- Smooth easing between ticks
- Direction+amplitude driven by game mechanics + on-chain randomness

## Commit FX (on chart)
- Sonar ring expands once + lightning tick + fade to ghost marker

## Close FX (on chart)
- Gain: green +$ with upward float
- Loss: red -$ with downward float

## Close rules
- Final 2 min: closing phase (commit disabled, close allowed)
- Any open commit at session end (or leaving) = 0 points for that commit (forfeit)
- Final marker warning: if open exists and markersRemaining==1 → show “FINAL MARKER – CLOSE REQUIRED”
