import type {
  LocationPermissionStatus,
  SavedPlace,
} from '@/src/lib/lovelock-types';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ExpoLocationModule = typeof import('expo-location');

let locationModulePromise: Promise<ExpoLocationModule | null> | null = null;

async function loadLocationModule() {
  if (!locationModulePromise) {
    locationModulePromise = import('expo-location').catch(() => null);
  }

  return locationModulePromise;
}

function createLocationUnavailableError() {
  return new Error(
    'Location services are unavailable in this build. Rebuild the app to enable saved-place automation.'
  );
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function mapLocationPermissionStatus(
  status: string | null | undefined
): LocationPermissionStatus {
  if (status === 'granted') {
    return 'granted';
  }

  if (status === 'denied') {
    return 'denied';
  }

  if (!status) {
    return 'unavailable';
  }

  return 'unknown';
}

export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const Location = await loadLocationModule();

  if (!Location) {
    return 'unavailable';
  }

  try {
    const permission = await Location.getForegroundPermissionsAsync();
    return mapLocationPermissionStatus(permission.status);
  } catch {
    return 'unavailable';
  }
}

export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const Location = await loadLocationModule();

  if (!Location) {
    return 'unavailable';
  }

  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    return mapLocationPermissionStatus(permission.status);
  } catch {
    return 'unavailable';
  }
}

export async function getCurrentCoordinates(): Promise<Coordinates> {
  const Location = await loadLocationModule();

  if (!Location) {
    throw createLocationUnavailableError();
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export function calculateDistanceMeters(from: Coordinates, to: Coordinates) {
  const earthRadius = 6371000;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function matchSavedPlace(
  coordinates: Coordinates,
  places: SavedPlace[]
): SavedPlace | null {
  const matches = places
    .map((place) => ({
      distanceMeters: calculateDistanceMeters(coordinates, place),
      place,
    }))
    .filter((entry) => entry.distanceMeters <= entry.place.radiusMeters)
    .sort((left, right) => left.distanceMeters - right.distanceMeters);

  return matches[0]?.place ?? null;
}
