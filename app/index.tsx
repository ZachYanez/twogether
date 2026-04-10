import { Redirect } from 'expo-router';

import { useTwogetherStore } from '@/src/store/twogether-store';

export default function IndexRoute() {
  const authStatus = useTwogetherStore((state) => state.authStatus);
  const effectiveSubscriptionAccess = useTwogetherStore(
    (state) => state.effectiveSubscriptionAccess
  );
  const subscriptionStatus = useTwogetherStore((state) => state.subscriptionStatus);

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
