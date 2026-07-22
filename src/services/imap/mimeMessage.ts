import { EmailMessage } from '../../utils/types';

export interface ForwardDraftParams {
  fromAddress: string;
  toAddress: string;
  toName: string;
  note: string;
  original: EmailMessage;
}

/**
 * Builds a plain-text RFC822 draft for a forwarded message. Attachment
 * *content* is not re-attached (that needs fetching full BODYSTRUCTURE/body
 * parts from the server, out of scope for this iteration) — the original
 * attachment names are mentioned instead so nothing is silently dropped.
 */
export function buildForwardDraft(params: ForwardDraftParams): string {
  const lines = [
    `From: ${params.fromAddress}`,
    `To: ${params.toName} <${params.toAddress}>`,
    `Subject: Fwd: ${params.original.subject}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.note,
    '',
    '---------- Doorgestuurd bericht ----------',
    `Van: ${params.original.from.name} <${params.original.from.email}>`,
    `Datum: ${params.original.receivedAt}`,
    `Onderwerp: ${params.original.subject}`,
    '',
    params.original.body,
  ];

  if (params.original.attachments.length > 0) {
    lines.push(
      '',
      `(Bijlagen van het origineel: ${params.original.attachments
        .map((a) => a.fileName)
        .join(', ')} — automatisch opnieuw bijvoegen volgt in een latere versie.)`
    );
  }

  return lines.join('\r\n');
}

export interface ReplyDraftParams {
  fromAddress: string;
  replyBody: string;
  original: EmailMessage;
  mode: 'reply' | 'replyAll';
}

export function buildReplyDraft(params: ReplyDraftParams): string {
  const toRecipients =
    params.mode === 'replyAll'
      ? [params.original.from, ...params.original.to.filter((r) => r.email !== params.fromAddress)]
      : [params.original.from];
  const ccRecipients = params.mode === 'replyAll' ? params.original.cc : [];

  const lines = [
    `From: ${params.fromAddress}`,
    `To: ${toRecipients.map((r) => `${r.name} <${r.email}>`).join(', ')}`,
  ];
  if (ccRecipients.length > 0) {
    lines.push(`Cc: ${ccRecipients.map((r) => `${r.name} <${r.email}>`).join(', ')}`);
  }
  lines.push(
    `Subject: Re: ${params.original.subject}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.replyBody,
    '',
    `Op ${params.original.receivedAt} schreef ${params.original.from.name} <${params.original.from.email}>:`,
    `> ${params.original.body.split('\n').join('\n> ')}`
  );

  return lines.join('\r\n');
}
