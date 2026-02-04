# DV — Web Kit Architecture (Kreation Studios Games + PrintR)

## Goal
A single React build that can be opened:
- directly as a website
- from Telegram as a Mini App

## Why one build
- One brand system and consistent UI
- No duplication of PrintR UI for Telegram vs web
- Host bridge swaps small behaviors (openLink/haptics/identity source)

## Key files
- `frontend/src/RouterApp.tsx` — routes and shells
- `frontend/src/layouts/SiteLayout.tsx` — global nav/footer
- `frontend/src/theme/tokens.ts` — shared tokens (site + app)
- `frontend/src/host/hostBridge.ts` — host mode detection + helpers
- `frontend/src/printr/PrintrShell.tsx` — PrintR app mounted under `/printr`

## Host behaviors
- Telegram: uses `Telegram.WebApp.openLink` and Telegram haptics when available
- Web: uses browser navigation and `navigator.vibrate` fallback
