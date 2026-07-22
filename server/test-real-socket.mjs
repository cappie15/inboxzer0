// Real end-to-end test: a plain TCP server (net, not tls — useSsl:false) plus
// the ACTUAL compiled ImapClient, no mocks. Validates the full stack works
// against a real socket, not just simulated event callbacks.
import net from 'net';
import { ImapClient } from './dist/imap/ImapClient.js';

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

const header = 'From: Sanne de Vries <s.devries@koskamp.nl>\r\nSubject: Contract review\r\n\r\n';

const server = net.createServer((socket) => {
  socket.write('* OK IMAP4rev1 Service Ready\r\n');
  let buffer = Buffer.alloc(0); // raw bytes — byte-accurate for the literal-waiting phase
  let awaitingLiteral = null;

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    if (awaitingLiteral) {
      const { tag, expectedBytes } = awaitingLiteral;
      if (buffer.length < expectedBytes + 2) return; // +2 for trailing \r\n
      const literal = buffer.subarray(0, expectedBytes).toString('utf8');
      buffer = buffer.subarray(expectedBytes + 2);
      awaitingLiteral = null;
      const actualBytes = Buffer.byteLength(literal, 'utf8');
      assertEqual(actualBytes, expectedBytes, 'APPEND literal byte length matches declared {N}');
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
      socket.write(`* 5 EXISTS\r\n* 0 RECENT\r\n${tag} OK [READ-WRITE] SELECT completed\r\n`);
    } else if (command.startsWith('FETCH')) {
      socket.write(
        `* 5 FETCH (UID 105 FLAGS (\\Seen) BODY[HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE)] {${header.length}}\r\n` +
          header +
          `)\r\n${tag} OK FETCH completed\r\n`
      );
    } else if (command.startsWith('UID STORE')) {
      socket.write(`${tag} OK STORE completed\r\n`);
    } else if (command.startsWith('UID MOVE')) {
      socket.write(`${tag} OK MOVE completed\r\n`);
    } else if (command.startsWith('APPEND')) {
      const sizeMatch = /\{(\d+)\}$/.exec(command);
      awaitingLiteral = { tag, expectedBytes: parseInt(sizeMatch[1], 10) };
      socket.write('+ Ready for literal data\r\n');
    } else if (command.startsWith('LOGOUT')) {
      socket.write(`* BYE logging out\r\n${tag} OK LOGOUT completed\r\n`);
    } else {
      socket.write(`${tag} BAD unknown command\r\n`);
    }
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
console.log(`Test IMAP server listening on 127.0.0.1:${port}`);

const client = new ImapClient({
  host: '127.0.0.1',
  port,
  username: 'test@voorbeeld.nl',
  password: 'geheim123',
  useSsl: false,
});

await client.connect();
console.log('PASS: connect() over a real TCP socket');

await client.login();
console.log('PASS: login()');

const { exists } = await client.selectMailbox('INBOX');
assertEqual(exists, 5, 'selectMailbox() parses EXISTS over real socket');

const messages = await client.fetchRecentHeaders(exists, 10);
assertEqual(messages.length, 1, 'fetchRecentHeaders() over real socket');
assertEqual(messages[0].uid, 105, 'correct UID over real socket');
assertEqual(messages[0].headerBlock, header, 'correct header block over real socket');

await client.setSeen(105, true);
console.log('PASS: setSeen()');

await client.moveToFolder(105, 'Archive');
console.log('PASS: moveToFolder()');

// Message with accented characters, to stress the real-socket byte-length path end-to-end.
const draft =
  'From: b.wilbers@koskamp.nl\r\nTo: Erik Smits <e.smits@partner-bv.nl>\r\nSubject: Fwd: Voorstel\r\n\r\nHoi Erik — succes ermee! ë ü café';
await client.appendMessage('Drafts', draft, ['\\Seen', '\\Draft']);
console.log('PASS: appendMessage() with accented characters over real socket');

await client.logout();
console.log('PASS: logout()');

server.close();

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exitCode = 1;
} else {
  console.log('All real-socket ImapClient tests passed.');
}
