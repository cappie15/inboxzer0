import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Contact } from '../utils/types';

const MAX_CONTACTS = 10;

interface ContactsState {
  topContacts: Contact[];
  recordContactUsed: (contact: { name: string; email: string }) => void;
}

export const useContactsStore = create<ContactsState>()(
  persist(
    (set) => ({
      topContacts: [],

      recordContactUsed: (contact) =>
        set((state) => {
          const existing = state.topContacts.find(
            (c) => c.email.toLowerCase() === contact.email.toLowerCase()
          );
          const now = new Date().toISOString();

          const updated: Contact = existing
            ? { ...existing, lastUsedAt: now, useCount: existing.useCount + 1 }
            : {
                id: `contact-${contact.email.toLowerCase()}`,
                name: contact.name,
                email: contact.email,
                lastUsedAt: now,
                useCount: 1,
              };

          const withoutContact = state.topContacts.filter(
            (c) => c.email.toLowerCase() !== contact.email.toLowerCase()
          );

          const merged = [updated, ...withoutContact]
            .sort((a, b) => {
              if (b.useCount !== a.useCount) return b.useCount - a.useCount;
              return (
                new Date(b.lastUsedAt).getTime() -
                new Date(a.lastUsedAt).getTime()
              );
            })
            .slice(0, MAX_CONTACTS);

          return { topContacts: merged };
        }),
    }),
    {
      name: 'inboxzer0-top-contacts',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
