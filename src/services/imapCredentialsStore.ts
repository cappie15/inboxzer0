import * as SecureStore from 'expo-secure-store';
import { ImapCredentials } from '../utils/types';

function keyFor(mailboxId: string): string {
  return `imap-credentials-${mailboxId}`;
}

export async function saveImapCredentials(
  mailboxId: string,
  credentials: ImapCredentials
): Promise<void> {
  await SecureStore.setItemAsync(keyFor(mailboxId), JSON.stringify(credentials));
}

export async function getImapCredentials(
  mailboxId: string
): Promise<ImapCredentials | null> {
  const raw = await SecureStore.getItemAsync(keyFor(mailboxId));
  return raw ? (JSON.parse(raw) as ImapCredentials) : null;
}

export async function deleteImapCredentials(mailboxId: string): Promise<void> {
  await SecureStore.deleteItemAsync(keyFor(mailboxId));
}
