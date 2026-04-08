import Constants from 'expo-constants';

type SupabaseExtra = {
  supabase?: {
    url?: string;
    publishableKey?: string;
  };
};

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as SupabaseExtra;
  const url = extra.supabase?.url?.trim();
  const publishableKey = extra.supabase?.publishableKey?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return {
    url,
    publishableKey,
  };
}

export function hasSupabaseConfig() {
  return Boolean(getSupabaseConfig());
}
