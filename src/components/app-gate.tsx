import { usePathname, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useTwogetherStore } from '@/src/store/twogether-store';

function resolveSignedInDestination(hasPartner: boolean, hasSubscription: boolean) {
  if (!hasSubscription) {
    return '/subscribe';
  }

  return hasPartner ? '/' : '/pair';
}

export function AppGate() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const authStatus = useTwogetherStore((state) => state.authStatus);
  const partner = useTwogetherStore((state) => state.partner);
  const subscriptionStatus = useTwogetherStore((state) => state.subscriptionStatus);

  useEffect(() => {
    if (authStatus === 'restoring') {
      return;
    }

    const rootSegment = segments[0] ?? 'index';
    const hasPartner = Boolean(partner);
    const hasSubscription = subscriptionStatus === 'active';
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

    const signedInDestination = resolveSignedInDestination(hasPartner, hasSubscription);

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

    if (!hasPartner && rootSegment === '(tabs)' && pathname !== '/pair') {
      router.replace('/pair');
      return;
    }

    if (hasPartner && rootSegment === 'pair' && pathname !== '/') {
      router.replace('/');
    }
  }, [authStatus, partner, pathname, router, segments, subscriptionStatus]);

  return null;
}
