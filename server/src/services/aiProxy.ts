import { AISettings, WritingStyleSettings } from '../types';

const ANTHROPIC_MODEL = 'claude-sonnet-5';
const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 500;

async function callAnthropic(apiKey: string, system: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Anthropic API-fout (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((block) => block.type === 'text')?.text;
  return typeof text === 'string' ? text.trim() : '';
}

async function callOpenAI(apiKey: string, system: string, userPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`OpenAI API-fout (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : '';
}

export async function generateAIText(
  aiSettings: AISettings,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!aiSettings.apiKey.trim()) {
    throw new Error(
      'Er is nog geen LLM API-key ingesteld. Voeg er een toe bij Instellingen > AI-instellingen.'
    );
  }
  return aiSettings.provider === 'anthropic'
    ? callAnthropic(aiSettings.apiKey, systemPrompt, userPrompt)
    : callOpenAI(aiSettings.apiKey, systemPrompt, userPrompt);
}

export async function resolveWritingStyleText(writingStyle: WritingStyleSettings): Promise<string> {
  if (writingStyle.mode === 'paste') {
    return writingStyle.pastedText.trim();
  }
  if (!writingStyle.url.trim()) return '';
  try {
    const response = await fetch(writingStyle.url);
    if (!response.ok) return '';
    return (await response.text()).trim();
  } catch {
    return '';
  }
}

function buildSystemPrompt(styleSample: string): string {
  const styleInstruction = styleSample
    ? `Schrijf in dezelfde schrijfstijl, toon en woordkeuze als dit voorbeeld van de gebruiker:\n"""\n${styleSample}\n"""`
    : 'Schrijf in een beknopte, vriendelijke en professionele toon.';

  return [
    'Je schrijft e-mailtekst namens de gebruiker van de InboxZer0-app.',
    styleInstruction,
    'Schrijf in dezelfde taal als de originele e-mail.',
    'Geef ALLEEN de platte tekst van het bericht terug, zonder onderwerpregel, zonder aanhalingstekens en zonder toelichting erbij.',
    'Verzin geen feiten, namen of afspraken die niet in de originele e-mail staan.',
  ].join(' ');
}

interface OriginalMessageSummary {
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
}

function formatOriginalMessage(message: OriginalMessageSummary): string {
  return `Van: ${message.fromName} <${message.fromEmail}>\nOnderwerp: ${message.subject}\n\n${message.body}`;
}

export async function generateForwardNote(
  aiSettings: AISettings,
  writingStyle: WritingStyleSettings,
  message: OriginalMessageSummary,
  recipientName: string
): Promise<string> {
  const style = await resolveWritingStyleText(writingStyle);
  const system = buildSystemPrompt(style);
  const userPrompt = [
    `Schrijf een kort begeleidend bericht (maximaal 3 zinnen) om onderstaande e-mail door te sturen naar ${recipientName}.`,
    'Leg kort uit waarom je het doorstuurt, zonder de hele inhoud te herhalen.',
    '',
    formatOriginalMessage(message),
  ].join('\n');

  return generateAIText(aiSettings, system, userPrompt);
}

export async function generateReplyDraft(
  aiSettings: AISettings,
  writingStyle: WritingStyleSettings,
  message: OriginalMessageSummary,
  mode: 'reply' | 'replyAll',
  feedback?: string
): Promise<string> {
  const style = await resolveWritingStyleText(writingStyle);
  const system = buildSystemPrompt(style);

  const parts = [
    mode === 'replyAll'
      ? 'Schrijf een "allen antwoorden" op onderstaande e-mail namens de gebruiker, en houd er rekening mee dat alle huidige ontvangers het antwoord ook zien.'
      : 'Schrijf een antwoord op onderstaande e-mail namens de gebruiker.',
  ];

  if (feedback) {
    parts.push(
      `De gebruiker gaf de volgende feedback op een eerder concept-antwoord — verwerk dit: "${feedback}"`
    );
  }

  parts.push('', formatOriginalMessage(message));

  return generateAIText(aiSettings, system, parts.join('\n'));
}
