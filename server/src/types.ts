export type MailProvider = 'm365' | 'gmail' | 'imap';

export interface MailAddress {
  name: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  fileName: string;
  sizeKb: number;
}

export interface EmailMessage {
  id: string;
  mailboxId: string;
  from: MailAddress;
  to: MailAddress[];
  cc: MailAddress[];
  bcc: MailAddress[];
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  attachments: EmailAttachment[];
  priority?: 1 | 2 | 3 | 4;
  imapUid: number;
}

export interface ImapCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  useSsl: boolean;
}

export interface MailboxRecord {
  id: string;
  displayName: string;
  emailAddress: string;
  provider: MailProvider;
  order: number;
  imapCredentials?: ImapCredentials;
}

export interface AISettings {
  provider: 'anthropic' | 'openai';
  apiKey: string;
}

export interface WritingStyleSettings {
  mode: 'paste' | 'url';
  pastedText: string;
  url: string;
}

export interface ContactRecord {
  id: string;
  name: string;
  email: string;
  lastUsedAt: string;
  useCount: number;
}

export interface AppData {
  mailboxes: MailboxRecord[];
  aiSettings: AISettings;
  writingStyle: WritingStyleSettings;
  contacts: ContactRecord[];
}
