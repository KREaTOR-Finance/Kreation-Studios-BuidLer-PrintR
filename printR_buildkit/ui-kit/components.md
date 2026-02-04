# PrintR — UI Kit (Senior Designer Spec)

## Component list (build as Figma Components)

### 1) pr/Button/Primary
- Height: 56
- Radius: 14
- Padding: 16 (H) / 14 (V)
- Fill: gradient (blue → purple)
- Text: ALL CAPS, 16/600
- States:
  - Default: subtle glow blue
  - Hover: brighter edge
  - Pressed: scale 0.96, glow intensifies
  - Disabled: 35% opacity, no glow

### 2) pr/Button/Secondary
- Height: 52
- Border: 1px rgba(255,255,255,0.10)
- Fill: rgba(255,255,255,0.04)
- State glow: purple on hover

### 3) pr/Button/Chip
- Height: 40
- Radius: 999
- Used for small selections

### 4) pr/DirectionButton/Up + Down
- Height: 64
- Radius: 14
- Up: green glow, arrow icon
- Down: red glow, arrow icon
- Press feedback: haptic + subtle scale

### 5) pr/RiskTierCard/Safe|Bold|Legend
- Card: 120×72 (in row), radius 14
- Selected: strong glow
- Copy:
  - SAFE — “Consistent”
  - BOLD — “Precise”
  - LEGEND — “Elite”
- Legend accent: gold highlight (#FBBF24 optional) but keep restrained

### 6) pr/TopStat/Points + Streak
- Compact pill with icon
- Mono-ish numbers (tabular)
- 12–14px

### 7) pr/Chart/LiveLine
- Frame: 100% width, 220–260 height
- Neon line + subtle grid dots
- No axes labels (emotion over analytics)

### 8) pr/CountdownRing
- Diameter: 44
- Stroke: teal
- Text: remaining seconds

### 9) pr/ResultBanner/Win + Miss
- Win: green, confetti burst
- Miss: red, calm fade
- Add “why” line under headline (builds mastery)

### 10) pr/ProgressBar
- Height: 10
- Glow: teal
- Show % to next unlock

### 11) pr/Toast
- Top-center, 320w, 44h, subtle blur

### 12) pr/Modal/Confirm
- Used for purchases / confirmations

## Icon style
- Line icons, 2px stroke
- Corners rounded
- Keep crypto “futuristic” vibe
