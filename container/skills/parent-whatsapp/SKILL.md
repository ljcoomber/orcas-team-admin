---
name: parent-whatsapp
description: Send match detail messages to the parents' WhatsApp group for all due parent_whatsapp actions. Trigger on "message the parents", "whatsapp the parents", "send parent message", "notify parents", or as part of a scheduled run cycle.
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

No asterisks or markdown — WhatsApp doesn't render it reliably from automated messages. Use emojis for emphasis instead. Friendly and concise — parents just need the key info. Always include a request for a Match Delegate volunteer and a "run the line" volunteer, whatever the goals situation.

Example for a home fixture (goals need setting up):
```
Hi all, our next match is against Bedwell Rangers U13 Phoenix ⚽
📅 Sat 14 Mar — meet at 11:00am for an 11:30am kickoff
📍 Butterfield Road Playing Fields (home)

Parents will need to put up goals before the game. Please can I also have a volunteer:
🙋 to be Match Delegate
🚩 to run the line
```

Example for a home fixture (goals already up — no setup needed):
```
Hi all, our next match is against Ware Lions U13 Stripes ⚽
📅 Sat 21 Mar — meet at 10:30am for an 11:00am kickoff
📍 Butterfield Road Playing Fields (home)

Goals are already up from the earlier game, so no setup needed this week. Please can I have a volunteer:
🙋 to be Match Delegate
🚩 to run the line
```

Example for a home fixture (goals need taking down afterwards):
```
Hi all, our next match is against Hitchin Belles U13 Panthers ⚽
📅 Sat 28 Mar — meet at 9:30am for a 10:00am kickoff
📍 Butterfield Road Playing Fields (home)

This is our last home game for a while, so we'll need a few parents to help take the goals down after the match. Please can I also have a volunteer:
🙋 to be Match Delegate
🚩 to run the line
```

Example for an away fixture (should not happen as parent_whatsapp is home-only, but handle gracefully):
```
⚽ Match this Saturday!

Ware Lions U13 Stripes vs Wheathampstead Wanderers U13 Orcas
📅 Sat 7 Mar — meet at 11:30am for a 12:00pm kickoff
📍 Ware Lions FC (away — venue address TBC)

Please can I have a volunteer:
🙋 to be Match Delegate
🚩 to run the line
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
- Meet time is 30 minutes before kick-off — compute it from the fixture's kick-off time, don't hardcode it
- Venue for home fixtures is always Butterfield Road Playing Fields unless the fixture says otherwise
- Use the fixture's `venue` field for the venue name
- Whether goals need putting up, are already up, or need taking down afterwards depends on the fixture/action notes and the schedule of home games that week — check for that context before picking which example to follow; default to "need setting up" if nothing indicates otherwise
- Do not send if `status` is already `completed` or `cancelled`
