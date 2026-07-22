import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTriageStore } from '../store/triageStore';

interface PostponedPromptScreenProps {
  onHandleNow: () => void;
  onSkip: () => void;
}

export default function PostponedPromptScreen({
  onHandleNow,
  onSkip,
}: PostponedPromptScreenProps) {
  const theme = useTheme();
  const postponedCount = useTriageStore((state) => state.queues.queue_postponed.length);
  const startPostponedRound = useTriageStore((state) => state.startPostponedRound);

  const handleYes = () => {
    startPostponedRound();
    onHandleNow();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="clock-outline"
          size={56}
          color={theme.colors.primary}
        />
        <Text
          variant="headlineSmall"
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          {postponedCount} uitgestelde{' '}
          {postponedCount === 1 ? 'e-mail' : "e-mails"}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Wil je de {postponedCount} uitgestelde{' '}
          {postponedCount === 1 ? 'e-mail' : "e-mails"} nu alsnog behandelen?
          Ze blijven ongelezen in je inbox staan als je nu stopt.
        </Text>

        <Button
          mode="contained"
          onPress={handleYes}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Ja, nu behandelen
        </Button>
        <Button mode="text" onPress={onSkip} style={styles.button}>
          Nee, laat ze ongelezen staan
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 32,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
    borderRadius: 12,
    marginBottom: 4,
  },
  buttonContent: {
    paddingVertical: 6,
  },
});
