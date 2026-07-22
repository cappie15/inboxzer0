import { Router } from 'express';
import * as dataStore from '../store/dataStore';
import {
  archiveMessage,
  fetchImapMessages,
  saveForwardDraft,
  saveReplyDraft,
  setMessageSeen,
} from '../services/imapMessageService';

export const messagesRouter = Router();

function requireImapMailbox(mailboxId: string, res: import('express').Response) {
  const mailbox = dataStore.getMailboxById(mailboxId);
  if (!mailbox) {
    res.status(404).json({ error: 'Mailbox niet gevonden.' });
    return undefined;
  }
  if (mailbox.provider !== 'imap' || !mailbox.imapCredentials) {
    res.status(200).json({ messages: [], notice: `${mailbox.provider.toUpperCase()} OAuth is nog niet geconfigureerd voor deze mailbox.` });
    return undefined;
  }
  return mailbox;
}

messagesRouter.get('/:mailboxId/messages', async (req, res) => {
  const mailbox = requireImapMailbox(req.params.mailboxId, res);
  if (!mailbox) return;

  try {
    const messages = await fetchImapMessages(mailbox.id, mailbox.imapCredentials!);
    res.json({ messages, notice: null });
  } catch (err) {
    res.status(502).json({
      error: `Kon geen verbinding maken met "${mailbox.displayName}": ${
        err instanceof Error ? err.message : String(err)
      }`,
    });
  }
});

messagesRouter.post('/:mailboxId/messages/:uid/read', async (req, res) => {
  const mailbox = dataStore.getMailboxById(req.params.mailboxId);
  if (!mailbox?.imapCredentials) {
    res.status(404).json({ error: 'Mailbox niet gevonden of geen IMAP-mailbox.' });
    return;
  }
  const seen = req.body?.seen !== false;
  try {
    await setMessageSeen(mailbox.imapCredentials, Number(req.params.uid), seen);
    res.status(204).end();
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

messagesRouter.post('/:mailboxId/messages/:uid/archive', async (req, res) => {
  const mailbox = dataStore.getMailboxById(req.params.mailboxId);
  if (!mailbox?.imapCredentials) {
    res.status(404).json({ error: 'Mailbox niet gevonden of geen IMAP-mailbox.' });
    return;
  }
  try {
    await archiveMessage(mailbox.imapCredentials, Number(req.params.uid), req.body?.folder);
    res.status(204).end();
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

messagesRouter.post('/:mailboxId/messages/:uid/forward-draft', async (req, res) => {
  const mailbox = dataStore.getMailboxById(req.params.mailboxId);
  if (!mailbox?.imapCredentials) {
    res.status(404).json({ error: 'Mailbox niet gevonden of geen IMAP-mailbox.' });
    return;
  }
  const { recipient, note, original } = req.body ?? {};
  if (!recipient?.name || !recipient?.email || !original) {
    res.status(400).json({ error: 'recipient en original zijn verplicht.' });
    return;
  }
  try {
    await saveForwardDraft(mailbox.imapCredentials, mailbox.emailAddress, recipient, note ?? '', original);
    dataStore.recordContactUsed(recipient);
    res.status(204).end();
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

messagesRouter.post('/:mailboxId/messages/:uid/reply-draft', async (req, res) => {
  const mailbox = dataStore.getMailboxById(req.params.mailboxId);
  if (!mailbox?.imapCredentials) {
    res.status(404).json({ error: 'Mailbox niet gevonden of geen IMAP-mailbox.' });
    return;
  }
  const { mode, replyBody, original } = req.body ?? {};
  if ((mode !== 'reply' && mode !== 'replyAll') || !original) {
    res.status(400).json({ error: 'mode ("reply"/"replyAll") en original zijn verplicht.' });
    return;
  }
  try {
    await saveReplyDraft(mailbox.imapCredentials, mailbox.emailAddress, mode, replyBody ?? '', original);
    res.status(204).end();
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
