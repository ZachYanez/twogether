import Constants from 'expo-constants';

type PublicExtra = {
  api?: {
    baseUrl?: string;
  };
};

export function getApiBaseUrl() {
  const extra = (Constants.expoConfig?.extra ?? {}) as PublicExtra;
  return extra.api?.baseUrl?.trim() || '';
}

export function hasConfiguredApiBaseUrl() {
  return Boolean(getApiBaseUrl());
}
