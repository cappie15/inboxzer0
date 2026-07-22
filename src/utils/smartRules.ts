import { EmailMessage } from './types';

export interface SuggestedRule {
  id: string;
  senderEmail: string;
  senderName: string;
  subjectKeyword?: string;
  matchCount: number;
  ruleText: string;
}

function normalizeSubjectWords(subject: string): string[] {
  return subject
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !/^\d+$/.test(word));
}

/**
 * Finds a common subject keyword shared by every message in the group, so a
 * sender that sends a mix of important and archivable mail doesn't get a
 * single overly-broad "archive everything from X" rule (spec section 8,
 * FASE 4: match on sender AND subject).
 */
function findCommonSubjectKeyword(subjects: string[]): string | undefined {
  if (subjects.length < 2) return undefined;
  const [first, ...rest] = subjects.map(normalizeSubjectWords);
  const common = first.filter((word) => rest.every((words) => words.includes(word)));
  return common.length > 0 ? common.join(' ') : undefined;
}

function buildRuleText(condition: string): string {
  return [
    'ALS een nieuw bericht binnenkomt dat voldoet aan:',
    `  - ${condition}`,
    'VOER DAN UIT:',
    '  - Verplaats het bericht naar map "Archief"',
    '  - Markeer als gelezen',
  ].join('\n');
}

/**
 * Groups archived (swiped-right) messages by sender, and where a sender's
 * messages share a common subject keyword, suggests a sender+subject rule
 * instead of a blanket per-sender rule.
 */
export function generateSmartRules(archivedMessages: EmailMessage[]): SuggestedRule[] {
  const bySender = new Map<string, EmailMessage[]>();
  for (const message of archivedMessages) {
    const key = message.from.email.toLowerCase();
    const existing = bySender.get(key);
    if (existing) {
      existing.push(message);
    } else {
      bySender.set(key, [message]);
    }
  }

  const rules: SuggestedRule[] = [];
  for (const [email, messages] of bySender.entries()) {
    const keyword = findCommonSubjectKeyword(messages.map((m) => m.subject));
    const condition = keyword
      ? `Afzender bevat "${email}" EN Onderwerp bevat "${keyword}"`
      : `Afzender bevat "${email}"`;

    rules.push({
      id: `rule-${email}`,
      senderEmail: email,
      senderName: messages[0].from.name,
      subjectKeyword: keyword,
      matchCount: messages.length,
      ruleText: buildRuleText(condition),
    });
  }

  return rules.sort((a, b) => b.matchCount - a.matchCount);
}
