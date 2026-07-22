import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AISettings, WritingStyleSettings } from '../utils/types';

interface SettingsState {
  writingStyle: WritingStyleSettings;
  aiSettings: AISettings;
  setWritingStyleMode: (mode: WritingStyleSettings['mode']) => void;
  setWritingStylePastedText: (text: string) => void;
  setWritingStyleUrl: (url: string) => void;
  setAIProvider: (provider: AISettings['provider']) => void;
  setAIApiKey: (apiKey: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      writingStyle: {
        mode: 'paste',
        pastedText: '',
        url: '',
      },
      aiSettings: {
        provider: 'anthropic',
        apiKey: '',
      },

      setWritingStyleMode: (mode) =>
        set((state) => ({
          writingStyle: { ...state.writingStyle, mode },
        })),

      setWritingStylePastedText: (pastedText) =>
        set((state) => ({
          writingStyle: { ...state.writingStyle, pastedText },
        })),

      setWritingStyleUrl: (url) =>
        set((state) => ({
          writingStyle: { ...state.writingStyle, url },
        })),

      setAIProvider: (provider) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, provider },
        })),

      setAIApiKey: (apiKey) =>
        set((state) => ({
          aiSettings: { ...state.aiSettings, apiKey },
        })),
    }),
    {
      name: 'inboxzer0-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
