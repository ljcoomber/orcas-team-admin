/**
 * Sheets MCP tools — thin wrappers over the host-side `sheets-*` ncl
 * commands (`src/cli/resources/sheets.ts`). No Google credentials or API
 * logic here: see `cli-bridge.ts` and
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

export const sheetsListFixtures: McpToolDefinition = {
  tool: {
    name: 'sheets_list_fixtures',
    description: 'List all fixtures from the Orcas fixtures Google Sheet.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  async handler() {
    try {
      return ok(await runNclCommand('sheets-list-fixtures'));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
};

export const sheetsGetFixture: McpToolDefinition = {
  tool: {
    name: 'sheets_get_fixture',
    description: 'Get one fixture by fixture_id. Returns null if not found.',
    inputSchema: {
      type: 'object' as const,
      properties: { fixture_id: { type: 'string', description: 'The fixture ID' } },
      required: ['fixture_id'],
    },
  },
  async handler(args) {
    try {
      return ok(await runNclCommand('sheets-get-fixture', { fixture_id: args.fixture_id }));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
};

export const sheetsSaveFixture: McpToolDefinition = {
  tool: {
    name: 'sheets_save_fixture',
    description: 'Upsert a fixture (matched by fixture_id).',
    inputSchema: {
      type: 'object' as const,
      properties: { fixture: { type: 'object', description: 'The fixture object to save' } },
      required: ['fixture'],
    },
  },
  async handler(args) {
    try {
      return ok(await runNclCommand('sheets-save-fixture', { fixture: args.fixture }));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
};

export const sheetsListActions: McpToolDefinition = {
  tool: {
    name: 'sheets_list_actions',
    description: 'List all actions from the Orcas fixtures Google Sheet.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  async handler() {
    try {
      return ok(await runNclCommand('sheets-list-actions'));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
};

export const sheetsSaveAction: McpToolDefinition = {
  tool: {
    name: 'sheets_save_action',
    description: 'Upsert an action (matched by action_id).',
    inputSchema: {
      type: 'object' as const,
      properties: { action: { type: 'object', description: 'The action object to save' } },
      required: ['action'],
    },
  },
  async handler(args) {
    try {
      return ok(await runNclCommand('sheets-save-action', { action: args.action }));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
};

export const sheetsUpdateAction: McpToolDefinition = {
  tool: {
    name: 'sheets_update_action',
    description: 'Update an existing action (matched by action_id; errors if not found).',
    inputSchema: {
      type: 'object' as const,
      properties: { action: { type: 'object', description: 'The action object to update' } },
      required: ['action'],
    },
  },
  async handler(args) {
    try {
      return ok(await runNclCommand('sheets-update-action', { action: args.action }));
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e));
    }
  },
};

registerTools([sheetsListFixtures, sheetsGetFixture, sheetsSaveFixture, sheetsListActions, sheetsSaveAction, sheetsUpdateAction]);
