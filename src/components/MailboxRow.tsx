import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Mailbox, MailProvider } from '../utils/types';

const PROVIDER_ICON: Record<MailProvider, keyof typeof MaterialCommunityIcons.glyphMap> = {
  m365: 'microsoft-outlook',
  gmail: 'gmail',
  imap: 'email-outline',
};

const PROVIDER_LABEL: Record<MailProvider, string> = {
  m365: 'Microsoft 365',
  gmail: 'Gmail',
  imap: 'IMAP',
};

interface MailboxRowProps {
  mailbox: Mailbox;
  onToggle: (id: string) => void;
  onLongPressDrag: () => void;
  isActive: boolean;
  onDelete?: (id: string) => void;
}

export default function MailboxRow({
  mailbox,
  onToggle,
  onLongPressDrag,
  isActive,
  onDelete,
}: MailboxRowProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: isActive
            ? theme.colors.surfaceVariant
            : theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <Checkbox
        status={mailbox.selected ? 'checked' : 'unchecked'}
        onPress={() => onToggle(mailbox.id)}
      />
      <MaterialCommunityIcons
        name={PROVIDER_ICON[mailbox.provider]}
        size={22}
        color={theme.colors.onSurfaceVariant}
        style={styles.providerIcon}
      />
      <View style={styles.textContainer}>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
          {mailbox.displayName}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {mailbox.emailAddress} · {PROVIDER_LABEL[mailbox.provider]}
        </Text>
      </View>
      {onDelete && (
        <Pressable
          onPress={() => onDelete(mailbox.id)}
          style={styles.deleteButton}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={20}
            color={theme.colors.error}
          />
        </Pressable>
      )}
      <Pressable onPressIn={onLongPressDrag} style={styles.dragHandle} hitSlop={8}>
        <MaterialCommunityIcons
          name="drag-horizontal-variant"
          size={22}
          color={theme.colors.onSurfaceVariant}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  providerIcon: {
    marginHorizontal: 8,
  },
  textContainer: {
    flex: 1,
  },
  dragHandle: {
    paddingHorizontal: 8,
  },
  deleteButton: {
    paddingHorizontal: 6,
  },
});
