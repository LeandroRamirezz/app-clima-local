import { GEOCODING_API_URL, GEOCODING_LANGUAGE, GEOCODING_RESULT_COUNT } from '../config/geocoding';
import { AppError, RequestAbortedError } from '../types/errors';
import type { Location } from '../types/location';
import { validateCityQuery } from '../utils/city-query';
import { fetchJson } from './http';
type GeocodingRecord = { id: number; name: string; latitude: number; longitude: number; admin1?: string | null; country?: string; timezone?: string; elevation?: number | null };
export interface SearchCitiesOptions { signal?: AbortSignal }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isValidLocation(value: unknown): value is GeocodingRecord {
  if (!isRecord(value)) return false;
  const { id, name, latitude, longitude } = value;
  if (!Number.isInteger(id) || typeof name !== 'string' || name.length === 0) return false;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return false;
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return false;
  if (value.admin1 !== undefined && value.admin1 !== null && typeof value.admin1 !== 'string') return false;
  if (value.country !== undefined && typeof value.country !== 'string') return false;
  if (value.timezone !== undefined && typeof value.timezone !== 'string') return false;
  if (value.elevation !== undefined && value.elevation !== null && (typeof value.elevation !== 'number' || !Number.isFinite(value.elevation))) return false;
  return true;
}
function normalizeLocation(result: GeocodingRecord): Location {
  return { id: result.id, name: result.name, ...(typeof result.admin1 === 'string' ? { admin1: result.admin1 } : {}), ...(result.country !== undefined ? { country: result.country } : {}), latitude: result.latitude, longitude: result.longitude, ...(result.timezone !== undefined ? { timezone: result.timezone } : {}), ...(typeof result.elevation === 'number' ? { elevation: result.elevation } : {}) };
}
function makeUrl(name: string): URL {
  const url = new URL(GEOCODING_API_URL);
  url.search = new URLSearchParams({ name, count: String(GEOCODING_RESULT_COUNT), language: GEOCODING_LANGUAGE, format: 'json' }).toString();
  return url;
}
export async function searchCities(query: string, options: SearchCitiesOptions = {}): Promise<Location[]> {
  const validation = validateCityQuery(query);
  if (!validation.valid) throw new AppError('E-04', validation.reason);
  if (options.signal?.aborted) throw new RequestAbortedError();
  const payload = await fetchJson(makeUrl(validation.normalized), { signal: options.signal });
  if (!isRecord(payload)) throw new AppError('E-05', 'La respuesta no es un objeto.');
  if (!Object.hasOwn(payload, 'results')) return [];
  if (payload.results === undefined || payload.results === null) throw new AppError('E-05', 'La respuesta results no es válida.');
  if (!Array.isArray(payload.results) || !payload.results.every(isValidLocation)) throw new AppError('E-05', 'La respuesta contiene resultados inválidos.');
  return payload.results.map(normalizeLocation);
}
