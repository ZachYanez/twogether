import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

type FrostedCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}>;

export function FrostedCard({ children, style, innerStyle }: FrostedCardProps) {
  return (
    <BlurView intensity={48} tint="light" style={[styles.frostedCard, style]}>
      <View style={[styles.frostedInner, innerStyle]}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  frostedCard: {
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  frostedInner: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
});
