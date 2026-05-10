import { usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useTwogetherStore } from '@/src/store/twogether-store';

function resolveSignedInDestination(hasSubscription: boolean) {
  if (!hasSubscription) {
    return '/subscribe';
  }

  return '/(tabs)';
}

export function AppGate() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const authStatus = useTwogetherStore((state) => state.authStatus);
  const effectiveSubscriptionAccess = useTwogetherStore(
    (state) => state.effectiveSubscriptionAccess
  );
  const subscriptionStatus = useTwogetherStore((state) => state.subscriptionStatus);

  useEffect(() => {
    if (authStatus === 'restoring') {
      return;
    }

    const rootSegment = (segments[0] ?? 'index') as string;
    const hasSubscription = effectiveSubscriptionAccess.isPremium;
    const onPublicRoute = rootSegment === 'welcome' || rootSegment === 'auth';
    const onAllowedUnpaidRoute =
      rootSegment === 'subscribe' || rootSegment === 'account' || rootSegment === '+not-found';

    if (authStatus !== 'authenticated') {
      if (!onPublicRoute && rootSegment !== 'index' && pathname !== '/welcome') {
        router.replace('/welcome');
      }
      return;
    }

    if (subscriptionStatus === 'loading' || subscriptionStatus === 'idle') {
      return;
    }

    const signedInDestination = resolveSignedInDestination(hasSubscription);

    if (onPublicRoute && pathname !== signedInDestination) {
      router.replace(signedInDestination);
      return;
    }

    if (!hasSubscription) {
      if (!onAllowedUnpaidRoute && pathname !== '/subscribe') {
        router.replace('/subscribe');
      }
      return;
    }

    if (rootSegment === 'subscribe' && pathname !== signedInDestination) {
      router.replace(signedInDestination);
      return;
    }

    if (rootSegment === 'pair' && pathname !== '/(tabs)') {
      router.replace('/(tabs)');
    }
  }, [authStatus, effectiveSubscriptionAccess.isPremium, pathname, router, segments, subscriptionStatus]);

  return null;
}
