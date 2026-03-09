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
   - Subject format: `{home_team} vs {away_team}, {date formatted as "Sat 7 Mar 2026"}`
   - Create the draft: `npx tsx /tools/gmail-draft.ts create '<to>' '<subject>' '<body>'`
   - Update the action with the draft ID: `npx tsx /tools/sheets.ts update-action '<json with metadata.draft_id>'`
4. Report which drafts were created.

## Email guidance

Write concisely. Refer to CLAUDE.md for tone and sign-off preferences.

**email_opposition_coach (home fixture):**
- Confirm our venue, kick-off time
- Request confirmation from them
- Offer to share venue directions if needed

**email_opposition_coach (away fixture):**
- Acknowledge the fixture
- Request their venue address and parking details

**referee_email:**
- Acknowledge the appointment
- Confirm kick-off time and venue
- Provide venue address or offer to send directions

## Constraints

- Keep emails to 2–3 sentences unless more context is clearly needed
- Use first names in salutation where known (e.g. "Hi Sarah," not "Dear Referee,")
- Never use "Dear Sir/Madam"
- Sign off as specified in CLAUDE.md (e.g. "Lee, U12 Orcas")
