---
name: schedule-actions
description: Calculate which actions are now due for all fixtures and save them to Google Sheets. Trigger on "schedule actions", "check due actions", or as part of a scheduled run cycle.
allowed-tools: Bash, Read
---

# Schedule Actions

For each fixture in Google Sheets, determine which actions are now due and save new ones.

## Steps

1. `npx tsx /tools/sheets.ts list-fixtures` — get all fixtures (JSON array)
2. `npx tsx /tools/sheets.ts list-actions` — get all existing actions (all statuses)
3. For each fixture with `status === "Normal"` and `date` in the future, reason about which actions are due:

| Action | Who triggers it | Trigger condition |
|--------|----------------|-------------------|
| `book_pitch` | home fixture only | 21 days before kick-off |
| `email_opposition_coach` | all fixtures | 6 days before kick-off |
| `parent_whatsapp` | home fixture only | 6 days before kick-off (only after `book_pitch` is `completed`) |
| `away_fixture_monitoring` | away fixture only | 4 days before kick-off |
| `referee_email` | fixture has referee | immediately (as soon as referee is assigned) |
| `find_referee` | no referee AND ≤2 days to kick-off | immediately |

4. **action_id format**: `"{fixture_id}:{action_type}"` — skip if already in the existing actions list (any status)
5. **due_date**: if the trigger time falls outside 08:00–21:00 Europe/London, advance to the next 08:00
6. For each new action: `npx tsx /tools/sheets.ts save-action '<json>'`
7. Report how many new actions were created.

## Edge cases

- Postponed/cancelled/abandoned/void fixtures: skip entirely
- If `book_pitch` is pending (not yet completed), hold off on `parent_whatsapp`
- Use today's date from CLAUDE.md or from the system clock; don't hard-code

## Action JSON format

```json
{
  "action_id": "{fixture_id}:{action_type}",
  "fixture_id": "string",
  "action_type": "book_pitch|email_opposition_coach|referee_email|parent_whatsapp|away_fixture_monitoring|find_referee",
  "due_date": "ISO 8601 string",
  "status": "pending",
  "created_at": "ISO 8601 string (now)",
  "updated_at": "ISO 8601 string (now)",
  "metadata": null
}
```
