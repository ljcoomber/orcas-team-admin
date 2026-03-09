#!/usr/bin/env npx tsx
/**
 * gmail-scan.ts — Gmail scanner CLI for the FA Grassroots Team Manager.
 *
 * Fetches unread fixture emails and prints them as a JSON array to stdout.
 * Each email: { id, subject, from, date, body }
 *
 * Environment variables required:
 *   GMAIL_CREDENTIALS_FILE   → path to Google OAuth client credentials JSON
 *   GMAIL_TOKEN_FILE         → path to Google OAuth token JSON
 *   GMAIL_FIXTURE_QUERY      → Gmail search query (default: from:donotreplyfulltime@thefa.com)
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

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

/** Recursively extract the plain-text body from a Gmail message payload. */
function extractBody(payload: Record<string, unknown>): string {
  const mimeType = payload["mimeType"] as string | undefined;
  const bodyData = (
    payload["body"] as Record<string, unknown> | undefined
  )?.["data"] as string | undefined;

  if (mimeType === "text/plain" && bodyData) {
    return Buffer.from(bodyData, "base64url").toString("utf-8");
  }

  const parts = payload["parts"] as Record<string, unknown>[] | undefined;
  if (parts) {
    for (const part of parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  return "";
}

async function main(): Promise<void> {
  const query =
    process.env["GMAIL_FIXTURE_QUERY"] ??
    "from:donotreplyfulltime@thefa.com";
  const maxResults = Number(process.argv[2] ?? 10);

  const auth = loadAuth();
  const gmail = google.gmail({ version: "v1", auth });

  // List matching messages
  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults,
  });

  const messageIds = (listRes.data.messages ?? [])
    .map((m) => m.id!)
    .filter(Boolean);

  // Fetch each message
  const emails = [];
  for (const id of messageIds) {
    const msgRes = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
    const raw = msgRes.data;
    const headers = Object.fromEntries(
      (raw.payload?.headers ?? []).map((h) => [h.name!, h.value!])
    );
    const body = extractBody(
      (raw.payload ?? {}) as Record<string, unknown>
    );
    emails.push({
      id: raw.id!,
      subject: headers["Subject"] ?? "",
      from: headers["From"] ?? "",
      date: headers["Date"] ?? "",
      body,
    });
  }

  console.log(JSON.stringify(emails, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
