# UI Screen Spec — Post Season Summary

## Purpose
Seasonal retention: recap, prestige, and motivate next season participation.

## Layout
**Header**
- Back
- "Season Recap"
- Season label (e.g., Season 3)

**Hero**
- Final season rank
- Total season points (weighted + raw)
- Top badge earned
- Top trophy earned

**Performance Breakdown**
- Sessions played
- Win rate
- Avg points per marker
- Best session score
- Break rate / Forfeit rate

**Awards**
- Seasonal trophies earned
- Seasonal badges (if any)
- Titles unlocked

**Creator Stats (if applicable)**
- Assets created
- Total joins
- Retention score
- Quality score

**CTA**
- “Enter New Season”
- “View Leaderboards”
- “Share Recap” (Telegram share card)

## Components
- SeasonSummary/HeaderBar
- SeasonSummary/HeroRankCard
- SeasonSummary/StatsGrid
- SeasonSummary/AwardsGrid
- SeasonSummary/CreatorPanel
- SeasonSummary/CTAStack
- SeasonSummary/ShareCard

## Notes
- Keep share card optional; do not gate progress.
- Share content should avoid money language: points/skill only.
