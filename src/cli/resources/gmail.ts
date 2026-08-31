/**
 * Gmail commands for the Orcas fixture-management tooling.
 *
 * Ported from the v1 `container/tools/gmail-scan.ts` and `gmail-draft.ts` CLI
 * scripts — logic unchanged, moved host-side. See `sheets.ts` in this
 * directory and `.nanoclaw-migrations/container-runner-credentials.md`.
 */
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

import { loadGoogleAuth } from '../../google-auth.js';
import { register } from '../registry.js';

/** Recursively extract the plain-text body from a Gmail message payload. */
function extractBody(payload: Record<string, unknown>): string {
  const mimeType = payload['mimeType'] as string | undefined;
  const bodyData = (payload['body'] as Record<string, unknown> | undefined)?.['data'] as string | undefined;
  if (mimeType === 'text/plain' && bodyData) {
    return Buffer.from(bodyData, 'base64url').toString('utf-8');
  }
  const parts = payload['parts'] as Record<string, unknown>[] | undefined;
  if (parts) {
    for (const part of parts) {
      const text = extractBody(part);
      if (text) return text;
    }
  }
  return '';
}

/** Build a base64url-encoded RFC 2822 message, optionally with a PDF attachment. */
function buildRawMessage(to: string, subject: string, body: string, attachmentPath?: string): string {
  const boundary = 'boundary_' + Date.now().toString(36);
  let message: string;
  if (attachmentPath) {
    const pdfData = fs.readFileSync(attachmentPath);
    const pdfBase64 = pdfData.toString('base64');
    const filename = path.basename(attachmentPath);
    message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="${filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${filename}"`,
      '',
      pdfBase64,
      '',
      `--${boundary}--`,
    ].join('\r\n');
  } else {
    message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body,
    ].join('\r\n');
  }
  return Buffer.from(message).toString('base64url');
}

register({
  name: 'gmail-scan',
  description: 'Scan Gmail for fixture emails matching a query; returns { id, subject, from, date, body }[].',
  access: 'open',
  parseArgs: (raw) => ({
    query: typeof raw.query === 'string' && raw.query ? raw.query : 'from:donotreplyfulltime@thefa.com',
    maxResults: typeof raw.maxResults === 'number' ? raw.maxResults : 10,
  }),
  handler: async ({ query, maxResults }) => {
    const auth = loadGoogleAuth();
    const gmail = google.gmail({ version: 'v1', auth });

    const listRes = await gmail.users.messages.list({ userId: 'me', q: query, maxResults });
    const messageIds = (listRes.data.messages ?? []).map((m) => m.id!).filter(Boolean);

    const emails = [];
    for (const id of messageIds) {
      const msgRes = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });
      const raw = msgRes.data;
      const headers = Object.fromEntries((raw.payload?.headers ?? []).map((h) => [h.name!, h.value!]));
      const body = extractBody((raw.payload ?? {}) as Record<string, unknown>);
      emails.push({
        id: raw.id!,
        subject: headers['Subject'] ?? '',
        from: headers['From'] ?? '',
        date: headers['Date'] ?? '',
        body,
      });
    }
    return emails;
  },
});

register({
  name: 'gmail-draft-create',
  description: 'Create a Gmail draft. Returns { draft_id }.',
  access: 'open',
  parseArgs: (raw) => {
    const to = raw.to;
    const subject = raw.subject;
    const body = raw.body;
    if (typeof to !== 'string' || !to) throw new Error('to is required');
    if (typeof subject !== 'string' || !subject) throw new Error('subject is required');
    if (typeof body !== 'string' || !body) throw new Error('body is required');
    const attachmentPath = typeof raw.attachmentPath === 'string' ? raw.attachmentPath : undefined;
    return { to, subject, body, attachmentPath };
  },
  handler: async ({ to, subject, body, attachmentPath }) => {
    const auth = loadGoogleAuth();
    const gmail = google.gmail({ version: 'v1', auth });
    const raw = buildRawMessage(to, subject, body, attachmentPath);
    const res = await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw } } });
    return { draft_id: res.data.id! };
  },
});
