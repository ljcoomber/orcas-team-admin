/**
 * Shared helper for MCP tools that dispatch to a host-side `ncl` command via
 * the `cli_request`/`cli_response` mailbox mechanism — the same transport
 * `container/agent-runner/src/cli/ncl.ts` uses. Factored out here rather
 * than importing ncl.ts directly, since that file runs `main()` at import
 * time (it's a standalone CLI entrypoint, not a library).
 *
 * Used by sheets.ts and gmail.ts: their MCP tool handlers write a
 * `cli_request` naming a host-side command registered in
 * `src/cli/resources/{sheets,gmail}.ts`, and this polls for the matching
 * `cli_response`. See `.nanoclaw-migrations/container-runner-credentials.md`
 * for why the actual Google API calls run host-side instead of here.
 */
import { getAgentMailbox } from '../mailbox/index.js';
import type { AgentMailbox } from '../mailbox/types.js';

type ResponseFrame =
  | { id: string; ok: true; data: unknown; human?: string }
  | { id: string; ok: false; error: { code: string; message: string } };

function generateId(): string {
  return `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function writeRequest(mailbox: AgentMailbox, id: string, command: string, args: Record<string, unknown>): Promise<void> {
  await mailbox.run(() =>
    mailbox.operations.writeMessageOut({
      id,
      kind: 'system',
      content: JSON.stringify({ action: 'cli_request', requestId: id, command, args }),
    }),
  );
}

async function pollResponse(mailbox: AgentMailbox, requestId: string, timeoutMs: number): Promise<ResponseFrame | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await mailbox.run(() => {
      const row = mailbox.operations.findCliResponse(requestId);
      if (row) {
        mailbox.operations.markMessages([row.id], 'completed');
        return (JSON.parse(row.content) as { frame: ResponseFrame }).frame;
      }
      return null;
    });
    if (response) return response;
    await Bun.sleep(500);
  }
  return null;
}

/**
 * Run a host-side `ncl` command (registered via `register()` in
 * `src/cli/resources/`) and return its data. Throws on error or timeout —
 * callers wrap this in their tool handler's `ok`/`err` response shape.
 */
export async function runNclCommand(
  command: string,
  args: Record<string, unknown> = {},
  timeoutMs = 30_000,
): Promise<unknown> {
  const mailbox = getAgentMailbox();
  const requestId = generateId();
  await writeRequest(mailbox, requestId, command, args);
  const resp = await pollResponse(mailbox, requestId, timeoutMs);
  if (!resp) throw new Error(`ncl command "${command}" timed out after ${timeoutMs}ms`);
  if (!resp.ok) throw new Error(`${resp.error.code}: ${resp.error.message}`);
  return resp.data;
}
