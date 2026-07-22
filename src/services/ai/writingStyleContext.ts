import { useSettingsStore } from '../../store/settingsStore';

/**
 * Resolves the user's configured writing-style sample to plain text, whether
 * it was pasted directly or lives at an external URL. Never throws — a
 * fetch failure just means the AI drafts without a style sample.
 */
export async function getWritingStyleText(): Promise<string> {
  const { writingStyle } = useSettingsStore.getState();

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
