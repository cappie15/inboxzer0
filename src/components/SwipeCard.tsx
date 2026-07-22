import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EmailMessage, SwipeDirection } from '../utils/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const VERTICAL_THRESHOLD = 110;

interface SwipeCardProps {
  message: EmailMessage;
  onSwiped: (direction: SwipeDirection) => void;
  isTop: boolean;
  stackIndex: number;
}

function formatReceivedAt(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SwipeCard({
  message,
  onSwiped,
  isTop,
  stackIndex,
}: SwipeCardProps) {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const finishSwipe = (direction: SwipeDirection) => {
    onSwiped(direction);
  };

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      const { translationX, translationY, velocityX, velocityY } = event;
      const isHorizontalDominant =
        Math.abs(translationX) > Math.abs(translationY);

      let direction: SwipeDirection | null = null;

      if (isHorizontalDominant) {
        if (translationX > SWIPE_THRESHOLD || velocityX > 800) {
          direction = 'right';
        } else if (translationX < -SWIPE_THRESHOLD || velocityX < -800) {
          direction = 'left';
        }
      } else {
        if (translationY < -VERTICAL_THRESHOLD || velocityY < -800) {
          direction = 'up';
        } else if (translationY > VERTICAL_THRESHOLD || velocityY > 800) {
          direction = 'down';
        }
      }

      if (direction) {
        const flyOutX =
          direction === 'right'
            ? SCREEN_WIDTH * 1.5
            : direction === 'left'
              ? -SCREEN_WIDTH * 1.5
              : translationX * 2;
        const flyOutY =
          direction === 'down'
            ? SCREEN_WIDTH * 1.5
            : direction === 'up'
              ? -SCREEN_WIDTH * 1.5
              : translationY * 2;

        translateX.value = withTiming(flyOutX, { duration: 220 });
        translateY.value = withTiming(flyOutY, { duration: 220 }, () => {
          runOnJS(finishSwipe)(direction as SwipeDirection);
        });
        runOnJS(triggerHaptic)();
      } else {
        translateX.value = withSpring(0, { damping: 16 });
        translateY.value = withSpring(0, { damping: 16 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-12, 0, 12],
      Extrapolation.CLAMP
    );

    if (isTop) {
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotate: `${rotate}deg` },
        ],
      };
    }

    const scale = 1 - Math.min(stackIndex, 2) * 0.04;
    const offsetY = Math.min(stackIndex, 2) * 10;
    return {
      transform: [{ translateY: offsetY }, { scale }],
    };
  });

  const replyOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [-VERTICAL_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));
  const postponeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [0, VERTICAL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));
  const archiveOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));
  const forwardOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0],
      [1, 0],
      Extrapolation.CLAMP
    ),
  }));

  const attachmentCount = message.attachments.length;

  const cardContent = (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          shadowColor: theme.dark ? '#000' : '#8891A6',
        },
        cardStyle,
      ]}
    >
      {isTop && (
        <>
          <Animated.View
            style={[styles.stamp, styles.stampTopLeft, replyOpacity]}
          >
            <Text style={[styles.stampText, { color: theme.colors.primary }]}>
              ANTWOORDEN
            </Text>
          </Animated.View>
          <Animated.View
            style={[styles.stamp, styles.stampBottomLeft, postponeOpacity]}
          >
            <Text style={[styles.stampText, { color: '#F5A623' }]}>
              UITSTELLEN
            </Text>
          </Animated.View>
          <Animated.View
            style={[styles.stamp, styles.stampRight, archiveOpacity]}
          >
            <Text style={[styles.stampText, { color: '#2ECC71' }]}>
              ARCHIVEREN
            </Text>
          </Animated.View>
          <Animated.View
            style={[styles.stamp, styles.stampLeft, forwardOpacity]}
          >
            <Text style={[styles.stampText, { color: '#9B51E0' }]}>
              DOORSTUREN
            </Text>
          </Animated.View>
        </>
      )}

      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {message.from.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text
            variant="titleMedium"
            numberOfLines={1}
            style={{ color: theme.colors.onSurface }}
          >
            {message.from.name}
          </Text>
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {message.from.email}
          </Text>
        </View>
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {formatReceivedAt(message.receivedAt)}
        </Text>
      </View>

      <Text
        variant="titleLarge"
        style={[styles.subject, { color: theme.colors.onSurface }]}
        numberOfLines={2}
      >
        {message.subject}
      </Text>

      <Text
        variant="bodyMedium"
        style={{ color: theme.colors.onSurfaceVariant }}
        numberOfLines={6}
      >
        {message.body}
      </Text>

      <View style={styles.footer}>
        {message.priority && (
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              Prio {message.priority}
            </Text>
          </View>
        )}
        {attachmentCount > 0 && (
          <View style={styles.attachmentRow}>
            <MaterialCommunityIcons
              name="paperclip"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.onSurfaceVariant, marginLeft: 2 }}
            >
              {attachmentCount}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  if (!isTop) {
    return cardContent;
  }

  return <GestureDetector gesture={pan}>{cardContent}</GestureDetector>;
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3D5AFE20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: '#3D5AFE',
    fontWeight: '700',
    fontSize: 16,
  },
  headerText: {
    flex: 1,
  },
  subject: {
    fontWeight: '700',
    marginBottom: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stamp: {
    position: 'absolute',
    zIndex: 10,
    borderWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stampTopLeft: {
    top: 16,
    alignSelf: 'center',
    left: 0,
    right: 0,
    borderColor: 'transparent',
  },
  stampBottomLeft: {
    bottom: 16,
    alignSelf: 'center',
    left: 0,
    right: 0,
    borderColor: 'transparent',
  },
  stampRight: {
    top: '45%',
    right: 16,
    borderColor: '#2ECC71',
    transform: [{ rotate: '-15deg' }],
  },
  stampLeft: {
    top: '45%',
    left: 16,
    borderColor: '#9B51E0',
    transform: [{ rotate: '15deg' }],
  },
  stampText: {
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
});
