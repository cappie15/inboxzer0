import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  Portal,
  ProgressBar,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SwipeDeck from '../components/SwipeDeck';
import { useTriageStore } from '../store/triageStore';
import { SwipeDirection } from '../utils/types';

interface HomeScreenProps {
  onSessionComplete: () => void;
}

export default function HomeScreen({ onSessionComplete }: HomeScreenProps) {
  const theme = useTheme();

  const sessionQueue = useTriageStore((state) => state.sessionQueue);
  const currentIndex = useTriageStore((state) => state.currentIndex);
  const messagesById = useTriageStore((state) => state.messagesById);
  const queues = useTriageStore((state) => state.queues);
  const swipe = useTriageStore((state) => state.swipe);
  const getCurrentMessage = useTriageStore((state) => state.currentMessage);
  const sessionError = useTriageStore((state) => state.sessionError);
  const [errorDismissed, setErrorDismissed] = useState(false);
  const [replyModalVisible, setReplyModalVisible] = useState(false);

  const total = sessionQueue.length;
  const remaining = Math.max(total - currentIndex, 0);
  const progress = total === 0 ? 0 : (total - remaining) / total;

  const visibleMessages = useMemo(
    () =>
      sessionQueue
        .slice(currentIndex, currentIndex + 3)
        .map((id) => messagesById[id])
        .filter((m) => m !== undefined),
    [sessionQueue, currentIndex, messagesById]
  );

  const handleSwiped = (direction: SwipeDirection) => {
    if (direction === 'up') {
      setReplyModalVisible(true);
      return;
    }
    swipe(direction);
  };

  const handleReplyModeChosen = (mode: 'reply' | 'replyAll') => {
    setReplyModalVisible(false);
    swipe('up', mode);
  };

  const isSessionDone = remaining === 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.progressBarWrapper}>
        <ProgressBar
          progress={progress}
          color={theme.colors.primary}
          style={[
            styles.progressBar,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
      </View>

      <View style={styles.headerRow}>
        <Text
          variant="bodyMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {remaining} / {total} over
        </Text>
        <View style={styles.postponedBadge}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}
          >
            {queues.queue_postponed.length} uitgesteld
          </Text>
        </View>
      </View>

      {isSessionDone ? (
        <View style={styles.doneContainer}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={56}
            color={theme.colors.primary}
          />
          <Text
            variant="headlineSmall"
            style={[styles.doneTitle, { color: theme.colors.onSurface }]}
          >
            Inbox Zer0 bereikt!
          </Text>
          <View style={styles.summaryRow}>
            <SummaryStat
              label="Antwoorden"
              value={queues.queue_reply.length}
            />
            <SummaryStat
              label="Uitgesteld"
              value={queues.queue_postponed.length}
            />
            <SummaryStat
              label="Gearchiveerd"
              value={queues.queue_archived.length}
            />
            <SummaryStat
              label="Doorgestuurd"
              value={queues.queue_forward.length}
            />
          </View>
          <Button
            mode="contained"
            onPress={onSessionComplete}
            style={styles.doneButton}
          >
            Concepten verwerken
          </Button>
        </View>
      ) : (
        <View style={styles.deckWrapper}>
          <SwipeDeck messages={visibleMessages} onSwiped={handleSwiped} />
        </View>
      )}

      <Snackbar
        visible={Boolean(sessionError) && !errorDismissed}
        onDismiss={() => setErrorDismissed(true)}
        duration={6000}
      >
        {sessionError}
      </Snackbar>

      <Portal>
        <Dialog visible={replyModalVisible} dismissable={false}>
          <Dialog.Title>Hoe wil je antwoorden?</Dialog.Title>
          <Dialog.Content>
            <Text
              variant="bodyMedium"
              numberOfLines={2}
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {getCurrentMessage()?.subject}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => handleReplyModeChosen('replyAll')}>
              Allen antwoorden
            </Button>
            <Button mode="contained" onPress={() => handleReplyModeChosen('reply')}>
              Antwoorden
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  const theme = useTheme();
  return (
    <View style={styles.summaryStat}>
      <Text variant="titleLarge" style={{ color: theme.colors.primary }}>
        {value}
      </Text>
      <Text
        variant="labelSmall"
        style={{ color: theme.colors.onSurfaceVariant }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  progressBarWrapper: {
    height: 3,
    marginTop: 8,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  postponedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deckWrapper: {
    flex: 1,
    paddingBottom: 24,
  },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  doneTitle: {
    marginTop: 12,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 20,
  },
  summaryStat: {
    alignItems: 'center',
  },
  doneButton: {
    marginTop: 32,
    borderRadius: 12,
  },
});
