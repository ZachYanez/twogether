import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

type DrawerMenuButtonProps = {
  color?: string;
  tint?: 'light' | 'dark';
};

export function DrawerMenuButton({
  color,
  tint = 'light',
}: DrawerMenuButtonProps) {
  const navigation = useNavigation();
  const iconColor = color ?? (tint === 'dark' ? 'rgba(255,255,255,0.9)' : Colors.dark.text);

  return (
    <Pressable
      accessibilityLabel="Open menu"
      hitSlop={12}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      style={({ pressed }) => [
        styles.button,
        tint === 'dark' ? styles.buttonDark : styles.buttonLight,
        pressed && styles.buttonPressed,
      ]}>
      <Ionicons name="menu" size={22} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  buttonDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  buttonLight: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderColor: Colors.dark.border,
  },
  buttonPressed: {
    opacity: 0.65,
  },
});
