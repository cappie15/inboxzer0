import { EmailMessage, ImapCredentials, MailProvider } from '../utils/types';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Serverfout (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export interface BackendMailbox {
  id: string;
  displayName: string;
  emailAddress: string;
  provider: MailProvider;
  order: number;
  hasImapCredentials: boolean;
}

export interface BackendAISettings {
  provider: 'anthropic' | 'openai';
  apiKey: string;
}

export interface BackendWritingStyle {
  mode: 'paste' | 'url';
  pastedText: string;
  url: string;
}

export interface BackendContact {
  id: string;
  name: string;
  email: string;
  lastUsedAt: string;
  useCount: number;
}

export const api = {
  getMailboxes: () => apiFetch<BackendMailbox[]>('/mailboxes'),

  addMailbox: (input: {
    displayName: string;
    emailAddress: string;
    provider: MailProvider;
    imapCredentials?: ImapCredentials;
  }) => apiFetch<BackendMailbox>('/mailboxes', { method: 'POST', body: JSON.stringify(input) }),

  removeMailbox: (id: string) => apiFetch<void>(`/mailboxes/${id}`, { method: 'DELETE' }),

  reorderMailboxes: (orderedIds: string[]) =>
    apiFetch<BackendMailbox[]>('/mailboxes/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds }),
    }),

  getMessages: (mailboxId: string) =>
    apiFetch<{ messages: EmailMessage[]; notice: string | null }>(
      `/mailboxes/${mailboxId}/messages`
    ),

  markRead: (mailboxId: string, uid: number, seen: boolean) =>
    apiFetch<void>(`/mailboxes/${mailboxId}/messages/${uid}/read`, {
      method: 'POST',
      body: JSON.stringify({ seen }),
    }),

  archiveMessage: (mailboxId: string, uid: number) =>
    apiFetch<void>(`/mailboxes/${mailboxId}/messages/${uid}/archive`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  saveForwardDraft: (
    mailboxId: string,
    uid: number,
    recipient: { name: string; email: string },
    note: string,
    original: EmailMessage
  ) =>
    apiFetch<void>(`/mailboxes/${mailboxId}/messages/${uid}/forward-draft`, {
      method: 'POST',
      body: JSON.stringify({ recipient, note, original }),
    }),

  saveReplyDraft: (
    mailboxId: string,
    uid: number,
    mode: 'reply' | 'replyAll',
    replyBody: string,
    original: EmailMessage
  ) =>
    apiFetch<void>(`/mailboxes/${mailboxId}/messages/${uid}/reply-draft`, {
      method: 'POST',
      body: JSON.stringify({ mode, replyBody, original }),
    }),

  getAISettings: () => apiFetch<BackendAISettings>('/settings/ai'),

  setAISettings: (settings: BackendAISettings) =>
    apiFetch<BackendAISettings>('/settings/ai', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  getWritingStyle: () => apiFetch<BackendWritingStyle>('/settings/writing-style'),

  setWritingStyle: (style: BackendWritingStyle) =>
    apiFetch<BackendWritingStyle>('/settings/writing-style', {
      method: 'PUT',
      body: JSON.stringify(style),
    }),

  getContacts: () => apiFetch<BackendContact[]>('/contacts'),

  generateForwardNote: (
    message: { fromName: string; fromEmail: string; subject: string; body: string },
    recipientName: string
  ) =>
    apiFetch<{ note: string }>('/ai/forward-note', {
      method: 'POST',
      body: JSON.stringify({ message, recipientName }),
    }),

  generateReplyDraft: (
    message: { fromName: string; fromEmail: string; subject: string; body: string },
    mode: 'reply' | 'replyAll',
    feedback?: string
  ) =>
    apiFetch<{ draft: string }>('/ai/reply-draft', {
      method: 'POST',
      body: JSON.stringify({ message, mode, feedback }),
    }),
};
