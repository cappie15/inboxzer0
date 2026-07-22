import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  IconButton,
  Text,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableMailboxList from '../components/DraggableMailboxList';
import {
  selectOrderedMailboxes,
  useMailboxStore,
} from '../store/mailboxStore';
import { useTriageStore } from '../store/triageStore';

interface PreTriageScreenProps {
  onStartSession: () => void;
  onOpenSettings: () => void;
}

export default function PreTriageScreen({
  onStartSession,
  onOpenSettings,
}: PreTriageScreenProps) {
  const theme = useTheme();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const mailboxes = useMailboxStore((state) => state.mailboxes);
  const isLoading = useMailboxStore((state) => state.isLoading);
  const loadError = useMailboxStore((state) => state.loadError);
  const loadMailboxes = useMailboxStore((state) => state.loadMailboxes);
  const reorderMailboxes = useMailboxStore((state) => state.reorderMailboxes);
  const toggleMailboxSelected = useMailboxStore(
    (state) => state.toggleMailboxSelected
  );
  const startSession = useTriageStore((state) => state.startSession);

  useEffect(() => {
    loadMailboxes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderedMailboxes = useMemo(
    () => selectOrderedMailboxes(mailboxes),
    [mailboxes]
  );
  const selectedCount = orderedMailboxes.filter((mb) => mb.selected).length;

  const handleStart = async () => {
    const selectedMailboxes = orderedMailboxes.filter((mb) => mb.selected);
    setIsStarting(true);
    setStartError(null);
    try {
      await startSession(selectedMailboxes);
      const latestError = useTriageStore.getState().sessionError;
      if (latestError) {
        setStartError(latestError);
      }
      onStartSession();
    } catch (err) {
      setStartError(
        err instanceof Error ? err.message : 'Kon de sessie niet starten.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.titleRow}>
        <Text
          variant="headlineSmall"
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          Selecteer je mailboxen
        </Text>
        <IconButton icon="cog-outline" onPress={onOpenSettings} />
      </View>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Sleep om de verwerkingsvolgorde voor deze sessie aan te passen.
      </Text>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.loadingContainer}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.error, textAlign: 'center' }}
          >
            {loadError}
          </Text>
          <Button onPress={loadMailboxes} style={{ marginTop: 12 }}>
            Opnieuw proberen
          </Button>
        </View>
      ) : mailboxes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
          >
            Nog geen mailboxen gekoppeld. Voeg er één toe bij Instellingen.
          </Text>
          <Button onPress={onOpenSettings} style={{ marginTop: 12 }}>
            Naar instellingen
          </Button>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <DraggableMailboxList
            mailboxes={orderedMailboxes}
            onToggle={toggleMailboxSelected}
            onReorder={reorderMailboxes}
          />
        </View>
      )}

      {startError && (
        <Text
          variant="bodySmall"
          style={[styles.errorText, { color: theme.colors.error }]}
        >
          {startError}
        </Text>
      )}

      <Button
        mode="contained"
        onPress={handleStart}
        disabled={selectedCount === 0 || isStarting}
        loading={isStarting}
        style={styles.startButton}
        contentStyle={styles.startButtonContent}
      >
        {isStarting
          ? 'Mailboxen verbinden…'
          : `Start triage (${selectedCount} ${selectedCount === 1 ? 'mailbox' : 'mailboxen'})`}
      </Button>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 16,
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    marginBottom: 8,
  },
  startButton: {
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  startButtonContent: {
    paddingVertical: 6,
  },
});
