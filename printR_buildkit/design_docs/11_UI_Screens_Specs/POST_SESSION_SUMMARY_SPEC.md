# UI Screen Spec — Post Session Summary

## Purpose
Immediate loop closure: show results, highlights, and drive replay.

## Layout
**Header**
- Back to Lobby
- "Session Summary"

**Score Hero**
- Final score
- Rank within session (if available)
- Session badge (asset name + archetype)
- “Replay / Join Next” CTA

**Highlights**
- Best close (+points)
- Worst close (-points)
- Points per marker
- Break Points count
- Forfeits (if any) with warning explanation

**Timeline Mini Chart**
- Small chart of session price with markers (commit/close)
- Tap → expands read-only full chart replay

**Earned**
- Badges earned this session (icons)
- Trophy earned (if any)

**Next Actions**
- Join another live session
- Switch to parallel play
- Create an asset (if credits)

## Components
- Summary/HeaderBar
- Summary/ScoreHero
- Summary/HighlightsGrid
- Summary/MiniChartReplay
- Summary/EarnedStrip
- Summary/PrimaryCTAStack

## Animation
- Score count-up 500ms
- Earned icons pop 120ms each
