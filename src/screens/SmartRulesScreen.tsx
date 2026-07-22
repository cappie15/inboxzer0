import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTriageStore } from '../store/triageStore';
import { generateSmartRules } from '../utils/smartRules';

interface SmartRulesScreenProps {
  onDone: () => void;
}

export default function SmartRulesScreen({ onDone }: SmartRulesScreenProps) {
  const theme = useTheme();
  const archivedIds = useTriageStore((state) => state.queues.queue_archived);
  const messagesById = useTriageStore((state) => state.messagesById);
  const [copiedRuleId, setCopiedRuleId] = useState<string | null>(null);

  const rules = useMemo(() => {
    const archivedMessages = archivedIds
      .map((id) => messagesById[id])
      .filter((m) => m !== undefined);
    return generateSmartRules(archivedMessages);
  }, [archivedIds, messagesById]);

  const handleCopy = async (ruleId: string, ruleText: string) => {
    await Clipboard.setStringAsync(ruleText);
    setCopiedRuleId(ruleId);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <Text
        variant="headlineSmall"
        style={[styles.title, { color: theme.colors.onSurface }]}
      >
        Slimme regels
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
      >
        Op basis van de gearchiveerde berichten uit deze sessie.
      </Text>

      {rules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="filter-variant"
            size={48}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}
          >
            Geen regels om voor te stellen — er zijn deze sessie geen
            berichten gearchiveerd.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {rules.map((rule) => (
            <View
              key={rule.id}
              style={[
                styles.ruleCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                variant="titleMedium"
                style={{ color: theme.colors.onSurface }}
              >
                {rule.senderName}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
              >
                {rule.matchCount}{' '}
                {rule.matchCount === 1 ? 'bericht gearchiveerd' : 'berichten gearchiveerd'}
              </Text>
              <View
                style={[
                  styles.ruleTextBox,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'monospace' }}
                >
                  {rule.ruleText}
                </Text>
              </View>
              <Button
                mode="contained-tonal"
                icon="content-copy"
                onPress={() => handleCopy(rule.id, rule.ruleText)}
                style={styles.copyButton}
              >
                Kopieer regeltekst
              </Button>
            </View>
          ))}
        </ScrollView>
      )}

      <Button mode="contained" onPress={onDone} style={styles.doneButton}>
        Klaar
      </Button>

      <Snackbar
        visible={Boolean(copiedRuleId)}
        onDismiss={() => setCopiedRuleId(null)}
        duration={2500}
      >
        Regeltekst gekopieerd naar klembord
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 12,
  },
  ruleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  ruleTextBox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  copyButton: {
    borderRadius: 10,
  },
  doneButton: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
  },
});
