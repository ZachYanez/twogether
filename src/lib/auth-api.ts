import { getApiBaseUrl } from '@/src/lib/api-config';
import {
  getSupabaseEmailRedirectUrl,
  getTwogetherSupabaseClient,
  hasSupabaseClientConfig,
  mapSupabaseSession,
} from '@/src/lib/supabase-client';
import type { AuthProvider, AuthSession } from '@/src/lib/twogether-types';

type PasswordAuthPayload = {
  email: string;
  password: string;
  displayName?: string;
};

type AppleExchangePayload = {
  identityToken: string | null;
  authorizationCode: string | null;
  user: string;
  email?: string | null;
  givenName?: string | null;
  familyName?: string | null;
};

type GoogleExchangePayload = {
  idToken: string | null;
  serverAuthCode: string | null;
  email: string;
  name?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  photo?: string | null;
  providerSubject: string;
};

type PasswordResetPayload = {
  email: string;
};

type AuthSessionResponse = {
  session: AuthSession;
};

export type PasswordRegistrationResponse =
  | {
      status: 'authenticated';
      session: AuthSession;
    }
  | {
      status: 'pending_email_confirmation';
      email: string;
    };

type PasswordResetResponse = {
  accepted: boolean;
  message: string;
};

type AccountProfilePayload = {
  displayName: string;
};

type AccountProfileResponse = {
  session: AuthSession;
};

type DeleteAccountResponse = {
  ok: boolean;
};

function assertSupabaseError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function createOpaqueToken(prefix: AuthProvider) {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function createUserId(prefix: AuthProvider, unique: string) {
  return `${prefix}_${unique.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
}

function createDisplayNameFromEmail(email: string) {
  const local = email.split('@')[0] ?? 'Twogether';
  return local
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function createLocalSession(params: {
  provider: AuthProvider;
  email: string;
  displayName: string;
  providerSubject?: string;
}): AuthSession {
  return {
    userId: createUserId(params.provider, params.providerSubject ?? params.email),
    provider: params.provider,
    email: params.email,
    displayName: params.displayName,
    accessToken: createOpaqueToken(params.provider),
    refreshToken: createOpaqueToken('password'),
    tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    createdAt: new Date().toISOString(),
    providerSubject: params.providerSubject,
  };
}

async function requestJson<TResponse>(params: {
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  session?: AuthSession | null;
}): Promise<TResponse> {
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new Error('No API base URL configured.');
  }

  const headers: Record<string, string> = {};

  if (params.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  if (params.session?.accessToken) {
    headers.authorization = `Bearer ${params.session.accessToken}`;
  }

  const response = await fetch(new URL(params.path, baseUrl).toString(), {
    method: params.method ?? 'POST',
    headers,
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as TResponse | { message?: string }) : undefined;

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload && payload.message
        ? payload.message
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as TResponse;
}

async function postJson<TResponse>(path: string, body: unknown, session?: AuthSession | null) {
  return requestJson<TResponse>({
    path,
    method: 'POST',
    body,
    session,
  });
}

function hasBackend() {
  return Boolean(getApiBaseUrl());
}

async function registerWithSupabase(
  payload: PasswordAuthPayload
): Promise<PasswordRegistrationResponse> {
  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        display_name: payload.displayName || createDisplayNameFromEmail(payload.email),
      },
      emailRedirectTo: getSupabaseEmailRedirectUrl(),
    },
  });

  assertSupabaseError(error);

  if (!data.session) {
    return {
      status: 'pending_email_confirmation',
      email: payload.email,
    };
  }

  return {
    status: 'authenticated',
    session: mapSupabaseSession(data.session),
  };
}

async function loginWithSupabase(payload: PasswordAuthPayload): Promise<AuthSessionResponse> {
  const supabase = getTwogetherSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  assertSupabaseError(error);

  if (!data.session) {
    throw new Error('Unable to start a Supabase session.');
  }

  return {
    session: mapSupabaseSession(data.session),
  };
}

export async function registerWithPassword(
  payload: PasswordAuthPayload
): Promise<PasswordRegistrationResponse> {
  if (hasSupabaseClientConfig()) {
    return registerWithSupabase(payload);
  }

  if (hasBackend()) {
    return postJson<AuthSessionResponse>('/auth/register', payload);
  }

  return {
    status: 'authenticated',
    session: createLocalSession({
      provider: 'password',
      email: payload.email,
      displayName: payload.displayName || createDisplayNameFromEmail(payload.email),
    }),
  };
}

export async function loginWithPassword(
  payload: PasswordAuthPayload
): Promise<AuthSessionResponse> {
  if (hasSupabaseClientConfig()) {
    return loginWithSupabase(payload);
  }

  if (hasBackend()) {
    return postJson<AuthSessionResponse>('/auth/login', payload);
  }

  return {
    session: createLocalSession({
      provider: 'password',
      email: payload.email,
      displayName: payload.displayName || createDisplayNameFromEmail(payload.email),
    }),
  };
}

export async function exchangeAppleSession(
  payload: AppleExchangePayload
): Promise<AuthSessionResponse> {
  if (hasSupabaseClientConfig()) {
    throw new Error('Sign in with Apple is not wired to Supabase yet. Use email/password for now.');
  }

  if (hasBackend()) {
    return postJson<AuthSessionResponse>('/auth/apple', payload);
  }

  const displayName = [payload.givenName, payload.familyName].filter(Boolean).join(' ').trim();
  const fallbackEmail = payload.email ?? `${payload.user.slice(0, 8)}@privaterelay.appleid.com`;

  return {
    session: createLocalSession({
      provider: 'apple',
      email: fallbackEmail,
      displayName: displayName || 'Apple User',
      providerSubject: payload.user,
    }),
  };
}

export async function exchangeGoogleSession(
  payload: GoogleExchangePayload
): Promise<AuthSessionResponse> {
  if (hasSupabaseClientConfig()) {
    throw new Error('Google sign-in is not wired to Supabase yet. Use email/password for now.');
  }

  if (hasBackend()) {
    return postJson<AuthSessionResponse>('/auth/google', payload);
  }

  return {
    session: createLocalSession({
      provider: 'google',
      email: payload.email,
      displayName: payload.name || createDisplayNameFromEmail(payload.email),
      providerSubject: payload.providerSubject,
    }),
  };
}

export async function logoutSession(session: AuthSession | null) {
  if (!session) {
    return;
  }

  if (hasSupabaseClientConfig()) {
    const supabase = getTwogetherSupabaseClient();
    const { error } = await supabase.auth.signOut();
    assertSupabaseError(error);
    return;
  }

  if (!hasBackend()) {
    return;
  }

  await postJson<{ ok: boolean }>(
    '/auth/logout',
    {
      refreshToken: session.refreshToken,
    },
    session
  );
}

export async function requestPasswordReset(
  payload: PasswordResetPayload
): Promise<PasswordResetResponse> {
  if (hasSupabaseClientConfig()) {
    const supabase = getTwogetherSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(payload.email);
    assertSupabaseError(error);

    return {
      accepted: true,
      message: `Password reset email queued for ${payload.email}.`,
    };
  }

  if (hasBackend()) {
    return postJson<PasswordResetResponse>('/auth/password/forgot', payload);
  }

  return {
    accepted: true,
    message: `Password reset link queued for ${payload.email}.`,
  };
}

export async function updateAccountProfile(
  session: AuthSession,
  payload: AccountProfilePayload
): Promise<AccountProfileResponse> {
  if (hasSupabaseClientConfig()) {
    const supabase = getTwogetherSupabaseClient();
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: payload.displayName,
      },
    });
    assertSupabaseError(authError);

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: session.userId,
        display_name: payload.displayName,
        timezone: 'America/Chicago',
      },
      {
        onConflict: 'id',
      }
    );
    assertSupabaseError(profileError);

    const { data, error: sessionError } = await supabase.auth.getSession();
    assertSupabaseError(sessionError);

    if (!data.session) {
      throw new Error('Unable to read the updated Supabase session.');
    }

    return {
      session: {
        ...mapSupabaseSession(data.session),
        displayName: payload.displayName,
      },
    };
  }

  if (hasBackend()) {
    return requestJson<AccountProfileResponse>({
      path: '/account/profile',
      method: 'PATCH',
      body: payload,
      session,
    });
  }

  return {
    session: {
      ...session,
      displayName: payload.displayName,
    },
  };
}

export async function deleteAccount(
  session: AuthSession
): Promise<DeleteAccountResponse> {
  if (hasSupabaseClientConfig()) {
    void session;
    throw new Error(
      'Delete account is not wired for Supabase-backed accounts yet.'
    );
  }

  if (hasBackend()) {
    return requestJson<DeleteAccountResponse>({
      path: '/account',
      method: 'DELETE',
      session,
    });
  }

  return {
    ok: true,
  };
}
