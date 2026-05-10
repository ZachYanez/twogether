import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ImmersiveText } from '@/constants/immersive-text';
import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';
import { FrostedCard } from '@/src/components/frosted-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { getAuthorizationStatus, getLocalShieldState } from '@/src/lib/lovelock-shield';
import { useLovelockStore } from '@/src/store/lovelock-store';

export default function SettingsScreen() {
  const router = useRouter();
  const placesRoute = '/places' as Parameters<typeof router.push>[0];
  const partner = useLovelockStore((s) => s.partner);
  const couple = useLovelockStore((s) => s.couple);
  const authSession = useLovelockStore((s) => s.authSession);
  const subscriptionStatus = useLovelockStore((s) => s.subscriptionStatus);
  const effectiveSubscriptionAccess = useLovelockStore((s) => s.effectiveSubscriptionAccess);
  const savedPlaces = useLovelockStore((s) => s.savedPlaces);
  const locationPermissionStatus = useLovelockStore((s) => s.locationPermissionStatus);
  const locationAutomationEnabled = useLovelockStore((s) => s.locationAutomationEnabled);
  const locationAutomationMode = useLovelockStore((s) => s.locationAutomationMode);
  const locationBusy = useLovelockStore((s) => s.locationBusy);
  const resetDemo = useLovelockStore((s) => s.resetDemo);
  const signOut = useLovelockStore((s) => s.signOut);
  const requestPairing = useLovelockStore((s) => s.requestPairing);
  const requestLocationPermission = useLovelockStore((s) => s.requestLocationPermission);
  const setLocationAutomationSettings = useLovelockStore((s) => s.setLocationAutomationSettings);
  const refreshLocationAutomation = useLovelockStore((s) => s.refreshLocationAutomation);
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
    <ScreenShell immersive showMenuButton title="Settings">
      <FrostedCard innerStyle={styles.inviteCard}>
        <Text style={styles.cardTitle}>Invite</Text>
        <Text style={styles.cardBody}>
          Send an invite to someone you&apos;d like to pair with.
        </Text>
        {inviteSent ? (
          <View style={styles.successBadge}>
            <View style={styles.successDot} />
            <Text style={styles.successText}>Invite sent!</Text>
          </View>
        ) : null}
        <TextInput
          value={inviteContact}
          onChangeText={(v) => { setInviteContact(v); setInviteSent(false); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onSubmitEditing={() => { void sendInvite(); }}
          placeholder="Phone number or email"
          placeholderTextColor={ImmersiveText.muted}
          returnKeyType="send"
          style={styles.input}
        />
        <PrimaryButton label="Send invite" onPress={() => { void sendInvite(); }} />
      </FrostedCard>

      <FrostedCard innerStyle={styles.cardInner}>
        <Text style={styles.cardTitle}>Account</Text>
        <View style={styles.rowGroup}>
          <Row label="Email" value={authSession?.email ?? 'N/A'} />
          <Row
            label="Subscription"
            value={
              effectiveSubscriptionAccess.source === 'partner'
                ? `Via ${effectiveSubscriptionAccess.ownerDisplayName ?? 'partner'}`
                : subscriptionStatus
            }
          />
          <Row label="Partner" value={partner?.displayName ?? 'Not paired'} />
        </View>
      </FrostedCard>

      <FrostedCard innerStyle={styles.cardInner}>
        <Text style={styles.cardTitle}>Saved places</Text>
        {automationAvailable ? (
          <>
            <Text style={styles.cardBody}>
              Detect when you and {partner?.displayName ?? 'your partner'} are at the same saved
              place.
            </Text>
            <View style={styles.rowGroup}>
              <Row label="Places" value={`${savedPlaces.length}`} />
              <Row label="Location" value={locationPermissionStatus} />
              <Row
                label="Mode"
                value={locationAutomationEnabled ? locationAutomationMode.replace('_', ' ') : 'Off'}
              />
            </View>
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
            <View style={styles.buttonGroup}>
              <PrimaryButton
                label={
                  locationAutomationEnabled
                    ? 'Turn off automation'
                    : 'Turn on automation'
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
                label="Manage places"
                secondary
                onPress={() => router.push(placesRoute)}
              />
              <PrimaryButton
                label="Refresh check-in"
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
          <Text style={styles.cardBody}>
            Pair with an active partner before turning on saved-place automation.
          </Text>
        )}
      </FrostedCard>

      <FrostedCard innerStyle={styles.cardInner}>
        <Text style={styles.cardTitle}>Device</Text>
        <View style={styles.rowGroup}>
          <Row label="Screen Time" value={nativeStatus} />
          <Row label="Shield" value={shieldState} />
        </View>
      </FrostedCard>

      <View style={styles.buttonGroup}>
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
  buttonGroup: { gap: 8 },
  cardBody: {
    color: ImmersiveText.secondary,
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 21,
  },
  cardInner: {
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  cardTitle: {
    color: ImmersiveText.primary,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  input: {
    backgroundColor: ImmersiveText.inputBg,
    borderColor: ImmersiveText.inputBorder,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    color: ImmersiveText.primary,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  inviteCard: {
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  rowGroup: {
    borderTopColor: ImmersiveText.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  rowLabel: {
    color: ImmersiveText.primary,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
  },
  rowValue: {
    color: ImmersiveText.tertiary,
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '400',
    textTransform: 'capitalize',
  },
  segment: {
    borderRadius: Layout.radiusSm,
    flex: 1,
    paddingVertical: 11,
  },
  segmentActive: {
    backgroundColor: Colors.dark.accent,
    ...Shadows.sm,
  },
  segmentRow: {
    backgroundColor: ImmersiveText.segmentTrack,
    borderRadius: Layout.radiusSm,
    flexDirection: 'row',
    padding: 3,
  },
  segmentText: {
    color: ImmersiveText.tertiary,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  successBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  successDot: {
    backgroundColor: Colors.dark.success,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  successText: {
    color: '#C8F5D4',
    fontFamily: Fonts.bodyMedium,
    fontSize: 14,
    fontWeight: '600',
  },
});
