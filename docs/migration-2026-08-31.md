# v1 → v2 migration record

- Started: 2026-08-31T14:12:02Z
- Source: `bash migrate-v2.sh` (v1 at `/home/lee/code/orcabot/orcas-team-admin`, v1.2.10) followed by `/migrate-from-v1`
- Final status: complete, except the coaches WhatsApp channel (deferred by operator request)
- Channels installed: WhatsApp
- Service: `nanoclaw-v2-ee501542` (systemd --user), switched over 2026-08-31

## Deterministic script steps

All of `migrate-v2.sh`'s scripted steps (`1a-env`, `1b-db`, `1c-groups`, `1d-sessions`, `1e-tasks`, `3b-onecli`, `3e-build`) succeeded. The container build initially failed on a corrupt buildkit cache + disk ENOSPC (reclaimed 2.79GB from a stale v1 `nanoclaw-agent:latest` image); retry succeeded, producing `nanoclaw-agent-v2-ee501542:latest`. Full logs in `logs/migrate-steps/` (gitignored).

## Manual fixes applied to get real messages routing

The deterministic script under-reported its own state (`2a-channels-selected.txt` was empty even though WhatsApp, the custom Gmail/Sheets MCP tools, and the fork's fixture-management skills were already present as uncommitted worktree changes from earlier work in the same conversation). Fixed during this session:

1. `container_configs` row was missing for agent group `ag-1788185282218-ydh72e` — `1c-groups` seeded the DB row directly, bypassing `initGroupFilesystem`/`ensureContainerConfig`. Fixed by calling `initGroupFilesystem()`.
2. WhatsApp had never been authenticated in v2 (no v1 session to port) — paired fresh via QR then pairing code (`WHATSAPP_ENABLED`/`WHATSAPP_PHONE_NUMBER=447901273929` in `.env`); `store/auth/creds.json` now holds a valid session.
3. No Anthropic secret in the OneCLI vault — created via `setup/index.ts --step auth -- --create --value <key>` from `.env`'s `ANTHROPIC_API_KEY`.
4. `messaging_group_agents` wiring used `engage_mode=pattern` with a literal `@OrcaBot` regex, which never matches WhatsApp's native @-mention (raw text is the phone number, not the display name) — switched to `engage_mode=mention` (native `contextInfo.mentionedJid` detection).
5. The migrated `fixture-cycle` v1 task landed in the *same* session as WhatsApp chat instead of an isolated `system:tasks:<id>` session (a bug in the `1e-tasks` migration step, bypassing `resolveTaskSession`/`createScheduledTask`) — fixed by cancelling and recreating via `ncl tasks create` (new series `fixture-cycle-d25b`, proper isolated session).
6. Even after relocating the task, the chat session's long-lived container kept emitting `kind='task_log'` instead of `'chat'` for genuine chat turns — restarting that container worked around it. **Root cause not confirmed** — worth a closer look at `container/agent-runner/src/poll-loop.ts` if it recurs.

## Followups closed out in this session

- Owner role granted to `whatsapp:447957368626@s.whatsapp.net`; access policy confirmed as `public` (operator's choice).
- `/migrate-memory` run for `groups/global` (retired — v2 has no mechanism that reads it; `global` is a reserved/blocked folder name in `src/group-folder.ts`) and `groups/orcabot_coaches` (distilled into `instructions.prepend.md` + OKF memory tree). `groups/whatsapp_main` was already migrated.
- `container.json` mount paths verified (`additionalMounts: []` for `whatsapp_main`; no other group has a `container.json` yet).
- `.claude-shared/skills/*` stale real-directory copies (not symlinks) for `check-pitch`, `create-email-draft`, `orcas-fixtures`, `parent-whatsapp`, `scan-fa-emails`, `schedule-actions`, and `agent-browser` — removed; `syncSkillSymlinks` recreated proper symlinks to `/app/skills/<name>`, verified. Without this fix, edits to `container/skills/*` (including the stale-CLI-reference fix below) would never have reached the running agent.
- Only one agent group and one task existed, both already covered above — no other groups/tasks had the session-isolation gap.
- The six custom fixture-management skills (`orcas-fixtures`, `scan-fa-emails`, `create-email-draft`, `parent-whatsapp`, `schedule-actions`, `check-pitch`) still referenced the dead v1 `NODE_PATH=... tsx /tools/sheets.ts ...` CLI pattern; rewritten to call the real v2 MCP tools (`mcp__nanoclaw__sheets_*`, `mcp__nanoclaw__gmail_*`).
- `credentials.json`/`token.json` (raw Google OAuth secrets) were untracked but not gitignored — added to `.gitignore`.
- Actual service switchover completed — v2 had only ever run as a manual `pnpm run dev`; installed as systemd unit `nanoclaw-v2-ee501542`, confirmed clean boot and a live WhatsApp reply.

## Remaining known issue

`kind='task_log'` vs `'chat'` misclassification on a long-lived container after its originating task session was removed (item 6 above) — worked around at the time, since root-caused (2026-08-31, later session):

`processQuery()` in `container/agent-runner/src/poll-loop.ts` computes `routing` (incl. `routing.taskRun`) once, from the batch that starts the turn, and never recomputes it for messages pushed into the same active query later via the concurrent follow-up poller (lines ~411-520). If a task-triggered turn is still streaming when a chat message gets pushed into it, the reply is misclassified: `deliverMidTurnBlocks()` drops mid-turn `<message>` blocks (line ~811: `if (routing.taskRun) return ...`), and the final text goes through `autoAppendTaskLog()` instead of `sendToDestination()` — silently appended to the task run log, never delivered. No test covers this specific interleaving.

Not currently reachable for this install: `book-pitch-sep12-d645` and `fixture-cycle-d25b` both run in properly isolated `system:tasks:<id>` sessions (confirmed via `ncl sessions list`), separate from the chat session (`sess-1788185283383-xk0yl5`), so a task turn and a chat message can no longer land in the same live container to interleave. The code gap itself is real and upstream (not Orcas-specific) — operator decision (2026-08-31): leave unpatched since it's currently unreachable here. Revisit if session isolation is ever reconfigured to share a session between tasks and chat.

## Deferred

Coaches WhatsApp channel — candidate group JIDs recorded in `.nanoclaw-migrations/whatsapp-setup.md`; needs operator confirmation of which group before wiring.
