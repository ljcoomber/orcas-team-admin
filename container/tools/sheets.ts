#!/usr/bin/env npx tsx
/**
 * sheets.ts — Google Sheets CLI wrapper for the FA Grassroots Team Manager.
 *
 * Commands:
 *   list-fixtures               → prints JSON array of all fixtures
 *   get-fixture <fixture_id>    → prints JSON of one fixture (or null)
 *   save-fixture '<json>'       → upserts a fixture; prints { saved: true }
 *   list-actions                → prints JSON array of all actions
 *   save-action '<json>'        → upserts an action; prints { saved: true }
 *   update-action '<json>'      → updates an existing action; prints { updated: true }
 *
 * Environment variables required:
 *   GMAIL_CREDENTIALS_FILE      → path to Google OAuth client credentials JSON
 *   GMAIL_TOKEN_FILE            → path to Google OAuth token JSON
 *   GOOGLE_SHEETS_SPREADSHEET_ID
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

// ---- Auth ----

function loadAuth() {
  const credFile = process.env["GMAIL_CREDENTIALS_FILE"];
  const tokenFile = process.env["GMAIL_TOKEN_FILE"];
  if (!credFile || !tokenFile) {
    throw new Error("GMAIL_CREDENTIALS_FILE and GMAIL_TOKEN_FILE must be set");
  }

  const credentials = JSON.parse(
    fs.readFileSync(path.resolve(credFile), "utf-8")
  );
  const token = JSON.parse(fs.readFileSync(path.resolve(tokenFile), "utf-8"));

  const { client_secret, client_id, redirect_uris } =
    credentials.installed ?? credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

// ---- Schema ----

const FIXTURE_RANGE = "Fixtures!A:T";
const ACTION_RANGE = "Actions!A:H";

const FIXTURE_HEADERS = [
  "Fixture ID", "Competition", "Date", "Home Team", "Away Team", "Status",
  "Venue", "Home Contact Name", "Home Contact Email", "Home Contact Phone",
  "Away Contact Name", "Away Contact Email", "Away Contact Phone",
  "Fulltime URL", "Referee Name", "Referee Email", "Referee Phone",
  "Source Email ID", "Email Type", "Time TBC",
];

const ACTION_HEADERS = [
  "Action ID", "Fixture ID", "Action Type", "Due Date", "Status",
  "Created At", "Updated At", "Metadata",
];

// ---- Row conversion ----

type Fixture = Record<string, unknown>;
type Action = Record<string, unknown>;

function fixtureToRow(f: Fixture): string[] {
  const home = (f["home_contact"] as Record<string, string>) ?? {};
  const away = (f["away_contact"] as Record<string, string>) ?? {};
  const ref = (f["referee"] as Record<string, string> | null) ?? null;
  return [
    String(f["fixture_id"] ?? ""),
    String(f["competition"] ?? ""),
    String(f["date"] ?? ""),
    String(f["home_team"] ?? ""),
    String(f["away_team"] ?? ""),
    String(f["status"] ?? "Normal"),
    String(f["venue"] ?? ""),
    home["name"] ?? "",
    home["email"] ?? "",
    home["phone"] ?? "",
    away["name"] ?? "",
    away["email"] ?? "",
    away["phone"] ?? "",
    String(f["fulltime_url"] ?? ""),
    ref?.["name"] ?? "",
    ref?.["email"] ?? "",
    ref?.["phone"] ?? "",
    String(f["source_email_id"] ?? ""),
    String(f["email_type"] ?? "fixture_released"),
    f["time_tbc"] ? "TRUE" : "FALSE",
  ];
}

function rowToFixture(row: string[]): Fixture {
  const referee =
    row[14]
      ? { name: row[14], email: row[15] ?? "", phone: row[16] ?? "" }
      : null;
  return {
    fixture_id: row[0],
    competition: row[1],
    date: row[2],
    home_team: row[3],
    away_team: row[4],
    status: row[5],
    venue: row[6],
    home_contact: { name: row[7] ?? "", email: row[8] ?? "", phone: row[9] ?? "" },
    away_contact: { name: row[10] ?? "", email: row[11] ?? "", phone: row[12] ?? "" },
    fulltime_url: row[13] ?? "",
    referee,
    source_email_id: row[17] ?? "",
    email_type: row[18] ?? "fixture_released",
    time_tbc: (row[19] ?? "").toUpperCase() === "TRUE",
  };
}

function actionToRow(a: Action): string[] {
  return [
    String(a["action_id"] ?? ""),
    String(a["fixture_id"] ?? ""),
    String(a["action_type"] ?? ""),
    String(a["due_date"] ?? ""),
    String(a["status"] ?? "pending"),
    String(a["created_at"] ?? new Date().toISOString()),
    String(a["updated_at"] ?? new Date().toISOString()),
    a["metadata"] ? JSON.stringify(a["metadata"]) : "",
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

// ---- Sheets helpers ----

async function ensureSheetsExist(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<void> {
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set(
    res.data.sheets?.map((s) => s.properties?.title ?? "") ?? []
  );
  const toCreate = (["Fixtures", "Actions"] as const).filter(
    (name) => !existing.has(name)
  );
  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: toCreate.map((title) => ({
          addSheet: { properties: { title } },
        })),
      },
    });
  }
  await ensureHeaders(sheets, spreadsheetId, "Fixtures", FIXTURE_HEADERS);
  await ensureHeaders(sheets, spreadsheetId, "Actions", ACTION_HEADERS);
}

async function ensureHeaders(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheet: string,
  headers: string[]
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheet}!A1`,
  });
  const a1 = res.data.values?.[0]?.[0] ?? "";
  if (a1 === headers[0]) return;
  const colLetter = String.fromCharCode(64 + headers.length);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheet}!A1:${colLetter}1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [headers] },
  });
}

async function getRowIndex(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string,
  idColumn = "A"
): Promise<Map<string, number>> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${idColumn}:${idColumn}`,
  });
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
  // Store next available row as a sentinel under the empty-string key
  index.set("", maxRow + 1);
  return index;
}

// ---- Commands ----

async function listFixtures(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: FIXTURE_RANGE,
  });
  const values = res.data.values ?? [];
  const fixtures = values
    .slice(1)
    .filter((row) => row && row.length >= 3 && row[2])
    .map((row) => rowToFixture(row as string[]));
  console.log(JSON.stringify(fixtures, null, 2));
}

async function getFixture(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  fixtureId: string
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: FIXTURE_RANGE,
  });
  const values = res.data.values ?? [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row && row[0] === fixtureId) {
      console.log(JSON.stringify(rowToFixture(row as string[]), null, 2));
      return;
    }
  }
  console.log("null");
}

async function saveFixture(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  fixture: Fixture
): Promise<void> {
  const rowIndex = await getRowIndex(sheets, spreadsheetId, "Fixtures");
  const row = fixtureToRow(fixture);
  const fixtureId = String(fixture["fixture_id"]);
  const existingRow = rowIndex.get(fixtureId);
  const targetRow = existingRow ?? rowIndex.get("")!;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Fixtures!A${targetRow}:T${targetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  console.log(JSON.stringify({ saved: true, fixture_id: fixtureId }));
}

async function listActions(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: ACTION_RANGE,
  });
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
  console.log(JSON.stringify(actions, null, 2));
}

async function saveAction(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  action: Action
): Promise<void> {
  const rowIndex = await getRowIndex(sheets, spreadsheetId, "Actions");
  const row = actionToRow(action);
  const actionId = String(action["action_id"]);
  const existingRow = rowIndex.get(actionId);
  const targetRow = existingRow ?? rowIndex.get("")!;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Actions!A${targetRow}:H${targetRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  console.log(JSON.stringify({ saved: true, action_id: actionId }));
}

async function updateAction(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  action: Action
): Promise<void> {
  const rowIndex = await getRowIndex(sheets, spreadsheetId, "Actions");
  const actionId = String(action["action_id"]);
  const rowNum = rowIndex.get(actionId);
  if (rowNum === undefined) {
    console.error(`Action ${actionId} not found`);
    process.exit(1);
  }
  const row = actionToRow(action);
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Actions!A${rowNum}:H${rowNum}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
  console.log(JSON.stringify({ updated: true, action_id: actionId }));
}

// ---- Main ----

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  const spreadsheetId = process.env["GOOGLE_SHEETS_SPREADSHEET_ID"];
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID must be set");
  }

  const auth = loadAuth();
  const sheets = google.sheets({ version: "v4", auth });

  await ensureSheetsExist(sheets, spreadsheetId);

  switch (command) {
    case "list-fixtures":
      await listFixtures(sheets, spreadsheetId);
      break;
    case "get-fixture":
      if (!args[0]) throw new Error("Usage: sheets.ts get-fixture <fixture_id>");
      await getFixture(sheets, spreadsheetId, args[0]);
      break;
    case "save-fixture":
      if (!args[0]) throw new Error("Usage: sheets.ts save-fixture '<json>'");
      await saveFixture(sheets, spreadsheetId, JSON.parse(args[0]) as Fixture);
      break;
    case "list-actions":
      await listActions(sheets, spreadsheetId);
      break;
    case "save-action":
      if (!args[0]) throw new Error("Usage: sheets.ts save-action '<json>'");
      await saveAction(sheets, spreadsheetId, JSON.parse(args[0]) as Action);
      break;
    case "update-action":
      if (!args[0]) throw new Error("Usage: sheets.ts update-action '<json>'");
      await updateAction(sheets, spreadsheetId, JSON.parse(args[0]) as Action);
      break;
    default:
      console.error(
        "Unknown command. Valid commands: list-fixtures, get-fixture, save-fixture, list-actions, save-action, update-action"
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
