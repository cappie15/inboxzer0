import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, Text, TextInput, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useContactsStore } from '../store/contactsStore';
import { Contact } from '../utils/types';

interface ContactPickerProps {
  onSelect: (contact: { name: string; email: string }) => void;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ContactPicker({ onSelect }: ContactPickerProps) {
  const theme = useTheme();
  const topContacts = useContactsStore((state) => state.topContacts);
  const [query, setQuery] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');

  const filteredContacts = useMemo(() => {
    if (!query.trim()) return topContacts;
    const q = query.trim().toLowerCase();
    return topContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [topContacts, query]);

  const canAddManually = manualName.trim().length > 0 && isValidEmail(manualEmail);

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        label="Zoek in recente contacten"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        style={styles.search}
        left={<TextInput.Icon icon="magnify" />}
      />

      {topContacts.length === 0 && (
        <Text
          variant="bodySmall"
          style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
        >
          Nog geen recente contacten — voeg er hieronder handmatig één toe.
        </Text>
      )}

      {filteredContacts.length > 0 && (
        <View style={styles.list}>
          {filteredContacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              onPress={() => onSelect({ name: contact.name, email: contact.email })}
            />
          ))}
        </View>
      )}

      <Divider style={styles.divider} />

      <Text
        variant="labelLarge"
        style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}
      >
        Handmatig toevoegen
      </Text>
      <TextInput
        mode="outlined"
        label="Naam"
        value={manualName}
        onChangeText={setManualName}
        style={styles.input}
      />
      <TextInput
        mode="outlined"
        label="E-mailadres"
        value={manualEmail}
        onChangeText={setManualEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <Button
        mode="contained-tonal"
        disabled={!canAddManually}
        onPress={() => onSelect({ name: manualName.trim(), email: manualEmail.trim() })}
      >
        Gebruik dit contact
      </Button>
    </View>
  );
}

function ContactRow({
  contact,
  onPress,
}: {
  contact: Contact;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.contactRow,
        { backgroundColor: theme.colors.surfaceVariant },
      ]}
    >
      <View style={styles.avatarCircle}>
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
          {contact.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
          {contact.name}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {contact.email}
        </Text>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={theme.colors.onSurfaceVariant}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  search: {
    marginBottom: 12,
  },
  hint: {
    marginBottom: 12,
  },
  list: {
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3D5AFE20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  divider: {
    marginVertical: 16,
  },
  input: {
    marginBottom: 10,
  },
});
