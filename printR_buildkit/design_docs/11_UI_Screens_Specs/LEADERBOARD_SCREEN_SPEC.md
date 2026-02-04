# UI Screen Spec — Leaderboards

## Purpose
Competitive retention engine across multiple dimensions (session, timeboxed, skill, creator).

## Layout
**Header**
- Back
- "Leaderboards"
- Season selector (Current / Past)

**Tabs**
- Session
- Daily / Weekly / Monthly
- Skill
- Creator

**Filters (contextual)**
- For Session: choose active session (asset) dropdown
- For Timeboxed: Daily/Weekly/Monthly segmented
- For Skill: metric dropdown (Win Rate / Avg Pts per Marker / Break Rate / Forfeit Rate / Leverage Efficiency)
- For Creator: metric dropdown (Joins / Retention / Quality)

**Leaderboard List**
Row contains:
- Rank number
- Avatar
- Handle
- Score/metric
- Badge strip (max 3)
- Trophy icon (if pinned)

**Sticky “You” Row**
Always shows player rank + ±2 neighbors (when possible).

## Components
- Leaderboard/HeaderBar
- Leaderboard/SeasonPicker
- Leaderboard/Tabs
- Leaderboard/FilterBar
- Leaderboard/Row
- Leaderboard/YouStickyRow

## States
- Loading skeleton
- Empty (new season): “Be the first to set a record”
- Privacy: show anonymized handles if user opts out

## Interaction
- Tap row → opens mini profile card (or full profile)
- Long press row → “View badges” quick sheet
