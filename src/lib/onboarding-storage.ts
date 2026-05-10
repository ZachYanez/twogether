import * as SecureStore from 'expo-secure-store';

const ONBOARDING_PREFS_KEY = 'lovelock.onboarding.preferences';

export type StoredOnboardingPreferences = {
  pairingPromptAnswered?: boolean;
};

export async function readStoredOnboardingPreferences(): Promise<StoredOnboardingPreferences> {
  try {
    const raw = await SecureStore.getItemAsync(ONBOARDING_PREFS_KEY);
    return raw ? (JSON.parse(raw) as StoredOnboardingPreferences) : {};
  } catch {
    return {};
  }
}

export async function writeStoredOnboardingPreferences(
  preferences: StoredOnboardingPreferences
) {
  await SecureStore.setItemAsync(ONBOARDING_PREFS_KEY, JSON.stringify(preferences));
}
