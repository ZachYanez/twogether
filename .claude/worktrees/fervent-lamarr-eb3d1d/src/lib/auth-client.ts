import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import {
  type PasswordRegistrationResponse,
  deleteAccount as deleteAccountRequest,
  registerWithPassword,
  exchangeAppleSession,
  exchangeGoogleSession,
  loginWithPassword,
  logoutSession,
  requestPasswordReset,
  updateAccountProfile as updateAccountProfileRequest,
} from '@/src/lib/auth-api';
import { consumeSupabaseAuthCallbackUrl } from '@/src/lib/supabase-client';
import type { AuthSession } from '@/src/lib/twogether-types';

type EmailPasswordCredentials = {
  email: string;
  password: string;
  displayName?: string;
};

type AuthConfig = {
  googleIosClientId?: string;
  googleWebClientId?: string;
  googleIosUrlScheme?: string;
};

function getAuthConfig(): AuthConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    auth?: AuthConfig;
  };

  return extra.auth ?? {};
}

function createDisplayNameFromEmail(email: string) {
  const local = email.split('@')[0] ?? 'Twogether';
  return local
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeEmailPassword(credentials: EmailPasswordCredentials) {
  const email = credentials.email.trim().toLowerCase();
  const password = credentials.password.trim();

  if (!email.includes('@')) {
    throw new Error('Enter a valid email address.');
  }

  if (password.length < 8) {
    throw new Error('Use at least 8 characters for the password flow.');
  }

  return {
    email,
    password,
    displayName: credentials.displayName?.trim() || createDisplayNameFromEmail(email),
  };
}

export type EmailPasswordRegistrationResult = PasswordRegistrationResponse;

export async function registerWithEmailPassword(
  credentials: EmailPasswordCredentials
): Promise<EmailPasswordRegistrationResult> {
  const normalized = normalizeEmailPassword(credentials);
  return registerWithPassword(normalized);
}

export async function signInWithPassword(
  credentials: EmailPasswordCredentials
): Promise<AuthSession> {
  const normalized = normalizeEmailPassword(credentials);
  const response = await loginWithPassword(normalized);
  return response.session;
}

export async function signInWithApple(): Promise<AuthSession> {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only available on iOS.');
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Sign in with Apple is not available on this device.');
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const email =
    credential.email ?? `${credential.user.slice(0, 8)}@privaterelay.appleid.com`;

  const response = await exchangeAppleSession({
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    user: credential.user,
    email,
    givenName: credential.fullName?.givenName,
    familyName: credential.fullName?.familyName,
  });

  return response.session;
}

export async function signInWithGoogle(): Promise<AuthSession> {
  const config = getAuthConfig();

  if (!config.googleIosClientId) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Add it before using native Google sign-in.'
    );
  }

  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

  GoogleSignin.configure({
    iosClientId: config.googleIosClientId,
    webClientId: config.googleWebClientId,
    profileImageSize: 128,
  });

  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') {
    throw new Error('Google sign-in was cancelled.');
  }

  const exchange = await exchangeGoogleSession({
    idToken: response.data.idToken,
    serverAuthCode: response.data.serverAuthCode,
    email: response.data.user.email,
    name: response.data.user.name,
    givenName: response.data.user.givenName,
    familyName: response.data.user.familyName,
    photo: response.data.user.photo,
    providerSubject: response.data.user.id,
  });

  return exchange.session;
}

export async function sendPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes('@')) {
    throw new Error('Enter a valid email address.');
  }

  return requestPasswordReset({
    email: normalizedEmail,
  });
}

export async function consumeSupabaseAuthCallback(url: string) {
  return consumeSupabaseAuthCallbackUrl(url);
}

export async function signOutProviderSession(session: AuthSession | null) {
  await logoutSession(session);

  if (!session || session.provider !== 'google') {
    return;
  }

  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Best-effort sign-out for native provider state.
  }
}

export async function updateAccountProfile(
  session: AuthSession,
  payload: {
    displayName: string;
  }
) {
  return updateAccountProfileRequest(session, payload);
}

export async function deleteAccount(session: AuthSession) {
  return deleteAccountRequest(session);
}
