export type MailProvider = 'm365' | 'gmail' | 'imap';

export interface Mailbox {
  id: string;
  displayName: string;
  emailAddress: string;
  provider: MailProvider;
  order: number;
  selected: boolean;
}

export interface EmailAttachment {
  id: string;
  fileName: string;
  sizeKb: number;
}

export interface EmailMessage {
  id: string;
  mailboxId: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  cc: { name: string; email: string }[];
  bcc: { name: string; email: string }[];
  subject: string;
  preview: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  attachments: EmailAttachment[];
  priority?: 1 | 2 | 3 | 4;
  /** UID on the originating IMAP server. */
  imapUid: number;
}

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export type QueueName =
  | 'queue_reply'
  | 'queue_postponed'
  | 'queue_archived'
  | 'queue_forward'
  | 'queue_re_review';

export interface Contact {
  id: string;
  name: string;
  email: string;
  lastUsedAt: string;
  useCount: number;
}

export interface WritingStyleSettings {
  mode: 'paste' | 'url';
  pastedText: string;
  url: string;
}

export interface AISettings {
  provider: 'anthropic' | 'openai';
  apiKey: string;
}

export interface ImapCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  useSsl: boolean;
}
