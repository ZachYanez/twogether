import type { EmailOtpType, Session, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

import { getSupabaseConfig } from '@/src/lib/supabase-config';
import type { AuthProvider, AuthSession } from '@/src/lib/twogether-types';

const SUPABASE_STORAGE_PREFIX = 'twogether.supabase.auth';
const SUPABASE_EMAIL_REDIRECT_URL = 'twogether://auth';

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(`${SUPABASE_STORAGE_PREFIX}.${key}`),
  removeItem: (key: string) => SecureStore.deleteItemAsync(`${SUPABASE_STORAGE_PREFIX}.${key}`),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(`${SUPABASE_STORAGE_PREFIX}.${key}`, value),
};

let client: SupabaseClient | null = null;

type SupabaseCallbackPayload =
  | {
      type: 'session';
      accessToken: string;
      refreshToken: string;
    }
  | {
      type: 'otp';
      otpType: EmailOtpType;
      tokenHash: string;
    };

function mapAuthProvider(provider: string | undefined): AuthProvider {
  if (provider === 'apple') {
    return 'apple';
  }

  if (provider === 'google') {
    return 'google';
  }

  return 'password';
}

export function hasSupabaseClientConfig() {
  return Boolean(getSupabaseConfig());
}

export function getSupabaseEmailRedirectUrl() {
  return SUPABASE_EMAIL_REDIRECT_URL;
}

export function getTwogetherSupabaseClient() {
  if (client) {
    return client;
  }

  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Missing Supabase configuration.');
  }

  client = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: secureStoreAdapter,
    },
  });

  return client;
}

function parseCallbackParams(url: string) {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const hash = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash;

  if (hash) {
    const hashParams = new URLSearchParams(hash);
    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
  }

  return params;
}

function parseOtpType(value: string | null): EmailOtpType | null {
  switch (value) {
    case 'signup':
    case 'invite':
    case 'magiclink':
    case 'recovery':
    case 'email_change':
    case 'email':
      return value;
    default:
      return null;
  }
}

function parseSupabaseCallbackPayload(url: string): SupabaseCallbackPayload | null {
  const params = parseCallbackParams(url);
  const errorMessage = params.get('error_description') ?? params.get('error');

  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    return {
      type: 'session',
      accessToken,
      refreshToken,
    };
  }

  const tokenHash = params.get('token_hash');
  const otpType = parseOtpType(params.get('type'));

  if (tokenHash && otpType) {
    return {
      type: 'otp',
      otpType,
      tokenHash,
    };
  }

  return null;
}

export function mapSupabaseSession(session: Session): AuthSession {
  const provider = mapAuthProvider(session.user.app_metadata.provider);
  const displayName =
    typeof session.user.user_metadata.display_name === 'string' &&
    session.user.user_metadata.display_name.trim()
      ? session.user.user_metadata.display_name.trim()
      : typeof session.user.email === 'string' && session.user.email.includes('@')
        ? (session.user.email.split('@')[0] ?? 'Twogether')
        : 'Twogether';

  return {
    userId: session.user.id,
    provider,
    email: session.user.email ?? '',
    displayName,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    tokenExpiresAt: session.expires_at
      ? new Date(session.expires_at * 1000).toISOString()
      : undefined,
    createdAt: new Date().toISOString(),
    providerSubject: session.user.id,
  };
}

export async function getSupabaseAuthSession(): Promise<AuthSession | null> {
  if (!hasSupabaseClientConfig()) {
    return null;
  }

  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    return null;
  }

  return mapSupabaseSession(data.session);
}

export async function consumeSupabaseAuthCallbackUrl(url: string): Promise<AuthSession | null> {
  if (!hasSupabaseClientConfig()) {
    return null;
  }

  const payload = parseSupabaseCallbackPayload(url);
  if (!payload) {
    return null;
  }

  const supabase = getTwogetherSupabaseClient();

  if (payload.type === 'session') {
    const { data, error } = await supabase.auth.setSession({
      access_token: payload.accessToken,
      refresh_token: payload.refreshToken,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.session ? mapSupabaseSession(data.session) : null;
  }

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: payload.tokenHash,
    type: payload.otpType,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.session ? mapSupabaseSession(data.session) : null;
}
