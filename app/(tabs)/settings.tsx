import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { getAuthorizationStatus, getLocalShieldState } from '@/src/lib/twogether-shield';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function SettingsScreen() {
  const router = useRouter();
  const currentUser = useTwogetherStore((s) => s.currentUser);
  const partner = useTwogetherStore((s) => s.partner);
  const authSession = useTwogetherStore((s) => s.authSession);
  const subscriptionStatus = useTwogetherStore((s) => s.subscriptionStatus);
  const resetDemo = useTwogetherStore((s) => s.resetDemo);
  const signOut = useTwogetherStore((s) => s.signOut);
  const [nativeStatus, setNativeStatus] = useState('loading');
  const [shieldState, setShieldState] = useState('loading');

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [auth, shield] = await Promise.all([
        getAuthorizationStatus(),
        getLocalShieldState(),
      ]);
      if (mounted) { setNativeStatus(auth); setShieldState(shield); }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  return (
    <ScreenShell title="Settings">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Row label="Email" value={authSession?.email ?? 'N/A'} />
        <Row label="Subscription" value={subscriptionStatus} />
        <Row label="Partner" value={partner?.displayName ?? 'Not paired'} />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device</Text>
        <Row label="Screen Time" value={nativeStatus} />
        <Row label="Shield" value={shieldState} />
      </View>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <PrimaryButton label="Account & billing" onPress={() => router.push('/account')} />
        <PrimaryButton label="Authorization" secondary onPress={() => router.push('/authorization')} />
        <PrimaryButton label="Choose apps" secondary onPress={() => router.push('/selection')} />
        <PrimaryButton
          label="Sign out"
          secondary
          onPress={async () => {
            await signOut();
            router.replace('/auth');
          }}
        />
        <PrimaryButton
          label="Reset demo"
          secondary
          onPress={() => {
            resetDemo();
            router.replace('/(tabs)');
          }}
        />
      </View>
    </ScreenShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  divider: {
    backgroundColor: Colors.dark.border,
    height: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: {
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
  },
  rowValue: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  section: { gap: 0 },
  sectionTitle: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
});
