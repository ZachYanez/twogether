import { useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  secondary = false,
  destructive = false,
  loading = false,
  disabled = false,
  compact = false,
}: PrimaryButtonProps) {
  const inactive = disabled || loading;
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, {
      toValue: 0.975,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6,
    }).start();
  }

  const isPrimary = !secondary && !destructive;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={inactive}
        style={[
          styles.button,
          compact && styles.buttonCompact,
          isPrimary && styles.primaryButton,
          isPrimary && Shadows.accent,
          secondary && styles.secondaryButton,
          destructive && styles.destructiveButton,
          inactive && styles.disabled,
        ]}>
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={secondary ? Colors.dark.text : '#FFFFFF'}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              isPrimary && styles.primaryLabel,
              secondary && styles.secondaryLabel,
              destructive && styles.destructiveLabel,
            ]}>
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Layout.radiusMd,
    minHeight: 52,
    paddingHorizontal: 24,
    paddingVertical: 15,
  },
  buttonCompact: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  destructiveButton: {
    backgroundColor: 'rgba(192, 57, 43, 0.08)',
    borderColor: 'rgba(192, 57, 43, 0.15)',
    borderWidth: 1,
  },
  destructiveLabel: {
    color: Colors.dark.danger,
  },
  disabled: {
    opacity: 0.4,
  },
  inner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  label: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  pressed: {
    opacity: 0.7,
  },
  primaryButton: {
    backgroundColor: Colors.dark.accent,
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderColor: Colors.dark.border,
    borderWidth: 1,
  },
  secondaryLabel: {
    color: Colors.dark.text,
  },
});
