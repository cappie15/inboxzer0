import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mailbox } from '../utils/types';
import { mockMailboxes } from '../services/mockData';

interface MailboxState {
  mailboxes: Mailbox[];
  reorderMailboxes: (orderedIds: string[]) => void;
  toggleMailboxSelected: (id: string) => void;
  setMailboxSelected: (id: string, selected: boolean) => void;
}

export const useMailboxStore = create<MailboxState>()(
  persist(
    (set) => ({
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
