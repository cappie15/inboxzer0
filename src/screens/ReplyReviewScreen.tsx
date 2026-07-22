import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTriageStore } from '../store/triageStore';
import { useMailboxStore } from '../store/mailboxStore';
import { generateReplyDraft } from '../services/ai/draftGeneration';
import { saveReplyDraft } from '../services/draftService';

interface ReplyReviewScreenProps {
  onComplete: () => void;
}

export default function ReplyReviewScreen({ onComplete }: ReplyReviewScreenProps) {
  const theme = useTheme();
  const replyQueue = useTriageStore((state) => state.queues.queue_reply);
  const messagesById = useTriageStore((state) => state.messagesById);
  const mailboxes = useMailboxStore((state) => state.mailboxes);

  const [index, setIndex] = useState(0);
  const [draftText, setDraftText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const isDone = replyQueue.length === 0 || index >= replyQueue.length;
  const item = isDone ? undefined : replyQueue[index];
  const message = item ? messagesById[item.messageId] : undefined;
  const mailbox = message ? mailboxes.find((mb) => mb.id === message.mailboxId) : undefined;

  useEffect(() => {
    if (isDone) {
      onComplete();
      return;
    }
    if (!item || !message) return;
    let cancelled = false;

    setIsGenerating(true);
    setError(null);
    generateReplyDraft(message, item.mode)
      .then((text) => {
        if (!cancelled) setDraftText(text);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Kon geen concept genereren.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsGenerating(false);
      });

    return () => {
      cancelled = true;
    };
    // Regenerate whenever we move to a new queue item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (isDone || !item || !message || !mailbox) return null;

  const advance = () => {
    setFeedbackMode(false);
    setFeedbackText('');
    setDraftText('');
    setIndex((prev) => prev + 1);
  };

  const handleRegenerateWithFeedback = async () => {
    if (!feedbackText.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const text = await generateReplyDraft(message, item.mode, feedbackText.trim());
      setDraftText(text);
      setFeedbackMode(false);
      setFeedbackText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon geen nieuw concept genereren.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async (notice: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await saveReplyDraft(mailbox, message, item.mode, draftText);
      setSavedNotice(notice);
      advance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon het concept niet opslaan.');
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isGenerating || isSaving;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <Text
        variant="headlineSmall"
        style={[styles.title, { color: theme.colors.onSurface }]}
      >
        Antwoorden ({index + 1} / {replyQueue.length})
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        numberOfLines={2}
      >
        {item.mode === 'replyAll' ? 'Allen antwoorden — ' : 'Antwoorden — '}
        {message.subject}
      </Text>

      {isGenerating ? (
        <View style={styles.busyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}
          >
            AI stelt concept-antwoord op…
          </Text>
        </View>
      ) : (
        <>
          {error && (
            <Text
              variant="bodySmall"
              style={[styles.error, { color: theme.colors.error }]}
            >
              {error}
            </Text>
          )}

          <TextInput
            mode="outlined"
            multiline
            value={draftText}
            onChangeText={setDraftText}
            style={styles.draftInput}
            contentStyle={styles.draftInputContent}
          />

          {feedbackMode ? (
            <View style={styles.feedbackBox}>
              <TextInput
                mode="outlined"
                label="Wat moet er anders?"
                value={feedbackText}
                onChangeText={setFeedbackText}
                multiline
                style={styles.feedbackInput}
              />
              <View style={styles.feedbackActions}>
                <Button onPress={() => setFeedbackMode(false)} disabled={isBusy}>
                  Annuleren
                </Button>
                <Button
                  mode="contained"
                  onPress={handleRegenerateWithFeedback}
                  disabled={isBusy || !feedbackText.trim()}
                >
                  Opnieuw genereren
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={() => handleSaveDraft('Concept opgeslagen — verstuur later handmatig.')}
                disabled={isBusy}
                style={styles.actionButton}
              >
                Doe ik later handmatig
              </Button>
              <Button
                mode="outlined"
                onPress={() => setFeedbackMode(true)}
                disabled={isBusy}
                style={styles.actionButton}
              >
                Bijna, pas aan
              </Button>
              <Button
                mode="contained"
                onPress={() =>
                  handleSaveDraft(
                    'Concept opgeslagen. Automatisch verzenden via SMTP volgt in een latere stap — verstuur dit voorlopig handmatig vanuit je mail-app.'
                  )
                }
                loading={isSaving}
                disabled={isBusy}
                style={styles.actionButton}
              >
                Goed, versturen
              </Button>
            </View>
          )}
        </>
      )}

      <Snackbar
        visible={Boolean(savedNotice)}
        onDismiss={() => setSavedNotice(null)}
        duration={5000}
      >
        {savedNotice}
      </Snackbar>
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
  error: {
    marginBottom: 8,
  },
  draftInput: {
    flex: 1,
    marginBottom: 12,
  },
  draftInputContent: {
    paddingTop: 12,
  },
  feedbackBox: {
    marginBottom: 8,
  },
  feedbackInput: {
    marginBottom: 8,
  },
  feedbackActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actions: {
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    borderRadius: 12,
  },
});
