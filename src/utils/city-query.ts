import { CITY_QUERY_MAX_LENGTH, CITY_QUERY_MIN_LENGTH } from '../config/geocoding';
export type CityQueryValidation =
  | { valid: true; normalized: string }
  | { valid: false; reason: 'too-short' | 'too-long' | 'invalid-type' };
export function validateCityQuery(query: unknown): CityQueryValidation {
  if (typeof query !== 'string') return { valid: false, reason: 'invalid-type' };
  const normalized = query.trim();
  if ([...normalized].length < CITY_QUERY_MIN_LENGTH) return { valid: false, reason: 'too-short' };
  if ([...normalized].length > CITY_QUERY_MAX_LENGTH) return { valid: false, reason: 'too-long' };
  return { valid: true, normalized };
}
