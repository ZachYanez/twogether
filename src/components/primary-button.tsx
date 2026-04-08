import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  secondary = false,
  destructive = false,
  loading = false,
  disabled = false,
}: PrimaryButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        secondary ? styles.secondaryButton : styles.primaryButton,
        destructive ? styles.destructiveButton : null,
        inactive ? styles.disabled : null,
        pressed && !inactive ? styles.pressed : null,
      ]}>
      <View style={styles.inner}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={secondary ? Colors.dark.text : Colors.dark.background}
          />
        ) : null}
        <Text
          style={[
            styles.label,
            secondary ? styles.secondaryLabel : styles.primaryLabel,
            destructive ? styles.destructiveLabel : null,
          ]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Layout.radiusMd,
    minHeight: 50,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  destructiveButton: {
    backgroundColor: 'transparent',
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
    fontFamily: Fonts.bodyMedium,
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  primaryButton: {
    backgroundColor: Colors.dark.text,
  },
  primaryLabel: {
    color: Colors.dark.background,
  },
  secondaryButton: {
    backgroundColor: Colors.dark.surface,
  },
  secondaryLabel: {
    color: Colors.dark.text,
  },
});
