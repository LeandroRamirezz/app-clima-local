import type { Location } from '../types/location';

function roundedCoordinate(value: number): string {
  return value.toFixed(4);
}

export function getLocationIdentity(location: Location): string {
  return location.id === 'geolocation'
    ? `coordinates:${roundedCoordinate(location.latitude)},${roundedCoordinate(location.longitude)}`
    : `geocoding:${location.id}`;
}

export function areSameLocation(first: Location, second: Location): boolean {
  if (first.id !== 'geolocation' && second.id !== 'geolocation' && first.id === second.id) return true;
  return roundedCoordinate(first.latitude) === roundedCoordinate(second.latitude)
    && roundedCoordinate(first.longitude) === roundedCoordinate(second.longitude);
}

export function getElevationDifference(locations: readonly Location[]): number | null {
  const elevations = locations
    .map((location) => location.elevation)
    .filter((elevation): elevation is number => typeof elevation === 'number' && Number.isFinite(elevation));
  if (elevations.length < 2) return null;
  return Math.max(...elevations) - Math.min(...elevations);
}

export function hasSignificantElevationDifference(locations: readonly Location[]): boolean {
  const difference = getElevationDifference(locations);
  return difference !== null && difference > 300;
}
