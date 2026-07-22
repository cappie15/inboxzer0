import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Divider,
  IconButton,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddMailboxDialog from '../components/AddMailboxDialog';
import DraggableMailboxList from '../components/DraggableMailboxList';
import {
  selectOrderedMailboxes,
  useMailboxStore,
} from '../store/mailboxStore';
import { useSettingsStore } from '../store/settingsStore';
import { saveImapCredentials } from '../services/imapCredentialsStore';
import { ImapCredentials, MailProvider } from '../utils/types';

interface SettingsScreenProps {
  onClose: () => void;
}

export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const theme = useTheme();
  const [addDialogVisible, setAddDialogVisible] = useState(false);

  const mailboxes = useMailboxStore((state) => state.mailboxes);
  const reorderMailboxes = useMailboxStore((state) => state.reorderMailboxes);
  const toggleMailboxSelected = useMailboxStore(
    (state) => state.toggleMailboxSelected
  );
  const addMailbox = useMailboxStore((state) => state.addMailbox);
  const removeMailbox = useMailboxStore((state) => state.removeMailbox);

  const handleAddMailbox = (input: {
    displayName: string;
    emailAddress: string;
    provider: MailProvider;
    imapCredentials?: ImapCredentials;
  }) => {
    const id = addMailbox({
      displayName: input.displayName,
      emailAddress: input.emailAddress,
      provider: input.provider,
    });
    if (input.imapCredentials) {
      saveImapCredentials(id, input.imapCredentials).catch(() => undefined);
    }
  };

  const writingStyle = useSettingsStore((state) => state.writingStyle);
  const setWritingStyleMode = useSettingsStore(
    (state) => state.setWritingStyleMode
  );
  const setWritingStylePastedText = useSettingsStore(
    (state) => state.setWritingStylePastedText
  );
  const setWritingStyleUrl = useSettingsStore((state) => state.setWritingStyleUrl);

  const aiSettings = useSettingsStore((state) => state.aiSettings);
  const setAIProvider = useSettingsStore((state) => state.setAIProvider);
  const setAIApiKey = useSettingsStore((state) => state.setAIApiKey);

  const orderedMailboxes = useMemo(
    () => selectOrderedMailboxes(mailboxes),
    [mailboxes]
  );

  const header = (
    <View style={styles.sectionHeader}>
      <View style={styles.titleRow}>
        <Text
          variant="headlineSmall"
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          Instellingen
        </Text>
        <IconButton icon="close" onPress={onClose} />
      </View>

      <View style={styles.sectionTitleRow}>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurface, flex: 1 }}
        >
          Mailboxen
        </Text>
        <Button
          mode="text"
          icon="plus"
          onPress={() => setAddDialogVisible(true)}
          compact
        >
          Toevoegen
        </Button>
      </View>
      <Text
        variant="bodySmall"
        style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
      >
        Sleep om de standaard verwerkingsvolgorde aan te passen.
      </Text>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <Divider style={styles.divider} />

      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurface, marginBottom: 8 }}
      >
        Schrijfstijl-1.0
      </Text>
      <SegmentedButtons
        value={writingStyle.mode}
        onValueChange={(value) =>
          setWritingStyleMode(value as 'paste' | 'url')
        }
        buttons={[
          { value: 'paste', label: 'Tekst plakken' },
          { value: 'url', label: 'Externe URL' },
        ]}
        style={styles.segmented}
      />
      {writingStyle.mode === 'paste' ? (
        <TextInput
          label="Schrijfstijl-voorbeeldtekst"
          mode="outlined"
          multiline
          numberOfLines={4}
          value={writingStyle.pastedText}
          onChangeText={setWritingStylePastedText}
          style={styles.input}
        />
      ) : (
        <TextInput
          label="URL naar schrijfstijl-document"
          mode="outlined"
          autoCapitalize="none"
          keyboardType="url"
          value={writingStyle.url}
          onChangeText={setWritingStyleUrl}
          style={styles.input}
        />
      )}

      <Divider style={styles.divider} />

      <Text
        variant="titleMedium"
        style={{ color: theme.colors.onSurface, marginBottom: 8 }}
      >
        AI-instellingen
      </Text>
      <SegmentedButtons
        value={aiSettings.provider}
        onValueChange={(value) =>
          setAIProvider(value as 'anthropic' | 'openai')
        }
        buttons={[
          { value: 'anthropic', label: 'Anthropic' },
          { value: 'openai', label: 'OpenAI' },
        ]}
        style={styles.segmented}
      />
      <TextInput
        label="LLM API-key"
        mode="outlined"
        secureTextEntry
        autoCapitalize="none"
        value={aiSettings.apiKey}
        onChangeText={setAIApiKey}
        style={styles.input}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <DraggableMailboxList
        mailboxes={orderedMailboxes}
        onToggle={toggleMailboxSelected}
        onReorder={reorderMailboxes}
        onDelete={removeMailbox}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
      />

      <AddMailboxDialog
        visible={addDialogVisible}
        onDismiss={() => setAddDialogVisible(false)}
        onSubmit={handleAddMailbox}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hint: {
    marginBottom: 12,
  },
  footer: {
    paddingBottom: 32,
  },
  divider: {
    marginVertical: 20,
  },
  segmented: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 8,
  },
});
