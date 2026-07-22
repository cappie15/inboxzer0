import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import { MailProvider } from '../utils/types';

interface AddMailboxDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (mailbox: {
    displayName: string;
    emailAddress: string;
    provider: MailProvider;
  }) => void;
}

const PROVIDER_OPTIONS: { value: MailProvider; label: string }[] = [
  { value: 'm365', label: 'M365' },
  { value: 'gmail', label: 'Gmail' },
  { value: 'imap', label: 'IMAP' },
];

export default function AddMailboxDialog({
  visible,
  onDismiss,
  onSubmit,
}: AddMailboxDialogProps) {
  const [provider, setProvider] = useState<MailProvider>('m365');
  const [displayName, setDisplayName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');

  const isOAuthProvider = provider === 'm365' || provider === 'gmail';
  const canSubmit = displayName.trim().length > 0 && emailAddress.trim().length > 0;

  const reset = () => {
    setProvider('m365');
    setDisplayName('');
    setEmailAddress('');
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
    });
    reset();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss}>
        <Dialog.Title>Mailbox toevoegen</Dialog.Title>
        <Dialog.Content>
          <SegmentedButtons
            value={provider}
            onValueChange={(value) => setProvider(value as MailProvider)}
            buttons={PROVIDER_OPTIONS}
            style={styles.segmented}
          />

          {isOAuthProvider && (
            <Text variant="bodySmall" style={styles.oauthHint}>
              OAuth2-koppeling volgt in een latere iteratie — vul hieronder
              alvast de gegevens in om de mailbox te reserveren.
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
        </Dialog.Content>
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
  segmented: {
    marginBottom: 12,
  },
  oauthHint: {
    marginBottom: 12,
    opacity: 0.7,
  },
  input: {
    marginBottom: 12,
  },
});
