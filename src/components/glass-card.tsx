import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Layout, Shadows } from '@/constants/theme';

export function GlassCard({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.card,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusLg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    ...Shadows.sm,
  },
});
