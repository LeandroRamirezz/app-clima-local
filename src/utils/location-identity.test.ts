import { describe, expect, it } from 'vitest';
import type { Location } from '../types/location';
import { areSameLocation, getElevationDifference, getLocationIdentity, hasSignificantElevationDifference } from './location-identity';

const location = (id: Location['id'], latitude: number, longitude: number, elevation?: number): Location => ({
  id, name: 'Ciudad', latitude, longitude, elevation,
});

describe('identidad de ubicaciones', () => {
  it('usa el id de geocodificación estable para la identidad', () => {
    expect(getLocationIdentity(location(123, 1, 2))).toBe('geocoding:123');
  });

  it('usa coordenadas redondeadas para geolocalización', () => {
    expect(getLocationIdentity(location('geolocation', 1.12344, 2.12344))).toBe('coordinates:1.1234,2.1234');
  });

  it('reconoce el mismo id o coordenadas coincidentes entre fuentes', () => {
    expect(areSameLocation(location(123, 1, 2), location(123, 5, 6))).toBe(true);
    expect(areSameLocation(location(123, 1.23451, 2), location('geolocation', 1.23452, 2))).toBe(true);
  });
});

describe('diferencia de elevación', () => {
  it('calcula solo elevaciones válidas y requiere que la diferencia supere 300 m', () => {
    const atThreshold = [location(1, 0, 0, 100), location(2, 0, 1, 400)];
    const overThreshold = [location(1, 0, 0, 100), location(2, 0, 1, 401), location(3, 0, 2)];
    expect(getElevationDifference(atThreshold)).toBe(300);
    expect(hasSignificantElevationDifference(atThreshold)).toBe(false);
    expect(getElevationDifference(overThreshold)).toBe(301);
    expect(hasSignificantElevationDifference(overThreshold)).toBe(true);
  });

  it('no calcula si hay menos de dos elevaciones válidas', () => {
    expect(getElevationDifference([location(1, 0, 0, 400), location(2, 0, 1)])).toBeNull();
    expect(hasSignificantElevationDifference([location(1, 0, 0, 400), location(2, 0, 1)])).toBe(false);
  });
});
