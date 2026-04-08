import { Redirect } from 'expo-router';

import { useTwogetherStore } from '@/src/store/twogether-store';

export default function IndexRoute() {
  const authStatus = useTwogetherStore((state) => state.authStatus);
  const partner = useTwogetherStore((state) => state.partner);
  const subscriptionStatus = useTwogetherStore((state) => state.subscriptionStatus);

  if (authStatus === 'restoring' || subscriptionStatus === 'loading') {
    return null;
  }

  if (authStatus !== 'authenticated') {
    return <Redirect href="/welcome" />;
  }

  if (subscriptionStatus !== 'active') {
    return <Redirect href="/subscribe" />;
  }

  if (!partner) {
    return <Redirect href="/pair" />;
  }

  return <Redirect href="/(tabs)" />;
}
