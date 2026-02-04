# PrintR — Figma Component Map (Mobile + Parallel Play)

## Screens
- S1 Lobby (Sessions List)
  - Lobby/HeaderBar
  - Lobby/CreditPill
  - Lobby/PointsPill
  - Lobby/SessionCard (x4 live)
  - Lobby/SessionListTabs (LIVE / UP NEXT / RECENT / CREATE)
  - Lobby/SessionRow (for lists)
  - Lobby/PrimaryCTA (BUY CREDITS / CREATE ASSET)
- S2 Play (Focus View: 1 main + thumbs)
  - Play/TopHUD
  - Play/Chart/Main
  - Play/Chart/ThumbStrip
  - Play/ControlDeck
  - Play/CommitSlider
  - Play/MarkerAmmo
- S3 Play (Grid View: 2×2)
  - Play/Grid/ChartTile (x4)
  - Play/Grid/ActiveOutline
  - Play/Grid/TileBadge (timer + phase)
  - Play/ControlDeck (reused)
- S4 Asset Create
  - AssetCreate/StepHeader
  - AssetCreate/ImageUploader
  - AssetCreate/TextField
  - AssetCreate/SocialField
  - AssetCreate/StylePicker
  - AssetCreate/SupplyPicker
  - AssetCreate/PreviewCard
  - AssetCreate/PublishCTA

## Tokens / Variables (Figma)
### Color tokens
- bg/0, bg/1
- fg/primary, fg/muted
- accent/session
- state/positive (green)
- state/negative (red)
- state/warn (amber)
- state/activeOutline (green outline)

### Motion tokens
- motion/instant: 80–120ms
- motion/quick: 160–220ms
- motion/feedback: 240–420ms
- motion/chartTick: 5000ms cadence (eased between ticks)

### Glass tokens
- glass/blurSm (HUD backing)

## Core Components
### Play/TopHUD (top-left scoreboard overlay)
Rows:
- PriceRow (large, neutral)
- ScoreRow (animates up/down, green/red flash)
- MarkersRow (ammo)
- TimerRow (MM:SS; amber at 2:00; red at 0:30)
Variants:
- Phase=LIVE|CLOSING|ENDING
- MarkersState=Normal|Low|FinalCloseRequired

### ChartFX
- CommitSonar: ring expand once + lightning tick + fade to ghost
- CloseGain: green +$ float up
- CloseLoss: red -$ float down

### Play/ControlDeck (bottom)
- CommitButton
- CloseButton
- ModeToggle (FOCUS/GRID)
- HintLine (FINAL MARKER – CLOSE REQUIRED)

### Play/CommitSlider
- Vertical slider 0–1000
- Snap points: 100/250/500/750/1000
- Release = commit
