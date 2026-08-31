---
name: scan-fa-emails
description: Scan Gmail for FA Full-Time fixture emails, parse them, and save new/updated fixtures to Google Sheets. Trigger on "scan emails", "check gmail", "scan fixtures", or as part of a scheduled run cycle.
allowed-tools: mcp__nanoclaw__gmail_scan, mcp__nanoclaw__sheets_save_fixture
---

# Scan FA Emails

Scan Gmail for FA Full-Time fixture notification emails, parse each one, and save fixtures to Sheets.

## Steps

1. Fetch unread fixture emails: `mcp__nanoclaw__gmail_scan({ query: "from:donotreplyfulltime@thefa.com" })`
   Returns a JSON array of `{ id, subject, from, date, body }`. If empty, report no new emails found.

2. For each email, parse the body to extract fixture data (see **Parsing** below).

3. For each fixture extracted: `mcp__nanoclaw__sheets_save_fixture({ fixture })`

4. Report how many emails were scanned and how many fixtures were saved or updated.

Refer to CLAUDE.md for the team name and any known email anomalies.

## Parsing

Parse each email body and return one fixture object per fulltime-league.thefa.com URL found (one email may contain multiple fixtures).

### Email format notes

- **Fixture ID**: numeric ID in the fulltime-league.thefa.com URL (`?id=XXXXXXXX`)
- **Email types**: "fixture released" → `fixture_released`, "fixture updated" → `fixture_updated`, "referee appointment" → `referee_appointment`, "weekly reminder" → `weekly_reminder`
- **Fixture updated emails**: parse the "To:" section only (new details), NOT the "From:" section (old details)
- **Dates**: "Sat 07 Mar 2026 09:00" → ISO 8601 with Europe/London timezone (e.g. `2026-03-07T09:00:00+00:00` or `+01:00` in BST)
- **time_tbc**: set to `true` when kick-off is 09:00 in a `fixture_released` email (provisional placeholder)
- **Contacts**: "Home Team Contact: Name; Email: email@domain Mob: +44xxxxxxxxxx"
- **Referee**: "Referee: Name, phone (M), email,"

If the format has changed, adapt and log the change to CLAUDE.md under "FA Full-Time Email Notes".

### Fixture JSON format

```json
{
  "fixture_id": "string",
  "competition": "string",
  "date": "ISO 8601 string (Europe/London)",
  "home_team": "string",
  "away_team": "string",
  "status": "Normal|Postponed|Cancelled|Abandoned|Void",
  "venue": "string",
  "home_contact": { "name": "string", "email": "string", "phone": "string" },
  "away_contact": { "name": "string", "email": "string", "phone": "string" },
  "referee": { "name": "string", "email": "string", "phone": "string" } | null,
  "email_type": "fixture_released|fixture_updated|referee_appointment|weekly_reminder",
  "time_tbc": true | false,
  "fulltime_url": "string",
  "source_email_id": "string"
}
```
