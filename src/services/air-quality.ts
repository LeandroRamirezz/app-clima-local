import {
  AIR_QUALITY_API_URL,
  AIR_QUALITY_CURRENT_VARIABLES,
  AIR_QUALITY_FORECAST_HOURS,
  AIR_QUALITY_HOURLY_VARIABLES,
  AIR_QUALITY_TIMEOUT_MS,
  AIR_QUALITY_VARIABLES,
} from '../config/air-quality';
import { AppError, RequestAbortedError } from '../types/errors';
import type {
  AirQualityData,
  AirQualityCurrent,
  AirQualityMetrics,
  AirQualityParams,
  AirQualityOptions,
  AirQualityUnits,
  OpenMeteoAirQualityResponse,
} from '../types/air-quality';
import { fetchJson } from './http';

const API_KEYS = Object.keys(AIR_QUALITY_VARIABLES) as Array<keyof typeof AIR_QUALITY_VARIABLES>;
const FALLBACK_UNITS: Record<keyof typeof AIR_QUALITY_VARIABLES, string> = {
  usAqi: 'US AQI',
  pm25: 'μg/m³',
  pm10: 'μg/m³',
  ozone: 'μg/m³',
  nitrogenDioxide: 'μg/m³',
  sulphurDioxide: 'μg/m³',
  carbonMonoxide: 'μg/m³',
};

export class AirQualityInputError extends Error {
  constructor(readonly field: 'latitude' | 'longitude') {
    super(field === 'latitude' ? 'La latitud debe estar entre -90 y 90.' : 'La longitud debe estar entre -180 y 180.');
    this.name = 'AirQualityInputError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLocalDateTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysByMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12
    && day >= 1 && day <= (daysByMonth[month - 1] ?? 0)
    && hour >= 0 && hour <= 23
    && minute >= 0 && minute <= 59;
}

function validateParams(params: AirQualityParams): void {
  if (!Number.isFinite(params.latitude) || params.latitude < -90 || params.latitude > 90) {
    throw new AirQualityInputError('latitude');
  }
  if (!Number.isFinite(params.longitude) || params.longitude < -180 || params.longitude > 180) {
    throw new AirQualityInputError('longitude');
  }
}

function makeAirQualityUrl(params: AirQualityParams): URL {
  const url = new URL(AIR_QUALITY_API_URL);
  url.search = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    current: AIR_QUALITY_CURRENT_VARIABLES.join(','),
    hourly: AIR_QUALITY_HOURLY_VARIABLES.join(','),
    forecast_hours: String(AIR_QUALITY_FORECAST_HOURS),
    timezone: 'auto',
  }).toString();
  return url;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getUsAqiValidity(value: unknown): AirQualityCurrent['usAqiValidity'] {
  if (value === null || value === undefined) return 'missing';
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? 'valid' : 'invalid';
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function validateArrayVariables(block: Record<string, unknown>): void {
  for (const apiKey of Object.values(AIR_QUALITY_VARIABLES)) {
    const value = block[apiKey];
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      throw new AppError('E-05', `La variable ${apiKey} no tiene un formato válido.`);
    }
  }
}

function validatePayload(payload: unknown): asserts payload is OpenMeteoAirQualityResponse & {
  current: Record<string, unknown>;
  hourly: Record<string, unknown> & { time: unknown[] };
} {
  if (!isRecord(payload)) throw new AppError('E-05', 'La respuesta de calidad del aire no es un objeto.');
  if (!isRecord(payload.current) || !isLocalDateTime(payload.current.time)) {
    throw new AppError('E-05', 'El bloque current de calidad del aire no es válido.');
  }
  if (!isRecord(payload.hourly) || !Array.isArray(payload.hourly.time) || !payload.hourly.time.every(isLocalDateTime)) {
    throw new AppError('E-05', 'El bloque hourly de calidad del aire no es válido.');
  }
  validateArrayVariables(payload.hourly);

  const currentUnits = payload.current_units;
  const hourlyUnits = payload.hourly_units;
  if (currentUnits !== undefined && currentUnits !== null && !isRecord(currentUnits)) {
    throw new AppError('E-05', 'Las unidades current de calidad del aire no son válidas.');
  }
  if (hourlyUnits !== undefined && hourlyUnits !== null && !isRecord(hourlyUnits)) {
    throw new AppError('E-05', 'Las unidades hourly de calidad del aire no son válidas.');
  }
}

function normalizeMetrics(block: Record<string, unknown>, index?: number): AirQualityMetrics {
  const metrics = {} as AirQualityMetrics;
  for (const key of API_KEYS) {
    const raw = block[AIR_QUALITY_VARIABLES[key]];
    const value = index === undefined
      ? nullableNumber(raw)
      : nullableNumber(Array.isArray(raw) ? raw[index] : null);
    metrics[key] = key === 'usAqi' && value !== null && value < 0 ? null : value;
  }
  return metrics;
}

function normalizeUnits(value: unknown): AirQualityUnits {
  const source = isRecord(value) ? value : {};
  const units = {} as AirQualityUnits;
  for (const key of API_KEYS) {
    units[key] = nullableString(source[AIR_QUALITY_VARIABLES[key]]) ?? FALLBACK_UNITS[key];
  }
  return units;
}

export function normalizeAirQuality(
  payload: unknown,
  requested: Pick<AirQualityParams, 'latitude' | 'longitude'>,
): AirQualityData {
  validatePayload(payload);
  const current = payload.current;
  const hourly = payload.hourly;
  const normalizedHourly = hourly.time.map((time, index) => ({
    time: time as string,
    ...normalizeMetrics(hourly, index),
  }));
  const latitude = nullableNumber(payload.latitude);
  const longitude = nullableNumber(payload.longitude);

  return {
    location: {
      latitude: latitude !== null && latitude >= -90 && latitude <= 90 ? latitude : requested.latitude,
      longitude: longitude !== null && longitude >= -180 && longitude <= 180 ? longitude : requested.longitude,
      timezone: nullableString(payload.timezone),
    },
    current: {
      time: current.time as string,
      ...normalizeMetrics(current),
      usAqiValidity: getUsAqiValidity(current[AIR_QUALITY_VARIABLES.usAqi]),
    },
    hourly: normalizedHourly,
    units: {
      current: normalizeUnits(payload.current_units),
      hourly: normalizeUnits(payload.hourly_units),
    },
  };
}

export async function getAirQuality(params: AirQualityParams, options: AirQualityOptions = {}): Promise<AirQualityData> {
  validateParams(params);
  if (options.signal?.aborted) throw new RequestAbortedError();
  const payload = await fetchJson(makeAirQualityUrl(params), {
    signal: options.signal,
    timeoutMs: AIR_QUALITY_TIMEOUT_MS,
  });
  return normalizeAirQuality(payload, params);
}
