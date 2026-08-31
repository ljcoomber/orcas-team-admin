/**
 * Gmail MCP tools — thin wrappers over the host-side `gmail-*` ncl commands
 * (`src/cli/resources/gmail.ts`). No Google credentials or API logic here:
 * see `cli-bridge.ts` and
 * `.nanoclaw-migrations/container-runner-credentials.md`.
 */
import { runNclCommand } from './cli-bridge.js';
import { registerTools } from './server.js';
import type { McpToolDefinition } from './types.js';

function ok(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function err(text: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${text}` }], isError: true };
}

export const gmailScan: McpToolDefinition = {
  tool: {
    name: 'gmail_scan',
    description:
      'Scan Gmail for fixture emails matching a query. Returns an array of { id, subject, from, date, body }.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Gmail search query (default: from:donotreplyfulltime@thefa.com)' },
        maxResults: { type: 'number', description: 'Max emails to fetch (default: 10)' },
      },
    },
  },
  async handler(args) {
    try {
      return ok(await runNclCommand('gmail-scan', { query: args.query, maxResults: args.maxResults }));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
};

export const gmailDraftCreate: McpToolDefinition = {
  tool: {
    name: 'gmail_draft_create',
    description: 'Create a Gmail draft. Returns { draft_id }.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject' },
        body: { type: 'string', description: 'Email body (plain text)' },
        attachmentPath: { type: 'string', description: 'Optional path to a PDF attachment' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  async handler(args) {
    try {
      return ok(
        await runNclCommand('gmail-draft-create', {
          to: args.to,
          subject: args.subject,
          body: args.body,
          attachmentPath: args.attachmentPath,
        }),
      );
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
};

registerTools([gmailScan, gmailDraftCreate]);
