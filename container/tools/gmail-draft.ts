#!/usr/bin/env npx tsx
/**
 * gmail-draft.ts — Gmail draft creator CLI for the FA Grassroots Team Manager.
 *
 * Usage:
 *   npx tsx tools/gmail-draft.ts create '<to>' '<subject>' '<body>' [attachment_path]
 *
 * Prints the created Gmail draft ID as JSON: { "draft_id": "..." }
 *
 * Environment variables required:
 *   GMAIL_CREDENTIALS_FILE   → path to Google OAuth client credentials JSON
 *   GMAIL_TOKEN_FILE         → path to Google OAuth token JSON
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

/** Build a base64url-encoded RFC 2822 message, optionally with a PDF attachment. */
function buildRawMessage(
  to: string,
  subject: string,
  body: string,
  attachmentPath?: string
): string {
  const boundary = "boundary_" + Date.now().toString(36);

  let message: string;

  if (attachmentPath) {
    const pdfData = fs.readFileSync(attachmentPath);
    const pdfBase64 = pdfData.toString("base64");
    const filename = path.basename(attachmentPath);

    message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
      "",
      `--${boundary}`,
      `Content-Type: application/pdf; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      pdfBase64,
      "",
      `--${boundary}--`,
    ].join("\r\n");
  } else {
    message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
    ].join("\r\n");
  }

  return Buffer.from(message).toString("base64url");
}

async function main(): Promise<void> {
  const [, , command, to, subject, body, attachmentPath] = process.argv;

  if (command !== "create" || !to || !subject || !body) {
    console.error(
      "Usage: gmail-draft.ts create '<to>' '<subject>' '<body>' [attachment_path]"
    );
    process.exit(1);
  }

  const auth = loadAuth();
  const gmail = google.gmail({ version: "v1", auth });

  const raw = buildRawMessage(to, subject, body, attachmentPath);
  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw } },
  });

  console.log(JSON.stringify({ draft_id: res.data.id! }));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
