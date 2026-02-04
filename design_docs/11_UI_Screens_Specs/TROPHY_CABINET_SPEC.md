# UI Screen Spec — Trophy Cabinet

## Purpose
Prestige display and pinning control. Reinforces scarcity and achievement.

## Layout
**Header**
- Back
- "Trophy Cabinet"
- Filter button (All / Season / Performance / Creator)

**Pinned Section**
- 3 slots (pinned trophies)
- Drag-to-reorder (optional)
- Tap slot → select trophy modal

**Trophy Grid**
- TrophyCard with:
  - Icon/illustration
  - Name
  - Rarity tag (Common/Rare/Epic/Legendary)
  - Earned date
  - Season badge (if seasonal)

**Trophy Detail (Bottom Sheet)**
- Large art
- Description
- Earned criteria
- Earned timestamp
- Button: Pin / Unpin

## Components
- TrophyCabinet/HeaderBar
- TrophyCabinet/PinnedSlots
- TrophyCabinet/TrophyGrid
- TrophyCabinet/TrophyCard
- TrophyCabinet/TrophyDetailSheet

## States
- No trophies: show “Play sessions to earn trophies” + CTA to Live Sessions
- Seasonal expired: display in History tab (still visible, not pinnable if you choose)

## Animations
- Pin action: 180ms snap + glow
- Trophy grid: stagger in 20ms per card (lightweight)
