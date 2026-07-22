import * as fs from 'fs';
import { AppData, ContactRecord, MailboxRecord } from '../types';
import { decrypt, encrypt, getStoreFilePath } from './secretsStore';

const MAX_CONTACTS = 10;

const defaultData: AppData = {
  mailboxes: [],
  aiSettings: { provider: 'anthropic', apiKey: '' },
  writingStyle: { mode: 'paste', pastedText: '', url: '' },
  contacts: [],
};

function readAll(): AppData {
  const filePath = getStoreFilePath();
  if (!fs.existsSync(filePath)) {
    return structuredClone(defaultData);
  }
  try {
    const decrypted = decrypt(fs.readFileSync(filePath, 'utf8'));
    return { ...structuredClone(defaultData), ...JSON.parse(decrypted) };
  } catch {
    // Corrupt or unreadable store — fail safe with defaults rather than crash the server.
    return structuredClone(defaultData);
  }
}

function writeAll(data: AppData): void {
  fs.writeFileSync(getStoreFilePath(), encrypt(JSON.stringify(data)), { mode: 0o600 });
}

export function getMailboxes(): MailboxRecord[] {
  return readAll().mailboxes;
}

export function getMailboxById(id: string): MailboxRecord | undefined {
  return readAll().mailboxes.find((mb) => mb.id === id);
}

export function addMailbox(input: Omit<MailboxRecord, 'id' | 'order'>): MailboxRecord {
  const data = readAll();
  const record: MailboxRecord = {
    ...input,
    id: `mb-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    order: data.mailboxes.length,
  };
  data.mailboxes.push(record);
  writeAll(data);
  return record;
}

export function removeMailbox(id: string): void {
  const data = readAll();
  data.mailboxes = data.mailboxes
    .filter((mb) => mb.id !== id)
    .map((mb, index) => ({ ...mb, order: index }));
  writeAll(data);
}

export function reorderMailboxes(orderedIds: string[]): MailboxRecord[] {
  const data = readAll();
  const byId = new Map(data.mailboxes.map((mb) => [mb.id, mb]));
  data.mailboxes = orderedIds
    .map((id, index) => {
      const mb = byId.get(id);
      return mb ? { ...mb, order: index } : undefined;
    })
    .filter((mb): mb is MailboxRecord => mb !== undefined);
  writeAll(data);
  return data.mailboxes;
}

export function getAISettings() {
  return readAll().aiSettings;
}

export function setAISettings(aiSettings: AppData['aiSettings']): void {
  const data = readAll();
  data.aiSettings = aiSettings;
  writeAll(data);
}

export function getWritingStyle() {
  return readAll().writingStyle;
}

export function setWritingStyle(writingStyle: AppData['writingStyle']): void {
  const data = readAll();
  data.writingStyle = writingStyle;
  writeAll(data);
}

export function getContacts(): ContactRecord[] {
  return readAll().contacts;
}

export function recordContactUsed(contact: { name: string; email: string }): ContactRecord[] {
  const data = readAll();
  const now = new Date().toISOString();
  const existing = data.contacts.find(
    (c) => c.email.toLowerCase() === contact.email.toLowerCase()
  );
  const updated: ContactRecord = existing
    ? { ...existing, lastUsedAt: now, useCount: existing.useCount + 1 }
    : {
        id: `contact-${contact.email.toLowerCase()}`,
        name: contact.name,
        email: contact.email,
        lastUsedAt: now,
        useCount: 1,
      };

  const withoutContact = data.contacts.filter(
    (c) => c.email.toLowerCase() !== contact.email.toLowerCase()
  );

  data.contacts = [updated, ...withoutContact]
    .sort((a, b) => {
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
    })
    .slice(0, MAX_CONTACTS);

  writeAll(data);
  return data.contacts;
}
