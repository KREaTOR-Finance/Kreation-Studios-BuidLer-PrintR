# BuidLer PrintR — Ultimate All-In Kit v2 (Progression)

Includes:
- Build shell (React + Telegram) + Solana trajectory scaffolding
- Switchboard SRS program-enforced randomness scaffold
- Complete game design pack
- UI/UX specs (Figma component map + play + parallel + micro animations)
- Frontend state machine (parallel play + commit/close routing)
- Player progression system (badges, trophies, leaderboards, rewards, profile)

## Key paths
- printR_buildkit/frontend/src/state/gameMachine.ts
- design_docs/09_UI_UX_Specs/
- design_docs/10_Player_Progression/

## Added: UI Screens Specs
- design_docs/11_UI_Screens_Specs (profile, trophy cabinet, leaderboards, badge unlock modal, post-session and post-season summaries)

## Added: Mechanics Math (v1 locked)
- design_docs/12_Mechanics_Math/MECHANICS_MATH.md
- frontend mechanics implemented in printR_buildkit/frontend/src/state/gameMachine.ts

## v5 Additions (Trust-first MVP)
- Backend scaffold + VRF queue + mechanics tests: printR_buildkit/backend
- TradingView-like chart component: printR_buildkit/frontend/src/components/charts/TradingViewLikeChart.tsx
- Kickoff docs: design_docs/13_Engineering_Kickoff/
