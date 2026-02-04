# Lobby Header — Sessions Balance

## Requirement
The lobby header (Home view) MUST show the user’s **Sessions** balance.

## Display
- Add a third stat pill:
  - Label: `Sessions`
  - Value: integer sessions
  - Loading: `—`

## Data
- Call `GET /api/credits/balance` with header `x-printr-player`
- Refresh:
  - on screen mount
  - on return from Store screen (manual refresh button OK for MVP)

## Behavior
- If balance is 0:
  - join/play CTA should route to Store screen
- If API error:
  - display `—` and keep UI functional
