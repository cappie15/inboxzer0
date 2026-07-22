import { useSettingsStore } from '../../store/settingsStore';

const ANTHROPIC_MODEL = 'claude-sonnet-5';
const OPENAI_MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 500;

async function callAnthropic(
  apiKey: string,
  system: string,
  userPrompt: string
): Promise<string> {
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

  const data = await response.json();
  const text = data?.content?.find((block: { type: string }) => block.type === 'text')?.text;
  return typeof text === 'string' ? text.trim() : '';
}

async function callOpenAI(
  apiKey: string,
  system: string,
  userPrompt: string
): Promise<string> {
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

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === 'string' ? text.trim() : '';
}

/**
 * Sends a single-turn prompt to whichever LLM provider/key is configured in
 * Settings. Throws a user-presentable error when no key is configured or the
 * provider call fails, so callers can surface it directly.
 */
export async function generateAIText(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const { provider, apiKey } = useSettingsStore.getState().aiSettings;

  if (!apiKey.trim()) {
    throw new Error(
      'Er is nog geen LLM API-key ingesteld. Voeg er een toe bij Instellingen > AI-instellingen.'
    );
  }

  return provider === 'anthropic'
    ? callAnthropic(apiKey, systemPrompt, userPrompt)
    : callOpenAI(apiKey, systemPrompt, userPrompt);
}
