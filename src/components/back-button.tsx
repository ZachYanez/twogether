import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Layout } from '@/constants/theme';

type BackButtonProps = {
  color?: string;
  /** Frosted circle for use on photo / immersive backgrounds. */
  glass?: boolean;
};

export function BackButton({ color, glass = false }: BackButtonProps) {
  const iconColor = color ?? (glass ? 'rgba(255,255,255,0.92)' : Colors.dark.text);
  const navigation = useNavigation();

  if (!navigation.canGoBack()) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel="Go back"
      hitSlop={12}
      onPress={() => navigation.goBack()}
      style={({ pressed }) => [
        styles.button,
        pressed ? styles.buttonPressed : null,
      ]}>
      <View style={[styles.inner, glass && styles.innerGlass]}>
        <Ionicons name="chevron-back" size={20} color={iconColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    borderRadius: 999,
  },
  buttonPressed: {
    opacity: 0.65,
  },
  inner: {
    alignItems: 'center',
    backgroundColor: Colors.dark.surfaceElevated,
    borderColor: Colors.dark.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  innerGlass: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
});
