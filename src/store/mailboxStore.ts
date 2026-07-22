import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mailbox, MailProvider } from '../utils/types';
import { mockMailboxes } from '../services/mockData';
import { deleteImapCredentials } from '../services/imapCredentialsStore';

interface MailboxState {
  mailboxes: Mailbox[];
  reorderMailboxes: (orderedIds: string[]) => void;
  toggleMailboxSelected: (id: string) => void;
  setMailboxSelected: (id: string, selected: boolean) => void;
  addMailbox: (mailbox: {
    displayName: string;
    emailAddress: string;
    provider: MailProvider;
  }) => string;
  removeMailbox: (id: string) => void;
}

export const useMailboxStore = create<MailboxState>()(
  persist(
    (set, get) => ({
      mailboxes: mockMailboxes,

      reorderMailboxes: (orderedIds) =>
        set((state) => {
          const byId = new Map(state.mailboxes.map((mb) => [mb.id, mb]));
          const reordered = orderedIds
            .map((id, index) => {
              const mb = byId.get(id);
              return mb ? { ...mb, order: index } : undefined;
            })
            .filter((mb): mb is Mailbox => mb !== undefined);
          return { mailboxes: reordered };
        }),

      toggleMailboxSelected: (id) =>
        set((state) => ({
          mailboxes: state.mailboxes.map((mb) =>
            mb.id === id ? { ...mb, selected: !mb.selected } : mb
          ),
        })),

      setMailboxSelected: (id, selected) =>
        set((state) => ({
          mailboxes: state.mailboxes.map((mb) =>
            mb.id === id ? { ...mb, selected } : mb
          ),
        })),

      addMailbox: ({ displayName, emailAddress, provider }) => {
        const id = `mb-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
        set((state) => ({
          mailboxes: [
            ...state.mailboxes,
            {
              id,
              displayName,
              emailAddress,
              provider,
              order: state.mailboxes.length,
              selected: true,
            },
          ],
        }));
        return id;
      },

      removeMailbox: (id) => {
        const removed = get().mailboxes.find((mb) => mb.id === id);
        set((state) => ({
          mailboxes: state.mailboxes
            .filter((mb) => mb.id !== id)
            .map((mb, index) => ({ ...mb, order: index })),
        }));
        if (removed?.provider === 'imap') {
          deleteImapCredentials(id).catch(() => undefined);
        }
      },
    }),
    {
      name: 'inboxzer0-mailboxes',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function selectOrderedMailboxes(mailboxes: Mailbox[]): Mailbox[] {
  return [...mailboxes].sort((a, b) => a.order - b.order);
}
