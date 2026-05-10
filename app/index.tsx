import { Redirect } from 'expo-router';

import { useLovelockStore } from '@/src/store/lovelock-store';

export default function IndexRoute() {
  const authStatus = useLovelockStore((state) => state.authStatus);
  const effectiveSubscriptionAccess = useLovelockStore(
    (state) => state.effectiveSubscriptionAccess
  );
  const subscriptionStatus = useLovelockStore((state) => state.subscriptionStatus);
  const pairingPromptAnswered = useLovelockStore(
    (state) => state.onboarding.pairingPromptAnswered
  );

  if (authStatus === 'restoring' || subscriptionStatus === 'loading') {
    return null;
  }

  if (authStatus !== 'authenticated') {
    return <Redirect href="/welcome" />;
  }

  if (!pairingPromptAnswered) {
    return <Redirect href="/onboarding" />;
  }

  if (!effectiveSubscriptionAccess.isPremium) {
    return <Redirect href="/subscribe" />;
  }

  return <Redirect href="/(tabs)" />;
}
