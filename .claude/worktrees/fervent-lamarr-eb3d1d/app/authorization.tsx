import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { requestAuthorization } from '@/src/lib/twogether-shield';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function AuthorizationScreen() {
  const router = useRouter();
  const authorizationStatus = useTwogetherStore((s) => s.authorizationStatus);
  const setAuthorizationStatus = useTwogetherStore((s) => s.setAuthorizationStatus);
  const setLocalShieldState = useTwogetherStore((s) => s.setLocalShieldState);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  return (
    <ScreenShell
      title="Screen Time"
      subtitle="Allow access so Twogether can shield apps during sessions.">
      <GlassCard style={styles.statusCard}>
        <Text style={styles.statusLabel}>Current status</Text>
        <Text style={styles.statusValue}>{authorizationStatus}</Text>
      </GlassCard>

      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <View style={styles.actions}>
        <PrimaryButton
          label="Grant access"
          loading={loading}
          onPress={async () => {
            setLoading(true);
            setLastError(null);
            try {
              const status = await requestAuthorization();
              setAuthorizationStatus(status);
              setLocalShieldState(status === 'approved' ? 'armed' : 'idle');
              router.back();
            } catch (e) {
              setAuthorizationStatus('error');
              setLastError(e instanceof Error ? e.message : 'Authorization failed');
            } finally {
              setLoading(false);
            }
          }}
        />
        <PrimaryButton
          label="Skip for now"
          secondary
          onPress={() => {
            setAuthorizationStatus('denied');
            setLocalShieldState('idle');
            router.back();
          }}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  statusCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  statusLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusValue: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
