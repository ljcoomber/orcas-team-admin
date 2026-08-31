---
name: check-pitch
description: Check the Wheathampstead Wanderers pitch booking calendar for availability on a given fixture date. Trigger on "check pitch", "is the pitch booked", "pitch availability", or when a book_pitch action is due.
allowed-tools: Bash(agent-browser:*), mcp__nanoclaw__sheets_get_fixture, mcp__nanoclaw__send_message
---

# Check Pitch Availability

Read the Wheathampstead Wanderers pitch booking calendar to see what's booked on a fixture date.

## Calendar

Read-only calendar: https://teamup.com/ksb80ad4b37369cd70

Pitches relevant to U13 Orcas (9v9) are under **Butterfield Ground**: Pitch 1, Pitch 2, Pitch 3.

## Steps

1. Get the fixture date (from the action or from the user): `mcp__nanoclaw__sheets_get_fixture({ fixture_id })`

2. Open the calendar for that date:
   ```bash
   agent-browser open "https://teamup.com/ksb80ad4b37369cd70?view=day&date=YYYY-MM-DD"
   agent-browser wait 2000
   agent-browser snapshot
   ```
   If a cookie banner appears: `agent-browser eval "document.querySelector('button[id*=accept], button[aria-label*=Accept]')?.click()"`

3. Extract what's booked:
   ```bash
   agent-browser eval "document.querySelector('main')?.innerText"
   ```

4. Report which Butterfield Ground pitches are free at the kick-off time (and 30 min before for warm-up).

5. If this was triggered by a `book_pitch` action, send a WhatsApp message with the availability summary (`mcp__nanoclaw__send_message`) so the manager can make the booking manually.

## Output format

```
⚽ *Pitch availability — Sat 14 Mar, 11:30*

Butterfield Ground:
• Pitch 1 — FREE ✅
• Pitch 2 — Booked 10:00–12:00
• Pitch 3 — FREE ✅

Recommend booking Pitch 1 or 3 for 11:00–12:30.
```

## Notes

- This skill reads the calendar only — bookings must be made manually via https://teamup.com/ksb80ad4b37369cd70
- The `book_pitch` action is home fixtures only
- Match length carried over from the U12 skill unverified for U13 (TODO: confirm actual U13 girls duration/half length with the league) — previously: 60 minutes (2 × 30 min) plus 10 minutes for half-time; allow 30 min warm-up, so book 1 hr 40 min total
