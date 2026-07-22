import { EmailMessage, ImapCredentials } from '../types';
import { ImapClient, ImapFetchedMessage } from '../imap/ImapClient';
import { decodeSubject, parseAddressList, parseHeaderBlock } from '../imap/headerParse';
import { buildForwardDraft, buildReplyDraft } from '../imap/mimeMessage';

const DEFAULT_FETCH_LIMIT = 30;
const ARCHIVE_FOLDER_NAME = 'Archive';

function parseImapDate(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function toEmailMessage(mailboxId: string, fetched: ImapFetchedMessage): EmailMessage {
  const headers = parseHeaderBlock(fetched.headerBlock);
  const fromAddresses = parseAddressList(headers.from);

  return {
    id: `imap-${mailboxId}-${fetched.uid}`,
    mailboxId,
    from: fromAddresses[0] ?? { name: headers.from ?? '(onbekend)', email: headers.from ?? '' },
    to: parseAddressList(headers.to),
    cc: parseAddressList(headers.cc),
    bcc: parseAddressList(headers.bcc),
    subject: decodeSubject(headers.subject) || '(geen onderwerp)',
    preview: '',
    body: '',
    receivedAt: parseImapDate(headers.date),
    isRead: fetched.flags.includes('\\Seen'),
    attachments: [],
    imapUid: fetched.uid,
  };
}

/** Opens a connection, runs `action`, and always logs out / disconnects afterwards. */
async function withClient<T>(
  credentials: ImapCredentials,
  action: (client: ImapClient) => Promise<T>
): Promise<T> {
  const client = new ImapClient(credentials);
  try {
    await client.connect();
    await client.login();
    return await action(client);
  } finally {
    try {
      await client.logout();
    } catch {
      client.disconnect();
    }
  }
}

/** Validates credentials by connecting and selecting INBOX, without leaving anything open. */
export async function verifyImapCredentials(credentials: ImapCredentials): Promise<void> {
  await withClient(credentials, async (client) => {
    await client.selectMailbox('INBOX');
  });
}

export async function fetchImapMessages(
  mailboxId: string,
  credentials: ImapCredentials,
  limit: number = DEFAULT_FETCH_LIMIT
): Promise<EmailMessage[]> {
  return withClient(credentials, async (client) => {
    const { exists } = await client.selectMailbox('INBOX');
    const fetched = await client.fetchRecentHeaders(exists, limit);
    return fetched.map((msg) => toEmailMessage(mailboxId, msg));
  });
}

export async function setMessageSeen(
  credentials: ImapCredentials,
  uid: number,
  seen: boolean
): Promise<void> {
  await withClient(credentials, async (client) => {
    await client.selectMailbox('INBOX');
    await client.setSeen(uid, seen);
  });
}

export async function archiveMessage(
  credentials: ImapCredentials,
  uid: number,
  folder: string = ARCHIVE_FOLDER_NAME
): Promise<void> {
  await withClient(credentials, async (client) => {
    await client.selectMailbox('INBOX');
    await client.setSeen(uid, true);
    await client.moveToFolder(uid, folder);
  });
}

export async function saveForwardDraft(
  credentials: ImapCredentials,
  fromAddress: string,
  recipient: { name: string; email: string },
  note: string,
  original: EmailMessage
): Promise<void> {
  await withClient(credentials, async (client) => {
    const raw = buildForwardDraft({
      fromAddress,
      toAddress: recipient.email,
      toName: recipient.name,
      note,
      original,
    });
    await client.appendMessage('Drafts', raw, ['\\Seen', '\\Draft']);
  });
}

export async function saveReplyDraft(
  credentials: ImapCredentials,
  fromAddress: string,
  mode: 'reply' | 'replyAll',
  replyBody: string,
  original: EmailMessage
): Promise<void> {
  await withClient(credentials, async (client) => {
    const raw = buildReplyDraft({ fromAddress, replyBody, original, mode });
    await client.appendMessage('Drafts', raw, ['\\Seen', '\\Draft']);
  });
}
