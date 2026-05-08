import { Redirect } from 'expo-router';

import { useLoveLockStore } from '@/src/store/love-lock-store';

export default function IndexRoute() {
  const authStatus = useLoveLockStore((state) => state.authStatus);
  const effectiveSubscriptionAccess = useLoveLockStore(
    (state) => state.effectiveSubscriptionAccess
  );
  const subscriptionStatus = useLoveLockStore((state) => state.subscriptionStatus);

  if (authStatus === 'restoring' || subscriptionStatus === 'loading') {
    return null;
  }

  if (authStatus !== 'authenticated') {
    return <Redirect href="/welcome" />;
  }

  if (!effectiveSubscriptionAccess.isPremium) {
    return <Redirect href="/subscribe" />;
  }

  return <Redirect href="/(tabs)" />;
}
