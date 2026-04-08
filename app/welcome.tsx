import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function WelcomeScreen() {
  const router = useRouter();
  const authStatus = useTwogetherStore((state) => state.authStatus);

  if (authStatus === 'authenticated') {
    return <Redirect href="/" />;
  }

  return (
    <ScreenShell title="Twogether" subtitle="Make presence a pact.">
      <View style={styles.body}>
        <Text style={styles.description}>
          Put your phones down together. Twogether locks distracting apps on
          both devices during shared moments so you can be fully present.
        </Text>
      </View>

      <View style={styles.steps}>
        {['Create an account', 'Pair with your partner', 'Schedule a session', 'Be present'].map(
          (step, i) => (
            <View key={step} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          )
        )}
      </View>

      <PrimaryButton
        label="Get started"
        onPress={() => router.replace('/auth')}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 12,
  },
  description: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
  },
  stepNumber: {
    color: Colors.dark.textTertiary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '600',
    width: 24,
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomColor: Colors.dark.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepText: {
    color: Colors.dark.text,
    flex: 1,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
  },
  steps: {},
});
