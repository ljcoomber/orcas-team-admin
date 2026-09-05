---
name: parent-whatsapp
description: Send match detail messages to parents for all due parent_whatsapp actions. Trigger on "send parent message", "notify parents", or as part of a scheduled run cycle.
allowed-tools: mcp__nanoclaw__sheets_list_actions, mcp__nanoclaw__sheets_get_fixture, mcp__nanoclaw__sheets_update_action, mcp__nanoclaw__send_message
---

# Parent WhatsApp

Send a match details message for each pending `parent_whatsapp` action that is due.

## Steps

1. `mcp__nanoclaw__sheets_list_actions()` — get all actions
2. Filter to: `action_type === "parent_whatsapp"` AND `status === "pending"` AND `due_date <= now`
3. For each qualifying action:
   - Get the fixture: `mcp__nanoclaw__sheets_get_fixture({ fixture_id })`
   - Compose the match details message (see format below)
   - Send it: `mcp__nanoclaw__send_message` with the composed message
   - Mark the action completed: `mcp__nanoclaw__sheets_update_action({ action })` (see JSON below)
4. Report how many messages were sent.

## Message format

Use WhatsApp formatting (*bold*, no markdown). Friendly and concise — parents just need the key info.

Example for a home fixture:
```
Hi all, our next match is against *Bedwell Rangers U13 Phoenix*
📅 Sat 14 Mar, 11:30am kickoff
📍 Butterfield Road Playing Fields (home)

Please arrive 30 minutes before kick-off so the girls can warm up properly.

Parents will need to put up goals, and please can I have a volunteer:
- to be Match Delegate
- run the line
```

Example for an away fixture (should not happen as parent_whatsapp is home-only, but handle gracefully):
```
⚽ *Match this Saturday!*

*Ware Lions U13 Stripes* vs *Wheathampstead Wanderers U13 Orcas*
📅 Sat 7 Mar, 12:00pm
📍 Ware Lions FC (away — venue address TBC)

Please aim to arrive 30 minutes before kick-off so the girls can warm up properly.

Please can I have a volunteer:
- to be Match Delegate
- run the line
```

## Update action JSON

```json
{
  "action_id": "{fixture_id}:parent_whatsapp",
  "status": "completed",
  "updated_at": "ISO 8601 string (now)"
}
```

## Notes

- `parent_whatsapp` is only scheduled for home fixtures (after `book_pitch` is completed)
- Format the date as "Sat 14 Mar" (not ISO), time as "11:30am"
- Venue for home fixtures is always Butterfield Road Playing Fields unless the fixture says otherwise
- Use the fixture's `venue` field for the venue name
- Do not send if `status` is already `completed` or `cancelled`
