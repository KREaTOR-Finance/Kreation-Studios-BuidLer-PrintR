# UI Spec — Badge Unlock Modal (Non-blocking)

## Purpose
Celebrate achievement without interrupting intense gameplay.

## Trigger
- Badge earned mid-session OR post-session summary.

## Rules
- Never blocks controls during live play
- Auto-dismiss after 1.8s (live play)
- Tap expands to detail sheet
- Queues up to 2 unlocks; collapses the rest into “+X more”

## Layout (Toast-Modal)
- Left: Badge icon (animated shimmer)
- Center: "Badge Unlocked" + Badge Name
- Right: small chevron / tap hint

## Components
- BadgeUnlock/Toast
- BadgeUnlock/QueueStack
- Shared/BottomSheet (BadgeDetail)

## Animation
- In: slide up 120ms
- Icon shimmer: 240ms
- Out: fade 160ms

## Sound/Haptics
- Single light “ding”
- One short haptic tap
- Respect global toggles
