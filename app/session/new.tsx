import { Redirect } from 'expo-router';

/** Planning now lives on the Sessions tab; keep this route for old links. */
export default function SessionNewRedirect() {
  return <Redirect href="/(tabs)/sessions" />;
}
