import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useTwogetherStore } from '@/src/store/twogether-store';

function formatExpiration(value: string | null) {
  if (!value) return 'N/A';
  return format(new Date(value), 'MMM d, yyyy');
}

export default function SubscribeScreen() {
  const router = useRouter();
  const effectiveSubscriptionAccess = useTwogetherStore((s) => s.effectiveSubscriptionAccess);
  const subscriptionStatus = useTwogetherStore((s) => s.subscriptionStatus);
  const subscriptionPackages = useTwogetherStore((s) => s.subscriptionPackages);
  const subscriptionExpiresAt = useTwogetherStore((s) => s.subscriptionExpiresAt);
  const subscriptionWillRenew = useTwogetherStore((s) => s.subscriptionWillRenew);
  const subscriptionBusy = useTwogetherStore((s) => s.subscriptionBusy);
  const subscriptionError = useTwogetherStore((s) => s.subscriptionError);
  const syncSubscriptionState = useTwogetherStore((s) => s.syncSubscriptionState);
  const purchaseSubscriptionPackage = useTwogetherStore((s) => s.purchaseSubscriptionPackage);
  const restoreSubscriptionPurchases = useTwogetherStore((s) => s.restoreSubscriptionPurchases);
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);

  async function runAction(action: () => Promise<void>) {
    setScreenError(null);
    try {
      await action();
    } catch (e) {
      setScreenError(e instanceof Error ? e.message : 'Billing action failed.');
    }
  }

  const isActive = effectiveSubscriptionAccess.isPremium;
  const includedViaPartner = effectiveSubscriptionAccess.source === 'partner';

  return (
    <ScreenShell
      title="Subscribe"
      subtitle="Unlock Twogether with a subscription to start your shared sessions.">
      {isActive ? (
        <GlassCard style={styles.activeCard}>
          <Text style={styles.activeLabel}>
            {includedViaPartner ? 'Included through your partner' : 'Active'}
          </Text>
          <Text style={styles.activeDetail}>
            {includedViaPartner
              ? `${effectiveSubscriptionAccess.ownerDisplayName ?? 'Your partner'} is covering premium access for this pair.`
              : `${subscriptionWillRenew ? 'Renews' : 'Expires'} ${formatExpiration(subscriptionExpiresAt)}`}
          </Text>
          <PrimaryButton
            label="Continue"
            onPress={() => router.replace('/')}
          />
        </GlassCard>
      ) : null}

      {!isActive && subscriptionPackages.length > 0 ? (
        <View style={styles.packages}>
          {subscriptionPackages.map((entry) => (
            <Pressable
              key={`${entry.packageIdentifier}-${entry.productIdentifier}`}
              onPress={() => {
                setPendingPackageId(entry.packageIdentifier);
                void runAction(async () => {
                  await purchaseSubscriptionPackage(entry.packageIdentifier);
                }).finally(() => setPendingPackageId(null));
              }}>
              <GlassCard style={styles.packageCard}>
                <View style={styles.packageRow}>
                  <View style={styles.packageCopy}>
                    <Text style={styles.packageTitle}>{entry.title}</Text>
                    <Text style={styles.packageDesc}>{entry.description}</Text>
                  </View>
                  <Text style={styles.packagePrice}>{entry.priceString}</Text>
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      ) : null}

      {subscriptionError || screenError ? (
        <Text style={styles.error}>{screenError ?? subscriptionError}</Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          label="Refresh status"
          secondary
          loading={subscriptionStatus === 'loading'}
          onPress={() => void runAction(syncSubscriptionState)}
        />
        <PrimaryButton
          label="Restore purchases"
          secondary
          loading={subscriptionBusy && pendingPackageId === null}
          disabled={subscriptionBusy}
          onPress={() =>
            void runAction(restoreSubscriptionPurchases)
          }
        />
        <PrimaryButton
          label="Manage account"
          secondary
          onPress={() => router.push('/account')}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  activeCard: { gap: 12 },
  activeDetail: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  activeLabel: {
    color: Colors.dark.success,
    fontFamily: Fonts.bodyMedium,
    fontSize: 17,
    fontWeight: '600',
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  packageCard: { gap: 8 },
  packageCopy: { flex: 1, gap: 2 },
  packageDesc: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  packagePrice: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 22,
    fontWeight: '700',
  },
  packageRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  packageTitle: {
    color: Colors.dark.text,
    fontFamily: Fonts.bodyMedium,
    fontSize: 17,
    fontWeight: '600',
  },
  packages: { gap: 8 },
});
