# PrintR — React + Telegram Mini App Component Map

## Stack
- React + TypeScript
- Telegram Mini App WebView (Telegram.WebApp)
- Solana wallet connect (later) — keep interface clean
- State: reducer-based state machine (no heavy deps required)

## Screens
- `HomeScreen`
  - `TopStats`
  - `DirectionSelector`
  - `RiskTierSelector`
  - `PrimaryCTA` (Play 1 Token)
- `LiveRoundScreen`
  - `TopStats`
  - `LiveChart`
  - `CountdownRing`
  - `RoundHint`
- `ResultScreen`
  - `ResultBanner` (Win/Miss)
  - `PointsDelta`
  - `StreakDelta`
  - `NextRoundCTA`
- `ProgressScreen`
  - `DailyObjectives`
  - `ProgressBars`
  - `UnlockCarousel`
- `GovernanceScreen`
  - `GovBalance`
  - `ProposalList`
  - `WeightedVoteMeter`
- `StoreScreen`
  - `CreditPacks`
  - `CheckoutStripe`
  - `CheckoutCrypto`
- `ProfileScreen`
  - `Avatar`
  - `Nickname`
  - `StatsGrid`

## Shared Components
- `Card`, `Button`, `Chip`, `Toast`, `Modal`
- `SoundProvider` + `useSound()`
- `Haptics` wrapper + `useHaptics()`
- `useTelegramTheme()` (optional)

## State Machine (high level)
States:
- `home` → `live` → `result` → `home`
- Side routes: `progress`, `governance`, `store`, `profile`

Events:
- `PLAY_REQUESTED`
- `ROUND_STARTED`
- `ROUND_TICK`
- `ROUND_RESOLVED` (win/miss)
- `ACK_RESULT`
- `NAVIGATE`

Round timing:
- 5–8 seconds default
- VRF on-chain resolution later is async; for now simulate with `pending` then resolve.

- `VaultScreen` (Prize Vault)
- `LeaderboardScreen`
- `HistoryScreen`

VRF Settlement Interface:
- `src/state/vrf.ts` (adapter interface + Sim adapter)
- `useGameMachine` now uses async request→pending→fulfill→derive→resolve flow
