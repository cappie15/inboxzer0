import { create } from 'zustand';
import { Mailbox, MailProvider, ImapCredentials } from '../utils/types';
import { api, BackendMailbox } from '../services/apiClient';

function toMailbox(record: BackendMailbox, previousSelected?: boolean): Mailbox {
  return {
    id: record.id,
    displayName: record.displayName,
    emailAddress: record.emailAddress,
    provider: record.provider,
    order: record.order,
    selected: previousSelected ?? true,
  };
}

interface MailboxState {
  mailboxes: Mailbox[];
  isLoading: boolean;
  loadError: string | null;

  loadMailboxes: () => Promise<void>;
  addMailbox: (mailbox: {
    displayName: string;
    emailAddress: string;
    provider: MailProvider;
    imapCredentials?: ImapCredentials;
  }) => Promise<void>;
  removeMailbox: (id: string) => Promise<void>;
  reorderMailboxes: (orderedIds: string[]) => Promise<void>;
  toggleMailboxSelected: (id: string) => void;
  setMailboxSelected: (id: string, selected: boolean) => void;
}

export const useMailboxStore = create<MailboxState>()((set, get) => ({
  mailboxes: [],
  isLoading: false,
  loadError: null,

  loadMailboxes: async () => {
    set({ isLoading: true, loadError: null });
    try {
      const records = await api.getMailboxes();
      const previousById = new Map(get().mailboxes.map((mb) => [mb.id, mb.selected]));
      set({
        mailboxes: records.map((record) => toMailbox(record, previousById.get(record.id))),
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        loadError:
          err instanceof Error ? err.message : 'Kon mailboxen niet laden van de server.',
      });
    }
  },

  addMailbox: async (mailbox) => {
    const record = await api.addMailbox(mailbox);
    set((state) => ({ mailboxes: [...state.mailboxes, toMailbox(record)] }));
  },

  removeMailbox: async (id) => {
    await api.removeMailbox(id);
    set((state) => ({ mailboxes: state.mailboxes.filter((mb) => mb.id !== id) }));
  },

  reorderMailboxes: async (orderedIds) => {
    const records = await api.reorderMailboxes(orderedIds);
    const previousById = new Map(get().mailboxes.map((mb) => [mb.id, mb.selected]));
    set({
      mailboxes: records.map((record) => toMailbox(record, previousById.get(record.id))),
    });
  },

  toggleMailboxSelected: (id) =>
    set((state) => ({
      mailboxes: state.mailboxes.map((mb) =>
        mb.id === id ? { ...mb, selected: !mb.selected } : mb
      ),
    })),

  setMailboxSelected: (id, selected) =>
    set((state) => ({
      mailboxes: state.mailboxes.map((mb) => (mb.id === id ? { ...mb, selected } : mb)),
    })),
}));

export function selectOrderedMailboxes(mailboxes: Mailbox[]): Mailbox[] {
  return [...mailboxes].sort((a, b) => a.order - b.order);
}
