---
name: gmail-scan
description: Scan Gmail for FA Full-Time fixture emails, parse them, and save new/updated fixtures to Google Sheets. Trigger on "scan emails", "check gmail", "scan fixtures", or as part of a scheduled run cycle.
allowed-tools: Bash, Read
---

# Gmail Scan

Scan Gmail for FA Full-Time fixture notification emails.

1. Run `npx tsx /tools/gmail-scan.ts`
   ```bash
   GMAIL_FIXTURE_QUERY="from:donotreplyfulltime@thefa.com" npx tsx /tools/gmail-scan.ts
   ```
3. Read each email body carefully to extract fixture data (use the parse-fixture skill: `/parse-fixture`)
4. For each fixture found, save it: `npx tsx /tools/sheets.ts save-fixture '<json>'`
5. Report how many emails were scanned and how many fixtures were saved or updated.

Refer to CLAUDE.md for the team name, email format notes, and any known anomalies.

If the tool returns an empty array, report that no new emails were found.
