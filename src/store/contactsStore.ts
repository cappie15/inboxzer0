import { create } from 'zustand';
import { Contact } from '../utils/types';
import { api } from '../services/apiClient';

interface ContactsState {
  topContacts: Contact[];
  loadContacts: () => Promise<void>;
}

export const useContactsStore = create<ContactsState>()((set) => ({
  topContacts: [],

  loadContacts: async () => {
    try {
      const contacts = await api.getContacts();
      set({ topContacts: contacts });
    } catch {
      // Keep whatever was loaded before; the picker still works with manual entry.
    }
  },
}));
