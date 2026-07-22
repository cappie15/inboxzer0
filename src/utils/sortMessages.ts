import { EmailMessage } from './types';

/**
 * 4-tier prioriteitsvolgorde (spec sectie 5):
 * 1. Enkel aan user (To: bevat alleen user)
 * 2. Aan user + CC (To: bevat user + anderen zijn in CC)
 * 3. Gedeelde ontvanger (To: bevat user + andere ontvangers in To:)
 * 4. Indirect (user enkel in CC/BCC)
 */
export function getMessagePriority(
  message: EmailMessage,
  userEmail: string
): 1 | 2 | 3 | 4 {
  const normalizedUser = userEmail.toLowerCase();
  const toEmails = message.to.map((r) => r.email.toLowerCase());
  const isInTo = toEmails.includes(normalizedUser);
  const hasCc = message.cc.length > 0;
  const otherToRecipients = toEmails.filter((e) => e !== normalizedUser);

  if (isInTo && otherToRecipients.length === 0) {
    return hasCc ? 2 : 1;
  }
  if (isInTo && otherToRecipients.length > 0) {
    return 3;
  }
  return 4;
}

export function sortMessagesByPriority(
  messages: EmailMessage[],
  userEmail: string
): EmailMessage[] {
  return [...messages]
    .map((m) => ({ ...m, priority: getMessagePriority(m, userEmail) }))
    .sort((a, b) => {
      if (a.priority !== b.priority) {
        return (a.priority ?? 4) - (b.priority ?? 4);
      }
      return (
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      );
    });
}
