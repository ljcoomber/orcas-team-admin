---
name: create-email-draft
description: Create Gmail email drafts for all due pending actions that haven't been drafted yet. Trigger on "create drafts", "draft emails", or as part of a scheduled run cycle.
allowed-tools: Bash, Read
---

# Create Draft

Write and create Gmail drafts for all pending due actions.

## Steps

1. `npx tsx /tools/sheets.ts list-actions` — get all actions (JSON array)
2. Filter to: `status === "pending"` AND `due_date <= now` AND no `draft_id` in metadata
3. For each qualifying action:
   - **Skip** if `action_type` is `book_pitch`, `parent_whatsapp`, or `away_fixture_monitoring` — these require manual action, not email drafts
   - Get the fixture: `npx tsx /tools/sheets.ts get-fixture <fixture_id>`
   - Write an email body in the manager's voice (see CLAUDE.md for tone preferences)
   - Subject format: `Match against {home_team} on {date formatted as "Sat 7 Mar 2026"}`
   - For `email_opposition_coach` on a **home fixture**: check if `/tools/venue-directions.pdf` exists, and if so pass it as the attachment: `npx tsx /tools/gmail-draft.ts create '<to>' '<subject>' '<body>' /tools/venue-directions.pdf`
   - Otherwise: `npx tsx /tools/gmail-draft.ts create '<to>' '<subject>' '<body>'`
   - Update the action with the draft ID: `npx tsx /tools/sheets.ts update-action '<json with metadata.draft_id>'`
4. Report which drafts were created.

## Tone and sign-off

Write in a friendly, direct manager's voice. Keep it brief — like a text from a parent who also happens to run the team. No formal language.

Sign off every email as:
```
Lee

Wheathampstead Wanderers U12 Orcas
```

## Email guidance

**email_opposition_coach (home fixture):**
- Confirm our venue and kick-off time
- Request confirmation from them
- Offer to share venue directions if needed

Example:
```
Hi [Name],

We're hosting the game on [Date]. Kick-off is at [Time] on [Pitch] at [Venue]

[Venue Address]
 
Here is a link to Google Maps: https://goo.gl/maps/QFXLb6HoY7R5TcaQ6
 
The car park is at the end of Old School Drive. Space is limited in the car park so if it is full there is parking on Butterfield Road, Maltings Drive, Wick Avenue or Lattimore road. Please ask parents NOT to park on Old School Drive.
 
We will be playing in our maroon home kit and the game is on grass. 

Please don't hesitate to contact me if you have any questions.

And please can you confirm you have received this email.

Cheers,

Lee
Wheathampstead Wanderers U12 Orcas
```

**email_opposition_coach (away fixture):**
- Acknowledge the fixture
- Request their venue address and parking details

Example:
```
Hi [Name],

Looking forward to our fixture on [Date] at [Time]. Please can you send over the venue address and any parking info? Thanks.

Lee
Wheathampstead Wanderers U12 Orcas
```

**referee_email:**
- Acknowledge the appointment
- Confirm kick-off time and venue
- Ask for confirmation they can attend
- Provide or offer the venue address

Example:
```
Hi [Name],

You've been assigned to our game on [Date]. Kick-off is at [Time] at [Venue, Address].

Please confirm you can attend and me know if you need anything else.

Cheers,

Lee
Wheathampstead Wanderers U12 Orcas
```

## Constraints

- Keep emails to 2–3 sentences unless more context is clearly needed
- Use first names in salutation where known (e.g. "Hi Sarah," not "Dear Referee,")
- Never use "Dear Sir/Madam"
- Subject format: `{home_team} vs {away_team}, {date formatted as "Sat 7 Mar 2026"}`
