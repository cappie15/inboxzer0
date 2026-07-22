import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  Portal,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import { ImapCredentials, MailProvider } from '../utils/types';

interface AddMailboxDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (mailbox: {
    displayName: string;
    emailAddress: string;
    provider: MailProvider;
    imapCredentials?: ImapCredentials;
  }) => void;
}

const PROVIDER_OPTIONS: { value: MailProvider; label: string }[] = [
  { value: 'm365', label: 'M365' },
  { value: 'gmail', label: 'Gmail' },
  { value: 'imap', label: 'IMAP' },
];

const DEFAULT_IMAP_PORT = '993';

export default function AddMailboxDialog({
  visible,
  onDismiss,
  onSubmit,
}: AddMailboxDialogProps) {
  const [provider, setProvider] = useState<MailProvider>('m365');
  const [displayName, setDisplayName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState(DEFAULT_IMAP_PORT);
  const [imapUsername, setImapUsername] = useState('');
  const [imapPassword, setImapPassword] = useState('');
  const [imapUseSsl, setImapUseSsl] = useState(true);

  const isOAuthProvider = provider === 'm365' || provider === 'gmail';
  const isImapProvider = provider === 'imap';

  const portNumber = Number(imapPort);
  const canSubmit =
    displayName.trim().length > 0 &&
    emailAddress.trim().length > 0 &&
    (!isImapProvider ||
      (imapHost.trim().length > 0 &&
        imapUsername.trim().length > 0 &&
        imapPassword.length > 0 &&
        Number.isInteger(portNumber) &&
        portNumber > 0));

  const reset = () => {
    setProvider('m365');
    setDisplayName('');
    setEmailAddress('');
    setImapHost('');
    setImapPort(DEFAULT_IMAP_PORT);
    setImapUsername('');
    setImapPassword('');
    setImapUseSsl(true);
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      displayName: displayName.trim(),
      emailAddress: emailAddress.trim(),
      provider,
      imapCredentials: isImapProvider
        ? {
            host: imapHost.trim(),
            port: portNumber,
            username: imapUsername.trim(),
            password: imapPassword,
            useSsl: imapUseSsl,
          }
        : undefined,
    });
    reset();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss}>
        <Dialog.Title>Mailbox toevoegen</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <Dialog.Content>
            <SegmentedButtons
              value={provider}
              onValueChange={(value) => setProvider(value as MailProvider)}
              buttons={PROVIDER_OPTIONS}
              style={styles.segmented}
            />

            {isOAuthProvider && (
              <Text variant="bodySmall" style={styles.hint}>
                OAuth2-koppeling volgt zodra de Client ID voor deze provider is
                geconfigureerd — vul hieronder alvast de gegevens in om de
                mailbox te reserveren.
              </Text>
            )}

            <TextInput
              label="Weergavenaam"
              mode="outlined"
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.input}
            />
            <TextInput
              label="E-mailadres"
              mode="outlined"
              value={emailAddress}
              onChangeText={setEmailAddress}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            {isImapProvider && (
              <>
                <Text variant="bodySmall" style={styles.hint}>
                  Deze gegevens worden lokaal versleuteld opgeslagen. Live
                  IMAP-synchronisatie volgt in een latere stap — de mailbox
                  draait tot die tijd op voorbeelddata.
                </Text>
                <TextInput
                  label="IMAP-host"
                  mode="outlined"
                  placeholder="imap.voorbeeld.nl"
                  value={imapHost}
                  onChangeText={setImapHost}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TextInput
                  label="Poort"
                  mode="outlined"
                  value={imapPort}
                  onChangeText={setImapPort}
                  keyboardType="number-pad"
                  style={styles.input}
                />
                <TextInput
                  label="Gebruikersnaam"
                  mode="outlined"
                  value={imapUsername}
                  onChangeText={setImapUsername}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TextInput
                  label="Wachtwoord"
                  mode="outlined"
                  value={imapPassword}
                  onChangeText={setImapPassword}
                  secureTextEntry
                  style={styles.input}
                />
                <View style={styles.sslRow}>
                  <Text variant="bodyMedium">Gebruik SSL/TLS</Text>
                  <Switch value={imapUseSsl} onValueChange={setImapUseSsl} />
                </View>
              </>
            )}
          </Dialog.Content>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={handleDismiss}>Annuleren</Button>
          <Button onPress={handleSubmit} disabled={!canSubmit}>
            Toevoegen
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 420,
  },
  segmented: {
    marginBottom: 12,
  },
  hint: {
    marginBottom: 12,
    opacity: 0.7,
  },
  input: {
    marginBottom: 12,
  },
  sslRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
