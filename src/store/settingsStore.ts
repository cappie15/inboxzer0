import { create } from 'zustand';
import { AISettings, WritingStyleSettings } from '../utils/types';
import { api } from '../services/apiClient';

interface SettingsState {
  writingStyle: WritingStyleSettings;
  aiSettings: AISettings;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  setWritingStyleMode: (mode: WritingStyleSettings['mode']) => Promise<void>;
  setWritingStylePastedText: (text: string) => Promise<void>;
  setWritingStyleUrl: (url: string) => Promise<void>;
  setAIProvider: (provider: AISettings['provider']) => Promise<void>;
  setAIApiKey: (apiKey: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  writingStyle: { mode: 'paste', pastedText: '', url: '' },
  aiSettings: { provider: 'anthropic', apiKey: '' },
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const [writingStyle, aiSettings] = await Promise.all([
        api.getWritingStyle(),
        api.getAISettings(),
      ]);
      set({ writingStyle, aiSettings, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setWritingStyleMode: async (mode) => {
    const updated = await api.setWritingStyle({ ...get().writingStyle, mode });
    set({ writingStyle: updated });
  },

  setWritingStylePastedText: async (pastedText) => {
    const updated = await api.setWritingStyle({ ...get().writingStyle, pastedText });
    set({ writingStyle: updated });
  },

  setWritingStyleUrl: async (url) => {
    const updated = await api.setWritingStyle({ ...get().writingStyle, url });
    set({ writingStyle: updated });
  },

  setAIProvider: async (provider) => {
    const updated = await api.setAISettings({ ...get().aiSettings, provider });
    set({ aiSettings: updated });
  },

  setAIApiKey: async (apiKey) => {
    const updated = await api.setAISettings({ ...get().aiSettings, apiKey });
    set({ aiSettings: updated });
  },
}));
