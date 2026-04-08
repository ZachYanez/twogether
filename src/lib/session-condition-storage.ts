import * as SecureStore from 'expo-secure-store';

import type { SavedSessionCondition } from '@/src/lib/twogether-types';

const SAVED_SESSION_CONDITIONS_KEY = 'twogether.saved-session-conditions';

export async function readSavedSessionConditions(): Promise<SavedSessionCondition[]> {
  try {
    const raw = await SecureStore.getItemAsync(SAVED_SESSION_CONDITIONS_KEY);

    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as SavedSessionCondition[];
  } catch {
    return [];
  }
}

export async function writeSavedSessionConditions(conditions: SavedSessionCondition[]) {
  await SecureStore.setItemAsync(SAVED_SESSION_CONDITIONS_KEY, JSON.stringify(conditions));
}
