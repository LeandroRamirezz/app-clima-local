import { HISTORICAL_API_URL, HISTORICAL_DAILY_VARIABLES, HISTORICAL_MIN_DATE, HISTORICAL_TIMEOUT_MS } from '../config/historical';
import { AppError, RequestAbortedError } from '../types/errors';
import { HistoricalInputError, type HistoricalDay, type HistoricalOptions, type HistoricalParams, type HistoricalWeatherData, type OpenMeteoArchiveDaily } from '../types/historical';
import { addCalendarDays, countCalendarDaysInclusive, isCalendarDate, validateHistoricalDateRange } from '../utils/historical-dates';
import { fetchJson } from './http';

interface ValidHistoricalParams extends HistoricalParams {
  days: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateParams(params: HistoricalParams): ValidHistoricalParams {
  if (!Number.isFinite(params.latitude) || params.latitude < -90 || params.latitude > 90) {
    throw new HistoricalInputError('La latitud debe estar entre -90 y 90 grados.');
  }
  if (!Number.isFinite(params.longitude) || params.longitude < -180 || params.longitude > 180) {
    throw new HistoricalInputError('La longitud debe estar entre -180 y 180 grados.');
  }
  if (params.temperatureUnit !== 'celsius' && params.temperatureUnit !== 'fahrenheit') {
    throw new HistoricalInputError('La unidad de temperatura no es válida.');
  }
  if (params.windSpeedUnit !== 'kmh' && params.windSpeedUnit !== 'mph') {
    throw new HistoricalInputError('La unidad de velocidad del viento no es válida.');
  }
  if (params.precipitationUnit !== 'mm' && params.precipitationUnit !== 'inch') {
    throw new HistoricalInputError('La unidad de precipitación no es válida.');
  }
  const range = validateHistoricalDateRange(params.startDate, params.endDate);
  return { ...params, days: range.days };
}

function makeArchiveUrl(params: ValidHistoricalParams): URL {
  const url = new URL(HISTORICAL_API_URL);
  url.search = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    start_date: params.startDate,
    end_date: params.endDate,
    daily: HISTORICAL_DAILY_VARIABLES.join(','),
    timezone: 'auto',
    temperature_unit: params.temperatureUnit,
    wind_speed_unit: params.windSpeedUnit,
    precipitation_unit: params.precipitationUnit,
  }).toString();
  return url;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getArray(daily: Record<string, unknown>, name: string): unknown[] | null {
  const value = daily[name];
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) throw new AppError('E-05', `La variable ${name} no tiene un formato válido.`);
  return value;
}

function normalizeDay(index: number, date: string, arrays: Map<string, unknown[] | null>): HistoricalDay {
  const valueAt = (variable: string) => nullableNumber(arrays.get(variable)?.[index]);
  return {
    date,
    temperatureMax: valueAt('temperature_2m_max'),
    temperatureMin: valueAt('temperature_2m_min'),
    temperatureMean: valueAt('temperature_2m_mean'),
    precipitationSum: valueAt('precipitation_sum'),
    windSpeedMax: valueAt('wind_speed_10m_max'),
    humidity: valueAt('relative_humidity_2m_mean'),
  };
}

function validateAndReadDates(value: unknown, params: ValidHistoricalParams): string[] {
  if (!Array.isArray(value) || value.length !== params.days || value.some((date) => typeof date !== 'string' || !isCalendarDate(date))) {
    throw new AppError('E-05', 'Las fechas diarias de Archive no son válidas.');
  }
  const dates = value as string[];
  const expected: string[] = [];
  for (let offset = 0; offset < params.days; offset += 1) {
    const date = addCalendarDays(params.startDate, offset);
    if (!date) throw new AppError('E-05', 'No fue posible validar las fechas diarias de Archive.');
    expected.push(date);
  }
  if (dates.some((date, index) => date !== expected[index])) {
    throw new AppError('E-05', 'Las fechas de Archive no coinciden con el rango solicitado.');
  }
  return dates;
}

export function normalizeHistoricalWeather(payload: unknown, params: HistoricalParams): HistoricalWeatherData {
  if (!isRecord(payload) || !isRecord(payload.daily)) throw new AppError('E-05', 'La respuesta de Archive no tiene una estructura válida.');
  const validatedParams = validateParams(params);
  const daily = payload.daily as Record<string, unknown> & OpenMeteoArchiveDaily;
  const dates = validateAndReadDates(daily.time, validatedParams);
  const arrays = new Map(HISTORICAL_DAILY_VARIABLES.map((variable) => [variable, getArray(daily, variable)]));
  const days = dates.map((date, index) => normalizeDay(index, date, arrays));
  const latitude = nullableNumber(payload.latitude);
  const longitude = nullableNumber(payload.longitude);

  return {
    location: {
      latitude: latitude !== null && latitude >= -90 && latitude <= 90 ? latitude : params.latitude,
      longitude: longitude !== null && longitude >= -180 && longitude <= 180 ? longitude : params.longitude,
      timezone: typeof payload.timezone === 'string' && payload.timezone.length > 0 ? payload.timezone : null,
    },
    startDate: params.startDate,
    endDate: params.endDate,
    days,
    units: {
      temperature: params.temperatureUnit,
      windSpeed: params.windSpeedUnit,
      precipitation: params.precipitationUnit,
      humidity: '%',
    },
  };
}

export async function getHistoricalWeather(params: HistoricalParams, options: HistoricalOptions = {}): Promise<HistoricalWeatherData> {
  const validatedParams = validateParams(params);
  if (options.signal?.aborted) throw new RequestAbortedError();
  const payload = await fetchJson(makeArchiveUrl(validatedParams), { signal: options.signal, timeoutMs: HISTORICAL_TIMEOUT_MS });
  return normalizeHistoricalWeather(payload, validatedParams);
}

export function isValidArchiveDate(value: string): boolean {
  return isCalendarDate(value) && value >= HISTORICAL_MIN_DATE;
}

export function getHistoricalRangeDayCount(startDate: string, endDate: string): number | null {
  return countCalendarDaysInclusive(startDate, endDate);
}
