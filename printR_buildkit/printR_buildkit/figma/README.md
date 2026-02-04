# PrintR — Figma File Build Instructions (Master)

You asked for “build the file first.” Since I can’t directly publish into your Figma workspace from here,
this folder contains **everything needed to recreate the master Figma file in minutes**.

## What you get
- `ui-kit/tokens.json` — Design tokens (Tokens Studio compatible JSON)
- `frontend/src/styles/tokens.css` — CSS variables matching the tokens
- `ui-kit/components.md` — Senior-designer component specs (sizes, padding, states)
- `figma/frames.md` — Screen frames + layout rules + auto-layout settings

## How to create the Figma file (fast)
1. In Figma, create a new file named: **BuidLer PrintR — Master UI**
2. Create pages:
   - `00 Foundations`
   - `01 Components`
   - `02 Screens`
   - `03 Prototypes`
   - `99 Archive`
3. If you use **Tokens Studio**:
   - Import `ui-kit/tokens.json` into Tokens Studio
   - Apply tokens to styles (Color styles, Text styles, Effects)
4. Create frame presets (Telegram Mini App):
   - Primary: **390×844** (iPhone 14-ish, safe default)
   - Secondary: **360×800** (Android baseline)

Then use `figma/frames.md` + `ui-kit/components.md` to build the frames/components exactly.

## Naming conventions (important)
- Components: `pr/ComponentName/Variant`
- Styles: `pr/color/*`, `pr/type/*`, `pr/effect/*`, `pr/radius/*`
- Spacing scale: 4, 8, 12, 16, 20, 24, 32
