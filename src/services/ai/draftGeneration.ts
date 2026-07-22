import { EmailMessage } from '../../utils/types';
import { api } from '../apiClient';

function toMessageSummary(message: EmailMessage) {
  return {
    fromName: message.from.name,
    fromEmail: message.from.email,
    subject: message.subject,
    body: message.body,
  };
}

export async function generateForwardNote(
  message: EmailMessage,
  recipientName: string
): Promise<string> {
  const { note } = await api.generateForwardNote(toMessageSummary(message), recipientName);
  return note;
}

export async function generateReplyDraft(
  message: EmailMessage,
  mode: 'reply' | 'replyAll',
  feedback?: string
): Promise<string> {
  const { draft } = await api.generateReplyDraft(toMessageSummary(message), mode, feedback);
  return draft;
}
