import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import SwipeCard from './SwipeCard';
import { EmailMessage, SwipeDirection } from '../utils/types';

const MAX_VISIBLE_CARDS = 3;

interface SwipeDeckProps {
  messages: EmailMessage[];
  onSwiped: (direction: SwipeDirection) => void;
}

export default function SwipeDeck({ messages, onSwiped }: SwipeDeckProps) {
  const theme = useTheme();

  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Geen berichten meer in deze sessie
        </Text>
      </View>
    );
  }

  const visible = messages.slice(0, MAX_VISIBLE_CARDS);

  return (
    <View style={styles.deckContainer}>
      {visible
        .map((message, index) => (
          <SwipeCard
            key={message.id}
            message={message}
            isTop={index === 0}
            stackIndex={index}
            onSwiped={onSwiped}
          />
        ))
        .reverse()}
    </View>
  );
}

const styles = StyleSheet.create({
  deckContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
