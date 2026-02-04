# Spectator + Closing Bottom Panel Layout (Authoritative)

## Core Principle
The **bottom panel** is the "order-flow zone" on mobile.
It must never be empty and must never show disabled controls as the primary UI.

---

## Bottom Panel by State / Role

### LIVE (Player)
Bottom panel shows normal **controls**:
- Direction (Long/Short)
- Commit size slider
- Primary action button (Commit / Close)
- No Crowd Tape
- No Pressure Board

---

### FINAL_COMMIT_WARNING (Player) – last 30s before closing
Bottom panel shows **controls**, plus an optional **Crowd Tape overlay/strip**:
- Controls remain functional (last chance to commit)
- Banner: `FINAL 30s — LAST CHANCE TO COMMIT`
- Crowd Tape ON (broker prints)
- Crowd Micro-Bias ON (mechanics only)

---

### CLOSING (Player) – last 2 minutes
Bottom panel is primarily the **Closing Pressure Board**, while preserving the **Close** action:
- Commits disabled (no commit UI)
- Close enabled
- Optional flag: Close at End Price (toggle)
- Persistent banner: `CLOSING — CLOSE OR FORFEIT`
- Pressure Board takes most of the panel
- Close button remains visible and accessible

Recommended layout:
- Pressure bars (Long vs Short)
- Close intent bars (Close Now vs Close at End)
- Break risk indicator
- [ CLOSE POSITION ] button

---

### CLOSING (Spectator) – joins in last 2 minutes
Bottom panel shows **Crowd Tape** (replacing where controls would normally be):
- No trade controls
- Tape is the primary content
- CTA: `Join next session` + countdown to next round

Recommended layout:
- Tape list (auto-fade prints)
- Countdown: `Next session starts in X:XX`
- [ JOIN NEXT SESSION ] button

---

### ENDED
Bottom panel is summary CTA:
- Show results / summary entry point
- Primary CTA: Play again / Join next live session

---

## Why this layout is correct
- The bottom panel is where players expect "action"
- Spectators should see **activity** not disabled controls
- Players in closing should see **risk + decision** (pressure board) and the **close** control
- Keeps the interface broker-authentic, fast, and self-explanatory
