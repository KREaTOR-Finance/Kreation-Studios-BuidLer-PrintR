# Closing Phase State Machine (Authoritative) – Updated w/ Crowd Tape

Session duration: 20 minutes  
Tick cadence: 5 seconds

## States

### LIVE
- Commits allowed
- Closes allowed
- Crowd Tape: OFF
- Crowd Micro-Bias: OFF

### FINAL_COMMIT_WARNING (T-30s before CLOSING)
- Banner: "FINAL 30s — LAST CHANCE TO COMMIT"
- Commits allowed
- Crowd Tape: ON (see CROWD_TAPE_SPEC)
- Crowd Micro-Bias: ON (see CROWD_MICRO_BIAS_MECHANICS)

### CLOSING (Last 2 minutes)
- Commits disabled
- Closes enabled
- Banner: "CLOSING — CLOSE OR FORFEIT"
- Optional flag: Close at End Price
- Crowd Tape: OFF
- Crowd Micro-Bias: OFF

### ENDED
- Final price locked
- Settlement:
  - Closed manually → realized score
  - Close at End Price → realized at final price
  - Open without close → FORFEIT (0 points)

## Join Rules (Recap)
- LIVE / FINAL_COMMIT_WARNING: new players may join and play
- CLOSING: new players join as spectators (controls disabled)
