import * as SecureStore from 'expo-secure-store';

import type {
  LocationAutomationMode,
  LocationPermissionStatus,
  SavedPlace,
} from '@/src/lib/twogether-types';

const LOCATION_AUTOMATION_STATE_KEY = 'twogether.location-automation.state';

type StoredLocationAutomationState = {
  savedPlaces: SavedPlace[];
  enabled: boolean;
  mode: LocationAutomationMode;
  permissionStatus: LocationPermissionStatus;
  currentPlaceId: string | null;
};

const defaultState: StoredLocationAutomationState = {
  savedPlaces: [],
  enabled: false,
  mode: 'suggest',
  permissionStatus: 'unknown',
  currentPlaceId: null,
};

export async function readStoredLocationAutomationState(): Promise<StoredLocationAutomationState> {
  try {
    const raw = await SecureStore.getItemAsync(LOCATION_AUTOMATION_STATE_KEY);
    if (!raw) {
      return defaultState;
    }

    return {
      ...defaultState,
      ...(JSON.parse(raw) as Partial<StoredLocationAutomationState>),
    };
  } catch {
    return defaultState;
  }
}

export async function writeStoredLocationAutomationState(
  state: Partial<StoredLocationAutomationState>
) {
  const current = await readStoredLocationAutomationState();
  await SecureStore.setItemAsync(
    LOCATION_AUTOMATION_STATE_KEY,
    JSON.stringify({
      ...current,
      ...state,
    })
  );
}
