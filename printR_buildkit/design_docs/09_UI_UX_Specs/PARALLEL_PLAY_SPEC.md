# PrintR — Parallel Play Spec (Focus + Grid)

## Modes
- FOCUS: 1 main chart + live thumbnails
- GRID: 2×2 charts

## Active chart
- Exactly one chart is armed for input at all times
- Active chart indicator: green square outline (soft glow)

## Input routing
- Commit/Close always route to active chart
- Slider routes to active chart
- Only active chart produces sound/haptics

## Grid actions
- Tap a chart tile → becomes active (green outline moves)
- Optional: tap active tile again → zoom to Focus
- Closes allowed from Grid for emergency speed; commits recommended from Focus
