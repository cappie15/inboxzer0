import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContactPicker from '../components/ContactPicker';
import { useTriageStore } from '../store/triageStore';
import { useMailboxStore } from '../store/mailboxStore';
import { useContactsStore } from '../store/contactsStore';
import { generateForwardNote } from '../services/ai/draftGeneration';
import { saveForwardDraft } from '../services/draftService';

interface ForwardProcessingScreenProps {
  onComplete: () => void;
}

type Status = 'idle' | 'generating' | 'saving' | 'error';

export default function ForwardProcessingScreen({
  onComplete,
}: ForwardProcessingScreenProps) {
  const theme = useTheme();
  const forwardQueue = useTriageStore((state) => state.queues.queue_forward);
  const messagesById = useTriageStore((state) => state.messagesById);
  const mailboxes = useMailboxStore((state) => state.mailboxes);
  const recordContactUsed = useContactsStore((state) => state.recordContactUsed);

  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDone = forwardQueue.length === 0 || index >= forwardQueue.length;

  useEffect(() => {
    if (isDone) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDone]);

  const message = isDone ? undefined : messagesById[forwardQueue[index]];
  const mailbox = mailboxes.find((mb) => mb.id === message?.mailboxId);

  const advance = () => {
    setStatus('idle');
    setErrorMessage(null);
    setIndex((prev) => prev + 1);
  };

  const handleSelectContact = async (contact: { name: string; email: string }) => {
    if (!message || !mailbox) {
      advance();
      return;
    }

    setStatus('generating');
    setErrorMessage(null);
    try {
      const note = await generateForwardNote(message, contact.name);
      setStatus('saving');
      await saveForwardDraft(mailbox, message, contact, note);
      recordContactUsed(contact);
      advance();
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Kon het bericht niet doorsturen.'
      );
    }
  };

  if (isDone || !message || !mailbox) {
    return null;
  }

  const isBusy = status === 'generating' || status === 'saving';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <Text
        variant="headlineSmall"
        style={[styles.title, { color: theme.colors.onSurface }]}
      >
        Doorsturen ({index + 1} / {forwardQueue.length})
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        numberOfLines={2}
      >
        {message.subject}
      </Text>

      {isBusy ? (
        <View style={styles.busyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}
          >
            {status === 'generating'
              ? 'AI stelt begeleidend bericht op…'
              : 'Concept opslaan op de mailserver…'}
          </Text>
        </View>
      ) : (
        <>
          {errorMessage && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            >
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.error, marginBottom: 8 }}
              >
                {errorMessage}
              </Text>
              <Button mode="text" onPress={advance} compact>
                Overslaan en doorgaan
              </Button>
            </View>
          )}
          <ContactPicker onSelect={handleSelectContact} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 16,
  },
  busyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  errorBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
});
