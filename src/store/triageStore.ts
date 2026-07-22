import { create } from 'zustand';
import { EmailMessage, Mailbox, SwipeDirection } from '../utils/types';
import { sortMessagesByPriority } from '../utils/sortMessages';
import { api } from '../services/apiClient';

export interface ReplyQueueItem {
  messageId: string;
  mode: 'reply' | 'replyAll';
}

interface TriageQueues {
  queue_reply: ReplyQueueItem[];
  queue_postponed: string[];
  queue_archived: string[];
  queue_forward: string[];
}

interface TriageState {
  messagesById: Record<string, EmailMessage>;
  sessionQueue: string[];
  currentIndex: number;
  queues: TriageQueues;
  isBuildingSession: boolean;
  sessionError: string | null;
  /** mailboxId -> owning account's email address, needed to re-sort postponed rounds. */
  mailboxEmailById: Record<string, string>;

  startSession: (orderedMailboxes: Mailbox[]) => Promise<void>;
  startPostponedRound: () => void;
  swipe: (
    direction: SwipeDirection,
    replyMode?: 'reply' | 'replyAll'
  ) => EmailMessage | undefined;
  currentMessage: () => EmailMessage | undefined;
  remainingCount: () => number;
  totalCount: () => number;
  postponedCount: () => number;
}

const emptyQueues: TriageQueues = {
  queue_reply: [],
  queue_postponed: [],
  queue_archived: [],
  queue_forward: [],
};

export const useTriageStore = create<TriageState>()((set, get) => ({
  messagesById: {},
  sessionQueue: [],
  currentIndex: 0,
  queues: emptyQueues,
  isBuildingSession: false,
  sessionError: null,
  mailboxEmailById: {},

  startSession: async (orderedMailboxes) => {
    set({ isBuildingSession: true, sessionError: null });

    const results = await Promise.allSettled(
      orderedMailboxes.map((mb) => api.getMessages(mb.id))
    );

    const failedMailboxes = orderedMailboxes.filter(
      (_, index) => results[index].status === 'rejected'
    );

    const mergedMessages: Record<string, EmailMessage> = {};
    const sortedIdsByMailbox: string[][] = orderedMailboxes.map(() => []);

    results.forEach((result, index) => {
      if (result.status !== 'fulfilled') return;
      const mailbox = orderedMailboxes[index];
      const sorted = sortMessagesByPriority(result.value.messages, mailbox.emailAddress);
      sortedIdsByMailbox[index] = sorted.map((m) => m.id);
      for (const message of sorted) {
        mergedMessages[message.id] = message;
      }
    });

    set({
      messagesById: mergedMessages,
      sessionQueue: sortedIdsByMailbox.flat(),
      currentIndex: 0,
      queues: emptyQueues,
      isBuildingSession: false,
      mailboxEmailById: Object.fromEntries(
        orderedMailboxes.map((mb) => [mb.id, mb.emailAddress])
      ),
      sessionError:
        failedMailboxes.length > 0
          ? `Kon geen verbinding maken met: ${failedMailboxes.map((mb) => mb.displayName).join(', ')}`
          : null,
    });
  },

  startPostponedRound: () => {
    const state = get();
    const postponedMessages = state.queues.queue_postponed
      .map((id) => state.messagesById[id])
      .filter((m): m is EmailMessage => m !== undefined);

    // Group back by mailbox so each mailbox's messages are still sorted
    // against that mailbox's own address, then keep the existing relative
    // mailbox order from the current sessionQueue.
    const byMailbox = new Map<string, EmailMessage[]>();
    for (const message of postponedMessages) {
      const list = byMailbox.get(message.mailboxId) ?? [];
      list.push(message);
      byMailbox.set(message.mailboxId, list);
    }
    const seenMailboxIds: string[] = [];
    for (const message of postponedMessages) {
      if (!seenMailboxIds.includes(message.mailboxId)) seenMailboxIds.push(message.mailboxId);
    }
    const nextQueue = seenMailboxIds.flatMap((mailboxId) => {
      const messages = byMailbox.get(mailboxId) ?? [];
      const ownerEmail = state.mailboxEmailById[mailboxId] ?? '';
      return sortMessagesByPriority(messages, ownerEmail).map((m) => m.id);
    });

    set({
      sessionQueue: nextQueue,
      currentIndex: 0,
      queues: { ...state.queues, queue_postponed: [] },
    });
  },

  swipe: (direction, replyMode) => {
    const state = get();
    const messageId = state.sessionQueue[state.currentIndex];
    const message = state.messagesById[messageId];
    if (!message) return undefined;

    const markRead = direction !== 'down';
    const updatedMessage: EmailMessage = { ...message, isRead: markRead };

    let queues: TriageQueues;
    if (direction === 'up') {
      queues = {
        ...state.queues,
        queue_reply: [
          ...state.queues.queue_reply,
          { messageId, mode: replyMode ?? 'reply' },
        ],
      };
    } else {
      const queueKey: 'queue_postponed' | 'queue_archived' | 'queue_forward' =
        direction === 'down'
          ? 'queue_postponed'
          : direction === 'right'
            ? 'queue_archived'
            : 'queue_forward';
      queues = {
        ...state.queues,
        [queueKey]: [...state.queues[queueKey], messageId],
      };
    }

    set({
      messagesById: {
        ...state.messagesById,
        [messageId]: updatedMessage,
      },
      queues,
      currentIndex: state.currentIndex + 1,
    });

    api.markRead(message.mailboxId, message.imapUid, markRead).catch((err) => {
      console.warn('Kon gelezen-status niet bijwerken op de server:', err);
    });
    if (direction === 'right') {
      api.archiveMessage(message.mailboxId, message.imapUid).catch((err) => {
        console.warn('Kon bericht niet archiveren op de server:', err);
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
