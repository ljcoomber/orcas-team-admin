---
name: orcas-fixtures
description: Fetch fixtures, results, and league table for Wheathampstead Wanderers Youth U13 Orcas. By default reads upcoming fixtures from Google Sheets (fast). Use FA Full-Time website only for live/fresh checks, results, or league table.
allowed-tools: Bash(agent-browser:*), mcp__nanoclaw__sheets_list_fixtures
---

# Wheathampstead Wanderers Youth U13 Orcas — FA Full-Time Data Fetcher

By default, fetch upcoming fixtures from Google Sheets (fast). Only use agent-browser to fetch from FA Full-Time if the user asks for a live/fresh check, or for results and league table.

> ⚠️ **2025-26 season IDs not yet available.** The Hertfordshire Girls Football Partnership League had not published U13 team/division/season details on FA Full-Time as of 2026-08-31. The live-lookup URLs below still use last season's U12 placeholders and **will fetch the wrong team's data (or fail) if run as-is**. Do not use the "How to fetch" sections until the Team Details below are filled in with real values — Sheets-based fixture reading is unaffected and safe to use now. See `.nanoclaw-migrations/open-items.md` item 1.

## Fetching fixtures from Sheets (default)

`mcp__nanoclaw__sheets_list_fixtures()`

Filter to upcoming fixtures only (date >= today) and format the output as below.

## Team Details
- **Team:** Wheathampstead Wanderers Youth U13 Orcas
- **Team ID:** TODO — awaiting FA Full-Time 2025-26 publication (was `7698794` for U12; will change for U13)
- **League:** Hertfordshire Girls Football Partnership League
- **League ID:** TODO — confirm unchanged from `4062637` once U13 fixtures are published
- **Division:** TODO — was `U12 Division 6`; U13 division name/ID not yet known
- **Season:** 2025-26

## How to fetch upcoming fixtures

```bash
agent-browser open "https://fulltime.thefa.com/fixtures.html?league=<LEAGUE_ID>&selectedSeason=<SEASON_ID>&selectedFixtureGroupAgeGroup=11&selectedFixtureGroupKey=&selectedDateCode=all&selectedClub=&selectedTeam=<TEAM_ID>&selectedRelatedFixtureOption=3&selectedFixtureDateStatus=&selectedFixtureStatus=&submitButton=Search"
agent-browser wait 2000
# Select the team in the dropdown and submit the form
agent-browser eval "document.querySelectorAll('select')[5].value = '<TEAM_ID>'"
agent-browser eval "document.querySelector('form').submit()"
agent-browser wait 2000
agent-browser eval "document.querySelector('main table')?.innerText"
```

## How to fetch results

```bash
agent-browser open "https://fulltime.thefa.com/results.html?league=<LEAGUE_ID>&selectedSeason=<SEASON_ID>&selectedFixtureGroupAgeGroup=11&selectedFixtureGroupKey=&selectedDateCode=all&selectedClub=&selectedTeam=<TEAM_ID>&selectedRelatedFixtureOption=3&selectedFixtureStatus=&submitButton=Search"
agent-browser wait 2000
agent-browser eval "document.querySelectorAll('select')[5].value = '<TEAM_ID>'"
agent-browser eval "document.querySelector('form').submit()"
agent-browser wait 2000
agent-browser eval "document.querySelector('main table')?.innerText"
```

## How to fetch the league table (U13 division — TODO name)

```bash
agent-browser open "https://fulltime.thefa.com/table.html?league=<LEAGUE_ID>&selectedSeason=<SEASON_ID>&selectedDivision=<DIVISION_ID>&selectedCompetition=0&selectedFixtureGroupKey=<FIXTURE_GROUP_KEY>"
agent-browser wait 2000
agent-browser eval "document.querySelector('main table')?.innerText"
```

## How to fetch the team page (overview)

```bash
agent-browser open "https://fulltime.thefa.com/displayTeam.html?teamID=<TEAM_ID>&league=<LEAGUE_ID>"
agent-browser wait 2000
agent-browser eval "document.querySelector('main')?.innerText"
```

## Output format

Format fixtures and results as a monospace code block so columns align in WhatsApp. Use abbreviated names to fit on screen. Venue indicates home (H) or away (A).

Fixtures example:
⚽ *Sat 14 Mar, 11:30* — Bedwell Rangers (H)
📍 Butterfield Rd

⚽ *Sat 21 Mar, 09:00* — Bedwell Rangers (A)
📍 Marriotts SC

Results example:
```
Date        Opposition       Result
Sat 07 Mar  Ware Lions       0-6 (A)
Sat 28 Feb  Ruislip Rangers  7-1 (H)
```

League table example:
```
Pos  Team                P   W  D   L  Pts
 1   Ware Lions          12  11  1   0   34
10   Orcas               15   4  0  11   12
```

## Notes
- **Players:** The FA does not display player names or individual stats for youth leagues (U18 and below). This is FA policy and cannot be bypassed.
- **Fixtures vs Team Page:** The team page shows "no upcoming fixtures" but the dedicated fixtures search page (with team filter applied) does return the full list. Always use the fixtures search URL above.
- **Cookie banners:** If interactions fail, dismiss the cookie banner first: `agent-browser eval "document.querySelector('button[aria-label*=\"Accept\"], button[id*=\"accept\"]')?.click()"`
- **Email cross-reference:** When comparing with email fixtures, check date, kick-off time, home/away, opponent and venue for any discrepancies.
