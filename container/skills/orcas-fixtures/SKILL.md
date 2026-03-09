---
name: orcas-fixtures
description: Fetch fixtures, results, and league table for Wheathampstead Wanderers Youth U12 Orcas. By default reads upcoming fixtures from Google Sheets (fast). Use FA Full-Time website only for live/fresh checks, results, or league table.
allowed-tools: Bash(agent-browser:*)
---

# Wheathampstead Wanderers Youth U12 Orcas — FA Full-Time Data Fetcher

By default, fetch upcoming fixtures from Google Sheets (fast). Only use agent-browser to fetch from FA Full-Time if the user asks for a live/fresh check, or for results and league table.

## Fetching fixtures from Sheets (default)

```bash
NODE_PATH=/app/node_modules /app/node_modules/.bin/tsx /tools/sheets.ts list-fixtures
```

Filter to upcoming fixtures only (date >= today) and format the output as below.

## Team Details
- **Team:** Wheathampstead Wanderers Youth U12 Orcas
- **Team ID:** 7698794
- **League:** Hertfordshire Girls Football Partnership League
- **League ID:** 4062637
- **Division:** U12 Division 6
- **Season:** 2025-26

## How to fetch upcoming fixtures

```bash
agent-browser open "https://fulltime.thefa.com/fixtures.html?league=4062637&selectedSeason=119776869&selectedFixtureGroupAgeGroup=11&selectedFixtureGroupKey=&selectedDateCode=all&selectedClub=&selectedTeam=7698794&selectedRelatedFixtureOption=3&selectedFixtureDateStatus=&selectedFixtureStatus=&submitButton=Search"
agent-browser wait 2000
# Select the team in the dropdown and submit the form
agent-browser eval "document.querySelectorAll('select')[5].value = '7698794'"
agent-browser eval "document.querySelector('form').submit()"
agent-browser wait 2000
agent-browser eval "document.querySelector('main table')?.innerText"
```

## How to fetch results

```bash
agent-browser open "https://fulltime.thefa.com/results.html?league=4062637&selectedSeason=119776869&selectedFixtureGroupAgeGroup=11&selectedFixtureGroupKey=&selectedDateCode=all&selectedClub=&selectedTeam=7698794&selectedRelatedFixtureOption=3&selectedFixtureStatus=&submitButton=Search"
agent-browser wait 2000
agent-browser eval "document.querySelectorAll('select')[5].value = '7698794'"
agent-browser eval "document.querySelector('form').submit()"
agent-browser wait 2000
agent-browser eval "document.querySelector('main table')?.innerText"
```

## How to fetch the league table (U12 Division 6)

```bash
agent-browser open "https://fulltime.thefa.com/table.html?league=4062637&selectedSeason=119776869&selectedDivision=603613655&selectedCompetition=0&selectedFixtureGroupKey=1_322454850"
agent-browser wait 2000
agent-browser eval "document.querySelector('main table')?.innerText"
```

## How to fetch the team page (overview)

```bash
agent-browser open "https://fulltime.thefa.com/displayTeam.html?teamID=7698794&league=4062637"
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
