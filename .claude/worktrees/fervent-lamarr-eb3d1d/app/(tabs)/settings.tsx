import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { getAuthorizationStatus, getLocalShieldState } from '@/src/lib/twogether-shield';
import { useTwogetherStore } from '@/src/store/twogether-store';

export default function SettingsScreen() {
  const router = useRouter();
  const placesRoute = '/places' as Parameters<typeof router.push>[0];
  const partner = useTwogetherStore((s) => s.partner);
  const couple = useTwogetherStore((s) => s.couple);
  const authSession = useTwogetherStore((s) => s.authSession);
  const subscriptionStatus = useTwogetherStore((s) => s.subscriptionStatus);
  const effectiveSubscriptionAccess = useTwogetherStore((s) => s.effectiveSubscriptionAccess);
  const savedPlaces = useTwogetherStore((s) => s.savedPlaces);
  const locationPermissionStatus = useTwogetherStore((s) => s.locationPermissionStatus);
  const locationAutomationEnabled = useTwogetherStore((s) => s.locationAutomationEnabled);
  const locationAutomationMode = useTwogetherStore((s) => s.locationAutomationMode);
  const locationBusy = useTwogetherStore((s) => s.locationBusy);
  const resetDemo = useTwogetherStore((s) => s.resetDemo);
  const signOut = useTwogetherStore((s) => s.signOut);
  const requestPairing = useTwogetherStore((s) => s.requestPairing);
  const requestLocationPermission = useTwogetherStore((s) => s.requestLocationPermission);
  const setLocationAutomationSettings = useTwogetherStore((s) => s.setLocationAutomationSettings);
  const refreshLocationAutomation = useTwogetherStore((s) => s.refreshLocationAutomation);
  const [nativeStatus, setNativeStatus] = useState('loading');
  const [shieldState, setShieldState] = useState('loading');
  const [inviteContact, setInviteContact] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const automationAvailable = couple?.status === 'active' && Boolean(partner);

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

  async function sendInvite() {
    const trimmed = inviteContact.trim();
    if (!trimmed) return;
    await requestPairing(trimmed);
    setInviteContact('');
    setInviteSent(true);
  }

  return (
    <ScreenShell title="Settings">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invite</Text>
        <Text style={styles.inviteHint}>
          Send an invite to someone you&apos;d like to pair with.
        </Text>
        {inviteSent ? (
          <Text style={styles.inviteSent}>Invite sent!</Text>
        ) : null}
        <TextInput
          value={inviteContact}
          onChangeText={(v) => { setInviteContact(v); setInviteSent(false); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onSubmitEditing={() => { void sendInvite(); }}
          placeholder="Phone number or email"
          placeholderTextColor={Colors.dark.textTertiary}
          returnKeyType="send"
          style={styles.inviteInput}
        />
        <PrimaryButton label="Send invite" onPress={() => { void sendInvite(); }} />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Row label="Email" value={authSession?.email ?? 'N/A'} />
        <Row
          label="Subscription"
          value={
            effectiveSubscriptionAccess.source === 'partner'
              ? `Included via ${effectiveSubscriptionAccess.ownerDisplayName ?? 'partner'}`
              : subscriptionStatus
          }
        />
        <Row label="Partner" value={partner?.displayName ?? 'Not paired'} />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved places</Text>
        {automationAvailable ? (
          <>
            <Text style={styles.inviteHint}>
              Detect when you and {partner?.displayName ?? 'your partner'} are at the same saved
              place.
            </Text>
            <Row label="Places" value={`${savedPlaces.length}`} />
            <Row label="Location" value={locationPermissionStatus} />
            <Row
              label="Mode"
              value={locationAutomationEnabled ? locationAutomationMode.replace('_', ' ') : 'off'}
            />
            <View style={styles.segmentRow}>
              {(['suggest', 'auto_arm'] as const).map((mode) => {
                const selected = locationAutomationMode === mode;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      void setLocationAutomationSettings({
                        enabled: true,
                        mode,
                      });
                    }}
                    style={[styles.segment, selected && styles.segmentActive]}>
                    <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                      {mode === 'suggest' ? 'Suggest' : 'Auto-arm'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.actions}>
              <PrimaryButton
                label={
                  locationAutomationEnabled
                    ? 'Turn off saved-place automation'
                    : 'Turn on saved-place automation'
                }
                secondary={locationAutomationEnabled}
                loading={locationBusy}
                onPress={() => {
                  void setLocationAutomationSettings({
                    enabled: !locationAutomationEnabled,
                    mode: locationAutomationMode,
                  });
                }}
              />
              <PrimaryButton
                label="Manage saved places"
                secondary
                onPress={() => router.push(placesRoute)}
              />
              <PrimaryButton
                label="Refresh place check-in"
                secondary
                loading={locationBusy}
                onPress={() => {
                  void refreshLocationAutomation();
                }}
              />
              {locationPermissionStatus !== 'granted' ? (
                <PrimaryButton
                  label="Allow location"
                  secondary
                  onPress={() => {
                    void requestLocationPermission();
                  }}
                />
              ) : null}
            </View>
          </>
        ) : (
          <Text style={styles.inviteHint}>
            Pair with an active partner before turning on saved-place automation.
          </Text>
        )}
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
  inviteHint: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    marginBottom: 10,
  },
  segment: {
    borderRadius: Layout.radiusSm,
    flex: 1,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: Colors.dark.accent,
  },
  segmentRow: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusSm,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 3,
  },
  segmentText: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  inviteInput: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    borderWidth: 1,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    marginBottom: 10,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  inviteSent: {
    color: Colors.dark.success,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
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
