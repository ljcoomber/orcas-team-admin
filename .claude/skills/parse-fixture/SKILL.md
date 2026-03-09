---
name: parse-fixture
description: Extract structured fixture data from a raw FA Full-Time email body text. Not directly user-invocable — called by the gmail-scan skill.
user-invocable: false
allowed-tools: Read
---

# Parse Fixture

Parse an FA Full-Time email body and return a JSON array of fixture objects.

## Email format notes

Adapt if the format has changed — don't fail silently. Log any format changes to CLAUDE.md.

- **Fixture ID**: numeric ID in the fulltime-league.thefa.com URL (`?id=XXXXXXXX`)
- **Email types**:
  - "fixture released" → `fixture_released`
  - "fixture updated" → `fixture_updated`
  - "referee appointment" → `referee_appointment`
  - "weekly reminder" → `weekly_reminder`
- **Fixture updated emails**: parse the "To:" section only (new details), NOT the "From:" section (old details)
- **Dates**: "Sat 07 Mar 2026 09:00" → ISO 8601 with Europe/London timezone (e.g. `2026-03-07T09:00:00+00:00` or `+01:00` in BST)
- **time_tbc**: set to `true` when kick-off is 09:00 in a fixture_released email (provisional placeholder)
- **Contacts**: "Home Team Contact: Name; Email: email@domain Mob: +44xxxxxxxxxx"
- **Referee**: "Referee: Name, phone (M), email,"
- **Multiple fixtures**: one email can contain multiple fixtures, one per fulltime-league.thefa.com URL

## Output format

Return a JSON array. Each fixture must have these fields:

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

If the format has changed from what's described here, adapt based on what you can read, and append a note about the change to CLAUDE.md under "FA Full-Time Email Notes".
