# Kreation Studios Games Web Kit (React-First) — Scope + Sprint Order

## Goal
A single-brand system where:
- Kreation Studios Games is the public website surface
- PrintR is the premier playable web app under `/printr`
- Telegram is a launch surface that loads the same app with minimal host controls

## Host Modes
- `web` (default)
- `telegram` (detected via `window.Telegram.WebApp.initData`)

Host bridge file:
- `frontend/src/host/hostBridge.ts`

## Sprint 1 — Web Shell
- Home `/`
- PrintR Landing `/printr/landing`
- Games `/games`
- About `/about`
- Support `/support`
- Global nav/footer
- Design tokens: `frontend/src/theme/tokens.ts`
- CTA: “Play PrintR” routes to `/printr`

## Sprint 2 — PrintR Web App Wiring
- Lobby `/printr` (existing)
- Header balance pill (existing)
- Store `/printr/store` (existing)
- Profile `/printr/profile` (existing)
- Play screen scaffold `/printr/play/:sessionId` (existing)
- Leaderboards `/printr/leaderboards` (existing)

## Sprint 3 — Telegram Host Bridge
- `useHost()` hook
- Telegram ready/expand + openLink wrapper
- optional haptics wrappers
- backend middleware for initData verification (future, when ready)

## Local Testing (until domain purchase)
Use local URLs:
- Web: `http://localhost:5173`
- API: `http://localhost:3001` (set via `VITE_API_BASE`)

Telegram Mini App can point to a temporary HTTPS URL (ngrok / Cloudflare tunnel / Vercel preview).
