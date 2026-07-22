import { create } from 'zustand';
import { EmailMessage, Mailbox, SwipeDirection } from '../utils/types';
import { mockMessages, MOCK_USER_EMAIL } from '../services/mockData';
import { sortMessagesByPriority } from '../utils/sortMessages';
import { applyImapSwipeAction, fetchImapMessages } from '../services/imap/imapMailService';

interface TriageQueues {
  queue_reply: string[];
  queue_postponed: string[];
  queue_archived: string[];
  queue_forward: string[];
  queue_re_review: string[];
}

interface TriageState {
  userEmail: string;
  messagesById: Record<string, EmailMessage>;
  sessionQueue: string[];
  currentIndex: number;
  queues: TriageQueues;
  isBuildingSession: boolean;
  sessionError: string | null;

  startSession: (orderedMailboxes: Mailbox[]) => Promise<void>;
  swipe: (direction: SwipeDirection) => EmailMessage | undefined;
  currentMessage: () => EmailMessage | undefined;
  remainingCount: () => number;
  totalCount: () => number;
  postponedCount: () => number;
}

function buildSessionQueue(
  messagesById: Record<string, EmailMessage>,
  orderedMailboxIds: string[],
  userEmail: string
): string[] {
  const queue: string[] = [];
  for (const mailboxId of orderedMailboxIds) {
    const unreadInMailbox = Object.values(messagesById).filter(
      (m) => m.mailboxId === mailboxId && !m.isRead
    );
    const sorted = sortMessagesByPriority(unreadInMailbox, userEmail);
    queue.push(...sorted.map((m) => m.id));
  }
  return queue;
}

const emptyQueues: TriageQueues = {
  queue_reply: [],
  queue_postponed: [],
  queue_archived: [],
  queue_forward: [],
  queue_re_review: [],
};

export const useTriageStore = create<TriageState>()((set, get) => ({
  userEmail: MOCK_USER_EMAIL,
  messagesById: Object.fromEntries(mockMessages.map((m) => [m.id, m])),
  sessionQueue: [],
  currentIndex: 0,
  queues: emptyQueues,
  isBuildingSession: false,
  sessionError: null,

  startSession: async (orderedMailboxes) => {
    set({ isBuildingSession: true, sessionError: null });

    const imapMailboxes = orderedMailboxes.filter((mb) => mb.provider === 'imap');
    const results = await Promise.allSettled(
      imapMailboxes.map((mb) => fetchImapMessages(mb))
    );

    const failedMailboxes = imapMailboxes.filter((_, index) => results[index].status === 'rejected');
    if (failedMailboxes.length > 0) {
      const names = failedMailboxes.map((mb) => mb.displayName).join(', ');
      console.warn(`Kon geen verbinding maken met: ${names}`);
    }

    set((state) => {
      const mergedMessages = { ...state.messagesById };
      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const message of result.value) {
            mergedMessages[message.id] = message;
          }
        }
      }

      return {
        messagesById: mergedMessages,
        sessionQueue: buildSessionQueue(
          mergedMessages,
          orderedMailboxes.map((mb) => mb.id),
          state.userEmail
        ),
        currentIndex: 0,
        queues: emptyQueues,
        isBuildingSession: false,
        sessionError:
          failedMailboxes.length > 0
            ? `Kon geen verbinding maken met: ${failedMailboxes.map((mb) => mb.displayName).join(', ')}`
            : null,
      };
    });
  },

  swipe: (direction) => {
    const state = get();
    const messageId = state.sessionQueue[state.currentIndex];
    const message = state.messagesById[messageId];
    if (!message) return undefined;

    const markRead = direction !== 'down';
    const updatedMessage: EmailMessage = { ...message, isRead: markRead };

    const queueKey: keyof TriageQueues =
      direction === 'up'
        ? 'queue_reply'
        : direction === 'down'
          ? 'queue_postponed'
          : direction === 'right'
            ? 'queue_archived'
            : 'queue_forward';

    set({
      messagesById: {
        ...state.messagesById,
        [messageId]: updatedMessage,
      },
      queues: {
        ...state.queues,
        [queueKey]: [...state.queues[queueKey], messageId],
      },
      currentIndex: state.currentIndex + 1,
    });

    if (updatedMessage.imapUid !== undefined) {
      applyImapSwipeAction(updatedMessage, direction).catch((err) => {
        console.warn('IMAP swipe-actie mislukt:', err);
      });
    }

    return updatedMessage;
  },

  currentMessage: () => {
    const state = get();
    const messageId = state.sessionQueue[state.currentIndex];
    return messageId ? state.messagesById[messageId] : undefined;
  },

  remainingCount: () => {
    const state = get();
    return Math.max(state.sessionQueue.length - state.currentIndex, 0);
  },

  totalCount: () => get().sessionQueue.length,

  postponedCount: () => get().queues.queue_postponed.length,
}));
