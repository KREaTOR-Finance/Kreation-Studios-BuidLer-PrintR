# PrintR — Switchboard Per-Session VRF (Dev)

This backend supports **1× Switchboard on-demand randomness per session**.

Goals:
- Unpredictable during the session (players cannot simulate the future)
- Verifiable after the session (anyone can recompute tick randomness)
- No per-tick on-chain randomness cost

## Setup (devnet)

1) Install deps

```bash
cd printR_buildkit/backend
npm install
```

2) Generate a devnet keypair (DEV ONLY)

```bash
npm run keypair:gen:devnet
```

Fund the printed pubkey with devnet SOL.

3) Create `.env`

```env
USE_SWITCHBOARD_VRF=true
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed
PRINTR_KEYPAIR_PATH=.secrets/devnet-keypair.json
SOLANA_EXPLORER_CLUSTER=devnet
```

4) Run backend

```bash
npm run dev
```

## Proof endpoint

- `GET /api/sessions/:sessionId/proof`
  - During LIVE/CLOSING: returns commitment + Switchboard refs, **no secret**
  - After ENDED: also returns `serverSecretHex` reveal

## Local verification (post-session)

```bash
node scripts/verify-session-proof.mjs <sessionId> http://localhost:3001/api/sessions/<sessionId>/proof
```
