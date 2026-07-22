import fs from 'fs';
import os from 'os';
import path from 'path';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inboxzer0-test-'));
process.env.INBOXZER0_DATA_DIR = tmpDir;

const { encrypt, decrypt } = await import('./dist/store/secretsStore.js');
const dataStore = await import('./dist/store/dataStore.js');

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

// Encryption round trip.
{
  const secret = 'wachtwoord-met-ë-en-café-tekens';
  const encrypted = encrypt(secret);
  assertEqual(encrypted === secret, false, 'ciphertext differs from plaintext');
  assertEqual(decrypt(encrypted), secret, 'decrypt reverses encrypt exactly');
}

// The on-disk file should never contain the plaintext password.
{
  dataStore.addMailbox({
    displayName: 'Test IMAP',
    emailAddress: 'test@voorbeeld.nl',
    provider: 'imap',
    imapCredentials: {
      host: 'imap.voorbeeld.nl',
      port: 993,
      username: 'test@voorbeeld.nl',
      password: 'super-geheim-123',
      useSsl: true,
    },
  });
  const raw = fs.readFileSync(path.join(tmpDir, 'app-data.enc'), 'utf8');
  assertEqual(raw.includes('super-geheim-123'), false, 'plaintext password never touches disk');
}

// Mailbox CRUD.
{
  const mailboxes = dataStore.getMailboxes();
  assertEqual(mailboxes.length, 1, 'one mailbox stored');
  assertEqual(mailboxes[0].imapCredentials.password, 'super-geheim-123', 'password round-trips correctly via decrypt');

  const second = dataStore.addMailbox({
    displayName: 'Werk',
    emailAddress: 'werk@koskamp.nl',
    provider: 'm365',
  });
  assertEqual(dataStore.getMailboxes().length, 2, 'two mailboxes after second add');
  assertEqual(second.order, 1, 'second mailbox gets order 1');

  const reordered = dataStore.reorderMailboxes([second.id, mailboxes[0].id]);
  assertEqual(reordered.map((m) => m.order), [0, 1], 'reorder reassigns order by position');

  dataStore.removeMailbox(second.id);
  assertEqual(dataStore.getMailboxes().length, 1, 'one mailbox after removal');
}

// Contacts top-10 behavior.
{
  dataStore.recordContactUsed({ name: 'Sanne', email: 'sanne@koskamp.nl' });
  dataStore.recordContactUsed({ name: 'Sanne', email: 'SANNE@koskamp.nl' }); // case-insensitive same contact
  const contacts = dataStore.getContacts();
  assertEqual(contacts.length, 1, 'case-insensitive email dedupes to one contact');
  assertEqual(contacts[0].useCount, 2, 'useCount increments on repeat contact');
}

// AI settings + writing style persist.
{
  dataStore.setAISettings({ provider: 'openai', apiKey: 'sk-test-123' });
  assertEqual(dataStore.getAISettings(), { provider: 'openai', apiKey: 'sk-test-123' }, 'AI settings round-trip');

  dataStore.setWritingStyle({ mode: 'url', pastedText: '', url: 'https://example.com/style.txt' });
  assertEqual(
    dataStore.getWritingStyle(),
    { mode: 'url', pastedText: '', url: 'https://example.com/style.txt' },
    'writing style round-trip'
  );
}

fs.rmSync(tmpDir, { recursive: true, force: true });

if (failures > 0) {
  console.error(`${failures} assertion(s) failed`);
  process.exitCode = 1;
} else {
  console.log('All dataStore/secretsStore tests passed.');
}
