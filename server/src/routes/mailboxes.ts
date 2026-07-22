import { Router } from 'express';
import * as dataStore from '../store/dataStore';
import { verifyImapCredentials } from '../services/imapMessageService';
import { MailboxRecord } from '../types';

export const mailboxesRouter = Router();

function toPublicMailbox(mailbox: MailboxRecord) {
  const { imapCredentials, ...rest } = mailbox;
  return { ...rest, hasImapCredentials: Boolean(imapCredentials) };
}

mailboxesRouter.get('/', (_req, res) => {
  res.json(dataStore.getMailboxes().map(toPublicMailbox));
});

mailboxesRouter.post('/', async (req, res) => {
  const { displayName, emailAddress, provider, imapCredentials } = req.body ?? {};

  if (!displayName || !emailAddress || !provider) {
    res.status(400).json({ error: 'displayName, emailAddress en provider zijn verplicht.' });
    return;
  }

  if (provider === 'imap') {
    if (!imapCredentials?.host || !imapCredentials?.username || !imapCredentials?.password) {
      res.status(400).json({ error: 'IMAP-host, gebruikersnaam en wachtwoord zijn verplicht.' });
      return;
    }
    try {
      await verifyImapCredentials(imapCredentials);
    } catch (err) {
      res.status(422).json({
        error: `Kon geen verbinding maken met de IMAP-server: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
      return;
    }
  }

  const record = dataStore.addMailbox({ displayName, emailAddress, provider, imapCredentials });
  res.status(201).json(toPublicMailbox(record));
});

mailboxesRouter.delete('/:id', (req, res) => {
  dataStore.removeMailbox(req.params.id);
  res.status(204).end();
});

mailboxesRouter.post('/reorder', (req, res) => {
  const { orderedIds } = req.body ?? {};
  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ error: 'orderedIds moet een array zijn.' });
    return;
  }
  const reordered = dataStore.reorderMailboxes(orderedIds);
  res.json(reordered.map(toPublicMailbox));
});
