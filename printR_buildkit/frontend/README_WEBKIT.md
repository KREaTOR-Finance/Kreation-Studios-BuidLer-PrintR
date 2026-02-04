# Kreation Studios Games (Web Shell) + PrintR (React App)

## Run locally
From `printR_buildkit/frontend`:

1) Install
```bash
npm install
```

2) Configure API base (optional)
Create `.env.local`:
```bash
VITE_API_BASE=http://localhost:3001
```

3) Start dev server
```bash
npm run dev
```

Open:
- Site: `http://localhost:5173/`
- PrintR: `http://localhost:5173/printr`
- PrintR Landing: `http://localhost:5173/printr/landing`

## Telegram (temporary)
Telegram Mini Apps require HTTPS.
Use ngrok / Cloudflare Tunnel / Vercel preview, and point to:
- `https://<https-url>/printr`
