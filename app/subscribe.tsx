import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, Layout, Shadows } from '@/constants/theme';
import { GlassCard } from '@/src/components/glass-card';
import { PrimaryButton } from '@/src/components/primary-button';
import { ScreenShell } from '@/src/components/screen-shell';
import { useLovelockStore } from '@/src/store/lovelock-store';

function formatExpiration(value: string | null) {
  if (!value) return 'N/A';
  return format(new Date(value), 'MMM d, yyyy');
}

export default function SubscribeScreen() {
  const router = useRouter();
  const effectiveSubscriptionAccess = useLovelockStore((s) => s.effectiveSubscriptionAccess);
  const subscriptionStatus = useLovelockStore((s) => s.subscriptionStatus);
  const subscriptionPackages = useLovelockStore((s) => s.subscriptionPackages);
  const subscriptionExpiresAt = useLovelockStore((s) => s.subscriptionExpiresAt);
  const subscriptionWillRenew = useLovelockStore((s) => s.subscriptionWillRenew);
  const subscriptionBusy = useLovelockStore((s) => s.subscriptionBusy);
  const subscriptionError = useLovelockStore((s) => s.subscriptionError);
  const syncSubscriptionState = useLovelockStore((s) => s.syncSubscriptionState);
  const purchaseSubscriptionPackage = useLovelockStore((s) => s.purchaseSubscriptionPackage);
  const restoreSubscriptionPurchases = useLovelockStore((s) => s.restoreSubscriptionPurchases);
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
      subtitle="Unlock Love Lock with a subscription to start your shared sessions."
      showBackButton>
      {isActive ? (
        <GlassCard style={styles.activeCard}>
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeLabel}>
              {includedViaPartner ? 'Included through partner' : 'Active'}
            </Text>
          </View>
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
            <PackageCard
              key={`${entry.packageIdentifier}-${entry.productIdentifier}`}
              title={entry.title}
              description={entry.description}
              price={entry.priceString}
              onPress={() => {
                setPendingPackageId(entry.packageIdentifier);
                void runAction(async () => {
                  await purchaseSubscriptionPackage(entry.packageIdentifier);
                }).finally(() => setPendingPackageId(null));
              }}
            />
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

function PackageCard({
  title,
  description,
  price,
  onPress,
}: {
  title: string;
  description: string;
  price: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }

  function onPressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6,
    }).start();
  }

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <GlassCard style={styles.packageCard}>
          <View style={styles.packageRow}>
            <View style={styles.packageCopy}>
              <Text style={styles.packageTitle}>{title}</Text>
              <Text style={styles.packageDesc}>{description}</Text>
            </View>
            <Text style={styles.packagePrice}>{price}</Text>
          </View>
        </GlassCard>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8 },
  activeBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  activeCard: { gap: 14 },
  activeDetail: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  activeDot: {
    backgroundColor: Colors.dark.success,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  activeLabel: {
    color: Colors.dark.success,
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: Colors.dark.danger,
    fontFamily: Fonts.body,
    fontSize: 15,
    fontWeight: '400',
  },
  packageCard: { gap: 8 },
  packageCopy: { flex: 1, gap: 3 },
  packageDesc: {
    color: Colors.dark.textSecondary,
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '400',
  },
  packagePrice: {
    color: Colors.dark.text,
    fontFamily: Fonts.display,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
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
  packages: { gap: 10 },
});
