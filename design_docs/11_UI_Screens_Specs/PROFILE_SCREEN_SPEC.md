# UI Screen Spec — Player Profile

## Purpose
Show identity, mastery, and progress at a glance. Encourage return play via goals.

## Layout (Mobile / Telegram)
**Header**
- Back
- Player handle (Telegram)
- Wallet short (0x123…abcd)
- Settings (sound/haptics toggle, privacy)

**Hero Panel**
- Avatar + frame (cosmetic)
- Title tag (e.g., "Grid Master")
- Rank pill: Season Rank + Lifetime Rank

**Stats Grid (2×3)**
- Lifetime Points
- Best Session
- Win Rate
- Avg Points / Marker
- Forfeits
- Break Points (cracked positions)

**Pinned Badges (max 6)**
- BadgeIcon grid
- Tap badge → BadgeDetailSheet (name, criteria, unlocked date)

**Pinned Trophies (max 3)**
- Trophy mini-cards
- Tap → TrophyCabinet screen

**Recent Sessions (last 10)**
- SessionRow: asset name, score, date, phase badge
- Tap → Post Session Summary (read-only)

## Components (Figma names)
- Profile/HeaderBar
- Profile/HeroCard
- Profile/RankPills
- Profile/StatTile
- Profile/BadgeGrid
- Profile/BadgeIcon
- Profile/TrophyStrip
- Profile/TrophyMiniCard
- Profile/RecentSessionList
- Shared/BottomSheet (BadgeDetail)

## States
- Loading (skeleton)
- Private mode (hide wallet + exact points)
- Empty trophies/badges (CTA: “Earn your first badge”)

## Animations
- Badge hover/tap: 120ms scale + glow
- Trophy tap: subtle shimmer 200ms

## Navigation
- Profile → Trophy Cabinet
- Profile → Leaderboards
- Profile → Post Session Summary
