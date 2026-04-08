import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function PairScreen() {
  const router = useRouter();
  const inviteCode = useTwogetherStore((s) => s.onboarding.inviteCode);
  const pairWithPartner = useTwogetherStore((s) => s.pairWithPartner);

  return (
    <ScreenShell
      title="Pair up"
      subtitle="Share your invite code with your partner to get started.">
      <GlassCard style={styles.codeCard}>
        <Text style={styles.codeLabel}>Your invite code</Text>
        <Text style={styles.code}>{inviteCode}</Text>
      </GlassCard>

      <PrimaryButton
        label="Simulate partner acceptance"
        onPress={() => {
          void (async () => {
            await pairWithPartner();
            router.replace('/');
          })();
        }}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  code: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 40,
    fontWeight: '200',
    letterSpacing: 8,
    lineHeight: 48,
    textAlign: 'center',
  },
  codeCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  codeLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
