import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import {
  presentRevenueCatCustomerCenter,
} from '@/src/lib/revenuecat';
import { useLovelockStore } from '@/src/store/lovelock-store';

function formatDate(value: string | null) {
  return value ? format(new Date(value), 'MMM d, yyyy') : 'N/A';
}

export default function AccountScreen() {
  const router = useRouter();
  const authSession = useLovelockStore((s) => s.authSession);
  const currentUser = useLovelockStore((s) => s.currentUser);
  const effectiveSubscriptionAccess = useLovelockStore((s) => s.effectiveSubscriptionAccess);
  const subscriptionStatus = useLovelockStore((s) => s.subscriptionStatus);
  const subscriptionExpiresAt = useLovelockStore((s) => s.subscriptionExpiresAt);
  const updateAccountDisplayName = useLovelockStore((s) => s.updateAccountDisplayName);
  const requestPasswordReset = useLovelockStore((s) => s.requestPasswordReset);
  const restoreSubscriptionPurchases = useLovelockStore((s) => s.restoreSubscriptionPurchases);
  const syncSubscriptionState = useLovelockStore((s) => s.syncSubscriptionState);
  const signOut = useLovelockStore((s) => s.signOut);
  const deleteAccount = useLovelockStore((s) => s.deleteAccount);
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? '');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canResetPassword = authSession?.provider === 'password';

  useEffect(() => {
    setDisplayName(currentUser?.displayName ?? '');
  }, [currentUser?.displayName]);

  async function runAction(id: string, action: () => Promise<void>) {
    setBusyAction(id);
    setError(null);
    setNotice(null);
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed.'); }
    finally { setBusyAction(null); }
  }

  return (
    <ScreenShell title="Account" showBackButton>
      <GlassCard style={styles.profileCard}>
        <Text style={styles.cardTitle}>Profile</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={Colors.dark.textTertiary}
          style={styles.input}
        />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{authSession?.email ?? 'N/A'}</Text>
        </View>
        <PrimaryButton
          label="Save"
          loading={busyAction === 'profile'}
          onPress={() =>
            void runAction('profile', async () => {
              await updateAccountDisplayName(displayName);
              setNotice('Saved.');
            })
          }
        />
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>Billing</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>
            {effectiveSubscriptionAccess.source === 'partner'
              ? `Via ${effectiveSubscriptionAccess.ownerDisplayName ?? 'partner'}`
              : subscriptionStatus}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expires</Text>
          <Text style={styles.detailValue}>
            {formatDate(
              effectiveSubscriptionAccess.source === 'partner'
                ? effectiveSubscriptionAccess.expiresAt
                : subscriptionExpiresAt
            )}
          </Text>
        </View>
        {effectiveSubscriptionAccess.source !== 'partner' ? (
          <View style={styles.buttonGroup}>
            <PrimaryButton
              label="Billing center"
              secondary
              loading={busyAction === 'customer_center'}
              onPress={() =>
                void runAction('customer_center', async () => {
                  await presentRevenueCatCustomerCenter();
                  await syncSubscriptionState();
                })
              }
            />
            <PrimaryButton
              label="Restore purchases"
              secondary
              loading={busyAction === 'restore'}
              onPress={() =>
                void runAction('restore', async () => {
                  await restoreSubscriptionPurchases();
                  setNotice('Purchases restored.');
                })
              }
            />
          </View>
        ) : null}
      </GlassCard>

      {notice ? (
        <View style={styles.noticeBadge}>
          <View style={styles.noticeDot} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.buttonGroup}>
        {canResetPassword ? (
          <PrimaryButton
            label="Reset password"
            secondary
            loading={busyAction === 'reset_password'}
            onPress={() =>
              void runAction('reset_password', async () => {
                if (!authSession?.email) throw new Error('No email available.');
                const msg = await requestPasswordReset(authSession.email);
                setNotice(msg);
              })
            }
          />
        ) : null}
        <PrimaryButton
          label="Sign out"
          secondary
          loading={busyAction === 'sign_out'}
          onPress={() =>
            void runAction('sign_out', async () => {
              await signOut();
              router.replace('/welcome');
            })
          }
        />
        <PrimaryButton
          label="Delete account"
          destructive
          loading={busyAction === 'delete'}
          onPress={() => {
            Alert.alert('Delete account?', 'This cannot be undone.', [
              { style: 'cancel', text: 'Cancel' },
              {
                style: 'destructive',
                text: 'Delete',
                onPress: () => {
                  void runAction('delete', async () => {
                    await deleteAccount();
                    router.replace('/welcome');
                  });
                },
              },
            ]);
          }}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  buttonGroup: { gap: 8 },
  cardTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  detailLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  detailRow: {
    borderTopColor: Colors.dark.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  detailValue: {
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  input: {
    backgroundColor: Colors.dark.surfaceElevated,
    borderColor: Colors.dark.border,
    borderRadius: Layout.radiusMd,
    borderWidth: 1,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  noticeBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  noticeDot: {
    backgroundColor: Colors.dark.success,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  noticeText: {
    color: Colors.dark.success,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    fontWeight: '500',
  },
  profileCard: {
    gap: 12,
  },
});
