import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Fonts, Layout } from '@/constants/theme';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import {
  openRevenueCatManagementUrl,
  presentRevenueCatCustomerCenter,
} from '@/src/lib/revenuecat';
import { useTwogetherStore } from '@/src/store/twogether-store';

function formatDate(value: string | null) {
  return value ? format(new Date(value), 'MMM d, yyyy') : 'N/A';
}

export default function AccountScreen() {
  const router = useRouter();
  const authSession = useTwogetherStore((s) => s.authSession);
  const currentUser = useTwogetherStore((s) => s.currentUser);
  const subscriptionStatus = useTwogetherStore((s) => s.subscriptionStatus);
  const subscriptionManagementUrl = useTwogetherStore((s) => s.subscriptionManagementUrl);
  const subscriptionExpiresAt = useTwogetherStore((s) => s.subscriptionExpiresAt);
  const updateAccountDisplayName = useTwogetherStore((s) => s.updateAccountDisplayName);
  const requestPasswordReset = useTwogetherStore((s) => s.requestPasswordReset);
  const restoreSubscriptionPurchases = useTwogetherStore((s) => s.restoreSubscriptionPurchases);
  const syncSubscriptionState = useTwogetherStore((s) => s.syncSubscriptionState);
  const signOut = useTwogetherStore((s) => s.signOut);
  const deleteAccount = useTwogetherStore((s) => s.deleteAccount);
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
    <ScreenShell title="Account">
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display name"
          placeholderTextColor={Colors.dark.textTertiary}
          style={styles.input}
        />
        <View style={styles.detail}>
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
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Billing</Text>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>{subscriptionStatus}</Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.detailLabel}>Expires</Text>
          <Text style={styles.detailValue}>{formatDate(subscriptionExpiresAt)}</Text>
        </View>
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

      <View style={styles.divider} />

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
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
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  detailValue: {
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  divider: {
    backgroundColor: Colors.dark.border,
    height: StyleSheet.hairlineWidth,
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Layout.radiusMd,
    color: Colors.dark.text,
    fontFamily: Fonts.body,
    fontSize: 17,
    fontWeight: '400',
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notice: {
    color: Colors.dark.success,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  section: { gap: 10 },
  sectionTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.bodyMedium,
    fontSize: 20,
    fontWeight: '600',
  },
});
