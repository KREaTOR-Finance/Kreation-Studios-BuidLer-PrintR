# Local Testing + Temporary Launch URLs (Before Domain Purchase)

## Local web dev
- Web (Vite): `http://localhost:5173`
- Backend API: `http://localhost:3001`

Set in frontend `.env.local`:
- `VITE_API_BASE=http://localhost:3001`

## Temporary HTTPS for Telegram Mini App
Telegram requires HTTPS for Mini Apps. Until a domain is purchased, use one of:
- ngrok: exposes local `5173` over HTTPS
- Cloudflare Tunnel
- Vercel preview deployment

Point your Telegram Mini App URL to:
- `https://<temporary-https>/printr`

The app will auto-detect Telegram host mode via:
- `window.Telegram.WebApp.initData`
