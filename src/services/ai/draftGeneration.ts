import { EmailMessage } from '../../utils/types';
import { generateAIText } from './aiService';
import { getWritingStyleText } from './writingStyleContext';

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

function formatOriginalMessage(message: EmailMessage): string {
  return `Van: ${message.from.name} <${message.from.email}>\nOnderwerp: ${message.subject}\n\n${message.body}`;
}

export async function generateForwardNote(
  message: EmailMessage,
  recipientName: string
): Promise<string> {
  const style = await getWritingStyleText();
  const system = buildSystemPrompt(style);
  const userPrompt = [
    `Schrijf een kort begeleidend bericht (maximaal 3 zinnen) om onderstaande e-mail door te sturen naar ${recipientName}.`,
    'Leg kort uit waarom je het doorstuurt, zonder de hele inhoud te herhalen.',
    '',
    formatOriginalMessage(message),
  ].join('\n');

  return generateAIText(system, userPrompt);
}

export async function generateReplyDraft(
  message: EmailMessage,
  mode: 'reply' | 'replyAll',
  feedback?: string
): Promise<string> {
  const style = await getWritingStyleText();
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

  return generateAIText(system, parts.join('\n'));
}
