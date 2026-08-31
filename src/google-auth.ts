/**
 * Google OAuth2 client for the Orcas fixture-management tooling
 * (Sheets + Gmail). Host-side only — see docs/SECURITY.md and
 * `.nanoclaw-migrations/container-runner-credentials.md` for why: v2's
 * no-credentials-in-agent-container invariant means `credentials.json` and
 * `token.json` must never be read from inside a container. This module runs
 * only from `src/cli/resources/{sheets,gmail}.ts`, dispatched via the
 * `cli_request`/`cli_response` mailbox mechanism, so the raw OAuth material
 * never leaves the host process.
 */
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { readEnvFile } from './env.js';

export function loadGoogleAuth(projectRoot?: string): InstanceType<typeof google.auth.OAuth2> {
  const root = projectRoot ?? process.cwd();
  const { GMAIL_CREDENTIALS_FILE, GMAIL_TOKEN_FILE } = readEnvFile(
    ['GMAIL_CREDENTIALS_FILE', 'GMAIL_TOKEN_FILE'],
    root,
  );
  if (!GMAIL_CREDENTIALS_FILE || !GMAIL_TOKEN_FILE) {
    throw new Error('GMAIL_CREDENTIALS_FILE and GMAIL_TOKEN_FILE must be set in .env');
  }

  const credPath = path.resolve(root, GMAIL_CREDENTIALS_FILE);
  const tokenPath = path.resolve(root, GMAIL_TOKEN_FILE);
  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));

  const { client_secret, client_id, redirect_uris } = credentials.installed ?? credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

export function googleSheetsSpreadsheetId(projectRoot?: string): string {
  const root = projectRoot ?? process.cwd();
  const { GOOGLE_SHEETS_SPREADSHEET_ID } = readEnvFile(['GOOGLE_SHEETS_SPREADSHEET_ID'], root);
  if (!GOOGLE_SHEETS_SPREADSHEET_ID) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID must be set in .env');
  }
  return GOOGLE_SHEETS_SPREADSHEET_ID;
}
