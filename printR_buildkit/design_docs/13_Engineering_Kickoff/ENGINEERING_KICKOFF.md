# Engineering Kickoff Pack (Trust-first MVP, Hybrid Authority)

## Decisions locked
- Authority: Hybrid (server-authoritative ticks + on-chain VRF per tick per session)
- Build plan: Trust-first MVP (VRF day 1)
- Chart: TradingView **Lightweight Charts** (TradingView-like look)

## Generated in this kit
1) Backend scaffold: `printR_buildkit/backend`
2) VRF queue: `printR_buildkit/backend/src/vrf`
3) Mechanics (locked constants): `printR_buildkit/backend/src/engine/mechanics.ts`
4) Frontend wiring stubs for chart + WS: `printR_buildkit/frontend/src/components/charts/TradingViewLikeChart.tsx`
5) Test plan + mechanics unit tests: `printR_buildkit/backend/src/engine/mechanics.test.ts` and `design_docs/13_Engineering_Kickoff/TEST_PLAN.md`
