import * as SecureStore from 'expo-secure-store';

import type { AuthSession } from '@/src/lib/twogether-types';

const AUTH_SESSION_KEY = 'twogether.auth.session';

export async function readStoredAuthSession(): Promise<AuthSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function writeStoredAuthSession(session: AuthSession) {
  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredAuthSession() {
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}
