import { EmailMessage, Mailbox, SwipeDirection } from '../../utils/types';
import { getImapCredentials } from '../imapCredentialsStore';
import { ImapClient, ImapFetchedMessage } from './ImapClient';
import { decodeSubject, parseAddressList, parseHeaderBlock } from './headerParse';

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

/**
 * Connects to a mailbox's configured IMAP account, fetches the most recent
 * messages from INBOX and maps them onto the app's EmailMessage shape.
 * Returns an empty list (rather than throwing) when no credentials are
 * stored yet, so callers can freely mix this with mock/mailbox data.
 */
export async function fetchImapMessages(
  mailbox: Mailbox,
  limit: number = DEFAULT_FETCH_LIMIT
): Promise<EmailMessage[]> {
  if (mailbox.provider !== 'imap') return [];

  const credentials = await getImapCredentials(mailbox.id);
  if (!credentials) return [];

  const client = new ImapClient(credentials);
  try {
    await client.connect();
    await client.login();
    const { exists } = await client.selectMailbox('INBOX');
    const fetched = await client.fetchRecentHeaders(exists, limit);
    return fetched.map((msg) => toEmailMessage(mailbox.id, msg));
  } finally {
    try {
      await client.logout();
    } catch {
      client.disconnect();
    }
  }
}

/**
 * Applies the result of a swipe back onto the real IMAP mailbox for
 * messages that came from one (i.e. have an `imapUid`). Opens a short-lived
 * connection per call — simpler and more robust than keeping a persistent
 * session connection alive, at the cost of a small amount of latency per
 * action. Never throws: a failed write-back is logged, not surfaced to the
 * swipe UI, since the local queue state has already moved on.
 */
export async function applyImapSwipeAction(
  message: EmailMessage,
  direction: SwipeDirection
): Promise<void> {
  if (message.imapUid === undefined) return;

  const credentials = await getImapCredentials(message.mailboxId);
  if (!credentials) return;

  const client = new ImapClient(credentials);
  try {
    await client.connect();
    await client.login();
    await client.selectMailbox('INBOX');

    const shouldMarkRead = direction !== 'down';
    await client.setSeen(message.imapUid, shouldMarkRead);

    if (direction === 'right') {
      await client.moveToFolder(message.imapUid, ARCHIVE_FOLDER_NAME);
    }
  } catch (err) {
    console.warn('IMAP swipe-actie kon niet worden doorgevoerd op de server:', err);
  } finally {
    try {
      await client.logout();
    } catch {
      client.disconnect();
    }
  }
}
