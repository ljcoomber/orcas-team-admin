/**
 * Google Sheets commands for the Orcas fixture-management tooling.
 *
 * Ported from the v1 `container/tools/sheets.ts` CLI script — the logic is
 * unchanged, only where it runs: host-side now, dispatched from the agent
 * container via `cli_request`/`cli_response` (see `../delivery-action.ts`),
 * so `credentials.json`/`token.json` never enter a container. See
 * `.nanoclaw-migrations/container-runner-credentials.md`.
 */
import { google, type sheets_v4 } from 'googleapis';

import { googleSheetsSpreadsheetId, loadGoogleAuth } from '../../google-auth.js';
import { register } from '../registry.js';

type Fixture = Record<string, unknown>;
type Action = Record<string, unknown>;

const FIXTURE_RANGE = 'Fixtures!A:T';
const ACTION_RANGE = 'Actions!A:H';

const FIXTURE_HEADERS = [
  'Fixture ID',
  'Competition',
  'Date',
  'Home Team',
  'Away Team',
  'Status',
  'Venue',
  'Home Contact Name',
  'Home Contact Email',
  'Home Contact Phone',
  'Away Contact Name',
  'Away Contact Email',
  'Away Contact Phone',
  'Fulltime URL',
  'Referee Name',
  'Referee Email',
  'Referee Phone',
  'Source Email ID',
  'Email Type',
  'Time TBC',
];

const ACTION_HEADERS = [
  'Action ID',
  'Fixture ID',
  'Action Type',
  'Due Date',
  'Status',
  'Created At',
  'Updated At',
  'Metadata',
];

function fixtureToRow(f: Fixture): string[] {
  const home = (f['home_contact'] as Record<string, string>) ?? {};
  const away = (f['away_contact'] as Record<string, string>) ?? {};
  const ref = (f['referee'] as Record<string, string> | null) ?? null;
  return [
    String(f['fixture_id'] ?? ''),
    String(f['competition'] ?? ''),
    String(f['date'] ?? ''),
    String(f['home_team'] ?? ''),
    String(f['away_team'] ?? ''),
    String(f['status'] ?? 'Normal'),
    String(f['venue'] ?? ''),
    home['name'] ?? '',
    home['email'] ?? '',
    home['phone'] ?? '',
    away['name'] ?? '',
    away['email'] ?? '',
    away['phone'] ?? '',
    String(f['fulltime_url'] ?? ''),
    ref?.['name'] ?? '',
    ref?.['email'] ?? '',
    ref?.['phone'] ?? '',
    String(f['source_email_id'] ?? ''),
    String(f['email_type'] ?? 'fixture_released'),
    f['time_tbc'] ? 'TRUE' : 'FALSE',
  ];
}

function rowToFixture(row: string[]): Fixture {
  const referee = row[14] ? { name: row[14], email: row[15] ?? '', phone: row[16] ?? '' } : null;
  return {
    fixture_id: row[0],
    competition: row[1],
    date: row[2],
    home_team: row[3],
    away_team: row[4],
    status: row[5],
    venue: row[6],
    home_contact: { name: row[7] ?? '', email: row[8] ?? '', phone: row[9] ?? '' },
    away_contact: { name: row[10] ?? '', email: row[11] ?? '', phone: row[12] ?? '' },
    fulltime_url: row[13] ?? '',
    referee,
    source_email_id: row[17] ?? '',
    email_type: row[18] ?? 'fixture_released',
    time_tbc: (row[19] ?? '').toUpperCase() === 'TRUE',
  };
}

function actionToRow(a: Action): string[] {
  return [
    String(a['action_id'] ?? ''),
    String(a['fixture_id'] ?? ''),
    String(a['action_type'] ?? ''),
    String(a['due_date'] ?? ''),
    String(a['status'] ?? 'pending'),
    String(a['created_at'] ?? new Date().toISOString()),
    String(a['updated_at'] ?? new Date().toISOString()),
    a['metadata'] ? JSON.stringify(a['metadata']) : '',
  ];
}

function rowToAction(row: string[]): Action {
  return {
    action_id: row[0],
    fixture_id: row[1],
    action_type: row[2],
    due_date: row[3],
    status: row[4],
    created_at: row[5],
    updated_at: row[6],
    metadata: row[7] ? JSON.parse(row[7]) : null,
  };
}

async function ensureHeaders(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheet: string,
  headers: string[],
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheet}!A1` });
  const a1 = res.data.values?.[0]?.[0] ?? '';
  if (a1 === headers[0]) return;
  const colLetter = String.fromCharCode(64 + headers.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheet}!A1:${colLetter}1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] },
  });
}

async function ensureSheetsExist(sheets: sheets_v4.Sheets, spreadsheetId: string): Promise<void> {
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set(res.data.sheets?.map((s) => s.properties?.title ?? '') ?? []);
  const toCreate = (['Fixtures', 'Actions'] as const).filter((name) => !existing.has(name));
  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: toCreate.map((title) => ({ addSheet: { properties: { title } } })) },
    });
  }
  await ensureHeaders(sheets, spreadsheetId, 'Fixtures', FIXTURE_HEADERS);
  await ensureHeaders(sheets, spreadsheetId, 'Actions', ACTION_HEADERS);
}

async function getRowIndex(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  idColumn = 'A',
): Promise<Map<string, number>> {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetName}!${idColumn}:${idColumn}` });
  const values = res.data.values ?? [];
  const index = new Map<string, number>();
  let maxRow = 1;
  for (let i = 1; i < values.length; i++) {
    const id = values[i]?.[0];
    if (id) {
      index.set(id, i + 1);
      if (i + 1 > maxRow) maxRow = i + 1;
    }
  }
  index.set('', maxRow + 1);
  return index;
}

async function getClient(): Promise<{ sheets: sheets_v4.Sheets; spreadsheetId: string }> {
  const auth = loadGoogleAuth();
  const spreadsheetId = googleSheetsSpreadsheetId();
  const sheets = google.sheets({ version: 'v4', auth });
  await ensureSheetsExist(sheets, spreadsheetId);
  return { sheets, spreadsheetId };
}

register({
  name: 'sheets-list-fixtures',
  description: 'List all fixtures from the Orcas fixtures Google Sheet.',
  access: 'open',
  parseArgs: () => ({}),
  handler: async () => {
    const { sheets, spreadsheetId } = await getClient();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: FIXTURE_RANGE });
    const values = res.data.values ?? [];
    return values
      .slice(1)
      .filter((row) => row && row.length >= 3 && row[2])
      .map((row) => rowToFixture(row as string[]));
  },
});

register({
  name: 'sheets-get-fixture',
  description: 'Get one fixture by fixture_id.',
  access: 'open',
  parseArgs: (raw) => {
    const fixtureId = raw.fixture_id;
    if (typeof fixtureId !== 'string' || !fixtureId) throw new Error('fixture_id is required');
    return { fixtureId };
  },
  handler: async ({ fixtureId }) => {
    const { sheets, spreadsheetId } = await getClient();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: FIXTURE_RANGE });
    const values = res.data.values ?? [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row && row[0] === fixtureId) return rowToFixture(row as string[]);
    }
    return null;
  },
});

register({
  name: 'sheets-save-fixture',
  description: 'Upsert a fixture (matched by fixture_id).',
  access: 'open',
  parseArgs: (raw) => {
    const fixture = raw.fixture as Fixture;
    if (!fixture || typeof fixture !== 'object') throw new Error('fixture object is required');
    return { fixture };
  },
  handler: async ({ fixture }) => {
    const { sheets, spreadsheetId } = await getClient();
    const rowIndex = await getRowIndex(sheets, spreadsheetId, 'Fixtures');
    const row = fixtureToRow(fixture);
    const fixtureId = String(fixture['fixture_id']);
    const targetRow = rowIndex.get(fixtureId) ?? rowIndex.get('')!;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Fixtures!A${targetRow}:T${targetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    return { saved: true, fixture_id: fixtureId };
  },
});

register({
  name: 'sheets-list-actions',
  description: 'List all actions from the Orcas fixtures Google Sheet.',
  access: 'open',
  parseArgs: () => ({}),
  handler: async () => {
    const { sheets, spreadsheetId } = await getClient();
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: ACTION_RANGE });
    const values = res.data.values ?? [];
    const actions: Action[] = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row && row.length >= 5) {
        try {
          actions.push(rowToAction(row as string[]));
        } catch {
          // skip malformed rows
        }
      }
    }
    return actions;
  },
});

register({
  name: 'sheets-save-action',
  description: 'Upsert an action (matched by action_id).',
  access: 'open',
  parseArgs: (raw) => {
    const action = raw.action as Action;
    if (!action || typeof action !== 'object') throw new Error('action object is required');
    return { action };
  },
  handler: async ({ action }) => {
    const { sheets, spreadsheetId } = await getClient();
    const rowIndex = await getRowIndex(sheets, spreadsheetId, 'Actions');
    const row = actionToRow(action);
    const actionId = String(action['action_id']);
    const targetRow = rowIndex.get(actionId) ?? rowIndex.get('')!;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Actions!A${targetRow}:H${targetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    return { saved: true, action_id: actionId };
  },
});

register({
  name: 'sheets-update-action',
  description: 'Update an existing action (matched by action_id; errors if not found).',
  access: 'open',
  parseArgs: (raw) => {
    const action = raw.action as Action;
    if (!action || typeof action !== 'object') throw new Error('action object is required');
    return { action };
  },
  handler: async ({ action }) => {
    const { sheets, spreadsheetId } = await getClient();
    const rowIndex = await getRowIndex(sheets, spreadsheetId, 'Actions');
    const actionId = String(action['action_id']);
    const rowNum = rowIndex.get(actionId);
    if (rowNum === undefined) throw new Error(`Action ${actionId} not found`);
    const row = actionToRow(action);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Actions!A${rowNum}:H${rowNum}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    return { updated: true, action_id: actionId };
  },
});
