import * as Location from 'expo-location';

import type {
  LocationPermissionStatus,
  SavedPlace,
} from '@/src/lib/twogether-types';

type Coordinates = {
  latitude: number;
  longitude: number;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function mapLocationPermissionStatus(
  status: Location.PermissionStatus
): LocationPermissionStatus {
  if (status === Location.PermissionStatus.GRANTED) {
    return 'granted';
  }

  if (status === Location.PermissionStatus.DENIED) {
    return 'denied';
  }

  return 'unknown';
}

export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const permission = await Location.getForegroundPermissionsAsync();
  return mapLocationPermissionStatus(permission.status);
}

export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  const permission = await Location.requestForegroundPermissionsAsync();
  return mapLocationPermissionStatus(permission.status);
}

export async function getCurrentCoordinates(): Promise<Coordinates> {
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
