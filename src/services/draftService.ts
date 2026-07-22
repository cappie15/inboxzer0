import { Mailbox, EmailMessage } from '../utils/types';
import { getImapCredentials } from './imapCredentialsStore';
import { ImapClient } from './imap/ImapClient';
import { buildForwardDraft, buildReplyDraft } from './imap/mimeMessage';

async function withImapClient(
  mailbox: Mailbox,
  action: (client: ImapClient) => Promise<void>
): Promise<void> {
  if (mailbox.provider !== 'imap') {
    // M365/Gmail draft-opslag via Graph/Gmail API volgt zodra er OAuth Client
    // ID's zijn geconfigureerd (zie Instellingen) — voor nu een no-op.
    return;
  }

  const credentials = await getImapCredentials(mailbox.id);
  if (!credentials) {
    throw new Error('Geen IMAP-inloggegevens gevonden voor deze mailbox.');
  }

  const client = new ImapClient(credentials);
  try {
    await client.connect();
    await client.login();
    await action(client);
  } finally {
    try {
      await client.logout();
    } catch {
      client.disconnect();
    }
  }
}

export async function saveForwardDraft(
  mailbox: Mailbox,
  message: EmailMessage,
  recipient: { name: string; email: string },
  note: string
): Promise<void> {
  await withImapClient(mailbox, async (client) => {
    const raw = buildForwardDraft({
      fromAddress: mailbox.emailAddress,
      toAddress: recipient.email,
      toName: recipient.name,
      note,
      original: message,
    });
    await client.appendMessage('Drafts', raw, ['\\Seen', '\\Draft']);
  });
}

export async function saveReplyDraft(
  mailbox: Mailbox,
  message: EmailMessage,
  mode: 'reply' | 'replyAll',
  replyBody: string
): Promise<void> {
  await withImapClient(mailbox, async (client) => {
    const raw = buildReplyDraft({
      fromAddress: mailbox.emailAddress,
      replyBody,
      original: message,
      mode,
    });
    await client.appendMessage('Drafts', raw, ['\\Seen', '\\Draft']);
  });
}
