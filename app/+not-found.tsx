import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <ScreenShell title="Page not found">
      <View style={styles.body}>
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <PrimaryButton label="Go home" onPress={() => router.replace('/(tabs)')} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 24,
    paddingVertical: 40,
  },
  text: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    textAlign: 'center',
  },
});
