// End-to-end HTTP test of the real Express server + a real local fake-IMAP
// TCP server, exercising the full add-mailbox -> fetch-messages -> mark-read
// -> archive -> forward-draft -> reply-draft flow over actual HTTP.
import fs from 'fs';
import os from 'os';
import path from 'path';
import net from 'net';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inboxzer0-api-test-'));
process.env.INBOXZER0_DATA_DIR = tmpDir;

let failures = 0;
function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL: ${label}\n  actual:   ${a}\n  expected: ${e}`);
    failures++;
  } else {
    console.log(`PASS: ${label}`);
  }
}

// --- Fake IMAP server (byte-accurate line/literal handling) ---
const header = 'From: Sanne de Vries <s.devries@koskamp.nl>\r\nSubject: Contract review\r\n\r\n';
let currentFlags = ['\\Seen'];
const appendedRawMessages = [];

const imapServer = net.createServer((socket) => {
  socket.write('* OK IMAP4rev1 Service Ready\r\n');
  let buffer = Buffer.alloc(0);
  let awaitingLiteral = null;

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    if (awaitingLiteral) {
      const { tag, expectedBytes } = awaitingLiteral;
      if (buffer.length < expectedBytes + 2) return;
      appendedRawMessages.push(buffer.subarray(0, expectedBytes).toString('utf8'));
      buffer = buffer.subarray(expectedBytes + 2);
      awaitingLiteral = null;
      socket.write(`${tag} OK APPEND completed\r\n`);
      return;
    }

    const idx = buffer.indexOf('\r\n');
    if (idx === -1) return;
    const line = buffer.subarray(0, idx).toString('utf8');
    buffer = buffer.subarray(idx + 2);

    const [tag, ...rest] = line.split(' ');
    const command = rest.join(' ');

    if (command.startsWith('LOGIN')) {
      socket.write(`${tag} OK LOGIN completed\r\n`);
    } else if (command.startsWith('SELECT')) {
      socket.write(`* 3 EXISTS\r\n${tag} OK [READ-WRITE] SELECT completed\r\n`);
    } else if (command.startsWith('FETCH')) {
      socket.write(
        `* 3 FETCH (UID 105 FLAGS (${currentFlags.join(' ')}) BODY[HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE)] {${header.length}}\r\n` +
          header +
          `)\r\n${tag} OK FETCH completed\r\n`
      );
    } else if (command.startsWith('UID STORE') && command.includes('+FLAGS')) {
      currentFlags = ['\\Seen'];
      socket.write(`${tag} OK STORE completed\r\n`);
    } else if (command.startsWith('UID MOVE')) {
      socket.write(`${tag} OK MOVE completed\r\n`);
    } else if (command.startsWith('APPEND')) {
      const sizeMatch = /\{(\d+)\}$/.exec(command);
      awaitingLiteral = { tag, expectedBytes: parseInt(sizeMatch[1], 10) };
      socket.write('+ Ready\r\n');
    } else if (command.startsWith('LOGOUT')) {
      socket.write(`* BYE\r\n${tag} OK LOGOUT completed\r\n`);
    } else {
      socket.write(`${tag} BAD unknown\r\n`);
    }
  });
});

const IMAP_PORT = 27993;
const API_PORT = 27400;
await new Promise((resolve) => imapServer.listen(IMAP_PORT, '127.0.0.1', resolve));
console.log(`Fake IMAP server on 127.0.0.1:${IMAP_PORT}`);

process.env.PORT = String(API_PORT);
await import('./dist/index.js');
await new Promise((r) => setTimeout(r, 300));

const base = `http://127.0.0.1:${API_PORT}`;
async function api(method, urlPath, body) {
  const res = await fetch(base + urlPath, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = text;
  }
  return { status: res.status, body: json };
}

// Health check.
{
  const { status, body } = await api('GET', '/api/health');
  assertEqual(status, 200, 'GET /api/health returns 200');
  assertEqual(body, { status: 'ok' }, 'health payload correct');
}

// Add an IMAP mailbox — should connect to the fake server to validate credentials.
let mailboxId;
{
  const { status, body } = await api('POST', '/api/mailboxes', {
    displayName: 'Klantenservice',
    emailAddress: 'support@koskamp.nl',
    provider: 'imap',
    imapCredentials: {
      host: '127.0.0.1',
      port: IMAP_PORT,
      username: 'support@koskamp.nl',
      password: 'geheim123',
      useSsl: false,
    },
  });
  assertEqual(status, 201, 'POST /api/mailboxes returns 201 after successful credential check');
  assertEqual(body.hasImapCredentials, true, 'response reports hasImapCredentials without leaking the password');
  assertEqual(body.password, undefined, 'password field is never included in the response');
  mailboxId = body.id;
}

// Reject a mailbox with unreachable IMAP credentials.
{
  const { status, body } = await api('POST', '/api/mailboxes', {
    displayName: 'Broken',
    emailAddress: 'broken@koskamp.nl',
    provider: 'imap',
    imapCredentials: {
      host: '127.0.0.1',
      port: 1, // nothing listening here
      username: 'x',
      password: 'y',
      useSsl: false,
    },
  });
  assertEqual(status, 422, 'unreachable IMAP credentials are rejected at add-time with 422');
  assertEqual(typeof body.error === 'string' && body.error.length > 0, true, 'error message present');
}

// M365 mailbox (no OAuth yet) should still be accepted, without credential verification.
{
  const { status } = await api('POST', '/api/mailboxes', {
    displayName: 'Werk',
    emailAddress: 'b.wilbers@koskamp.nl',
    provider: 'm365',
  });
  assertEqual(status, 201, 'non-IMAP mailbox is accepted without connection check');
}

// List mailboxes.
{
  const { body } = await api('GET', '/api/mailboxes');
  assertEqual(body.length, 2, 'two mailboxes listed (IMAP + M365)');
}

// Fetch messages for the IMAP mailbox.
{
  const { status, body } = await api('GET', `/api/mailboxes/${mailboxId}/messages`);
  assertEqual(status, 200, 'GET messages returns 200');
  assertEqual(body.messages.length, 1, 'one message fetched from fake IMAP server');
  assertEqual(body.messages[0].subject, 'Contract review', 'subject parsed correctly end-to-end over HTTP');
  assertEqual(body.messages[0].imapUid, 105, 'UID parsed correctly end-to-end over HTTP');
}

// Fetch messages for the non-IMAP mailbox -> graceful "not configured" notice, not an error.
{
  const mailboxes = (await api('GET', '/api/mailboxes')).body;
  const m365 = mailboxes.find((m) => m.provider === 'm365');
  const { status, body } = await api('GET', `/api/mailboxes/${m365.id}/messages`);
  assertEqual(status, 200, 'M365 mailbox message fetch returns 200 (not an error)');
  assertEqual(body.messages, [], 'M365 mailbox returns empty message list');
  assertEqual(typeof body.notice, 'string', 'M365 mailbox includes a human-readable notice');
}

// Mark read, archive.
{
  const read = await api('POST', `/api/mailboxes/${mailboxId}/messages/105/read`, { seen: true });
  assertEqual(read.status, 204, 'mark-as-read returns 204');

  const archive = await api('POST', `/api/mailboxes/${mailboxId}/messages/105/archive`, {});
  assertEqual(archive.status, 204, 'archive returns 204');
}

// Forward + reply draft saving (real APPEND against the fake server).
{
  const original = {
    id: 'x',
    mailboxId,
    from: { name: 'Sanne de Vries', email: 's.devries@koskamp.nl' },
    to: [{ name: 'B. Wilbers', email: 'b.wilbers@koskamp.nl' }],
    cc: [],
    bcc: [],
    subject: 'Contract review',
    preview: '',
    body: 'Hoi, kijk je even mee? Groet, Sanne',
    receivedAt: new Date().toISOString(),
    isRead: true,
    attachments: [],
    imapUid: 105,
  };

  const forward = await api('POST', `/api/mailboxes/${mailboxId}/messages/105/forward-draft`, {
    recipient: { name: 'Collega A', email: 'collega.a@koskamp.nl' },
    note: 'Kun je hier even naar kijken?',
    original,
  });
  assertEqual(forward.status, 204, 'forward-draft returns 204');

  const reply = await api('POST', `/api/mailboxes/${mailboxId}/messages/105/reply-draft`, {
    mode: 'reply',
    replyBody: 'Bedankt, ik kijk er vrijdag naar.',
    original,
  });
  assertEqual(reply.status, 204, 'reply-draft returns 204');

  assertEqual(appendedRawMessages.length, 2, 'two drafts actually APPENDed to the fake IMAP server');
  assertEqual(appendedRawMessages[0].includes('Kun je hier even naar kijken?'), true, 'forward draft contains the AI note');
  assertEqual(appendedRawMessages[1].includes('Bedankt, ik kijk er vrijdag naar.'), true, 'reply draft contains the reply body');
}

// Settings + contacts.
{
  const ai = await api('PUT', '/api/settings/ai', { provider: 'openai', apiKey: 'sk-test' });
  assertEqual(ai.body, { provider: 'openai', apiKey: 'sk-test' }, 'AI settings update round-trips over HTTP');

  const style = await api('PUT', '/api/settings/writing-style', { mode: 'paste', pastedText: 'Groetjes!', url: '' });
  assertEqual(style.body.pastedText, 'Groetjes!', 'writing style update round-trips over HTTP');

  const contacts = await api('GET', '/api/contacts');
  assertEqual(Array.isArray(contacts.body), true, 'contacts endpoint returns an array');
}

// Reorder + delete.
{
  const mailboxes = (await api('GET', '/api/mailboxes')).body;
  const ids = mailboxes.map((m) => m.id).reverse();
  const reordered = await api('POST', '/api/mailboxes/reorder', { orderedIds: ids });
  assertEqual(reordered.body.map((m) => m.order), [0, 1], 'reorder assigns sequential order over HTTP');

  const del = await api('DELETE', `/api/mailboxes/${mailboxId}`);
  assertEqual(del.status, 204, 'delete mailbox returns 204');
  const afterDelete = await api('GET', '/api/mailboxes');
  assertEqual(afterDelete.body.length, 1, 'one mailbox remains after delete');
}

fs.rmSync(tmpDir, { recursive: true, force: true });
imapServer.close();

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exitCode = 1;
} else {
  console.log('All API end-to-end tests passed.');
}
process.exit(failures > 0 ? 1 : 0);
