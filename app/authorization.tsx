import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { requestAuthorization } from '@/src/lib/lovelock-shield';
import { useLovelockStore } from '@/src/store/lovelock-store';

export default function AuthorizationScreen() {
  const router = useRouter();
  const authorizationStatus = useLovelockStore((s) => s.authorizationStatus);
  const setAuthorizationStatus = useLovelockStore((s) => s.setAuthorizationStatus);
  const setLocalShieldState = useLovelockStore((s) => s.setLocalShieldState);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  return (
    <ScreenShell
      title="Screen Time"
      subtitle="Allow access so Love Lock can shield apps during sessions."
      showBackButton>
      <GlassCard style={styles.statusCard}>
        <Text style={styles.statusLabel}>Current status</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              authorizationStatus === 'approved' && styles.statusDotApproved,
            ]}
          />
          <Text style={styles.statusValue}>{authorizationStatus}</Text>
        </View>
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
  actions: { gap: 10 },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  statusCard: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
  },
  statusDot: {
    backgroundColor: Colors.dark.textTertiary,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  statusDotApproved: {
    backgroundColor: Colors.dark.success,
  },
  statusLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  statusValue: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    textTransform: 'capitalize',
  },
});
