# UI: VRF Badge Integration (tiny confidence UI)

Component:
- `frontend/src/components/vrf/VrfProofBadge.tsx`

Usage example inside the Play screen HUD (top-left cluster):

```tsx
const { ticks, hud, lastVrf } = useSessionFeed(ws, sessionId);

<div className="hudTopLeft">
  <Scoreboard ... />
  <VrfProofBadge vrf={lastVrf} />
</div>
```

Guidance:
- keep it tiny (22x22)
- does not distract, but gives players confidence + inspectability
- can be hidden behind a long-press if you want an even cleaner HUD
