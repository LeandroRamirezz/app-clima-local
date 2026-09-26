import {
  DEFAULT_FORECAST_DAYS,
  DEFAULT_FORECAST_MODEL,
  DEFAULT_PRECIPITATION_UNIT,
  DEFAULT_TEMPERATURE_UNIT,
  DEFAULT_WIND_SPEED_UNIT,
  FORECAST_API_URL,
  FORECAST_CURRENT_VARIABLES,
  FORECAST_DAILY_VARIABLES,
  FORECAST_HOURLY_VARIABLES,
} from '../config/forecast';
import { AppError, RequestAbortedError } from '../types/errors';
import { ForecastInputError } from '../types/forecast-errors';
import type {
  CurrentForecast,
  DailyForecast,
  ForecastData,
  ForecastModel,
  ForecastOptions,
  ForecastParams,
  ForecastUnits,
  HourlyForecast,
  OpenMeteoForecastCurrent,
  OpenMeteoForecastDaily,
  OpenMeteoForecastHourly,
  OpenMeteoForecastResponse,
  PrecipitationUnit,
  TemperatureUnit,
  WindSpeedUnit,
} from '../types/forecast';
import { fetchJson } from './http';

interface NormalizedForecastParams {
  latitude: number;
  longitude: number;
  forecastDays: number;
  temperatureUnit: TemperatureUnit;
  windSpeedUnit: WindSpeedUnit;
  precipitationUnit: PrecipitationUnit;
  model: ForecastModel;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateParams(params: ForecastParams): NormalizedForecastParams {
  if (!Number.isFinite(params.latitude) || params.latitude < -90 || params.latitude > 90) {
    throw new ForecastInputError('invalid-latitude');
  }
  if (!Number.isFinite(params.longitude) || params.longitude < -180 || params.longitude > 180) {
    throw new ForecastInputError('invalid-longitude');
  }

  const forecastDays = params.forecastDays ?? DEFAULT_FORECAST_DAYS;
  if (!Number.isInteger(forecastDays) || forecastDays < 1 || forecastDays > 16) {
    throw new ForecastInputError('invalid-forecast-days');
  }

  const temperatureUnit = params.temperatureUnit ?? DEFAULT_TEMPERATURE_UNIT;
  if (temperatureUnit !== 'celsius' && temperatureUnit !== 'fahrenheit') {
    throw new ForecastInputError('invalid-temperature-unit');
  }

  const windSpeedUnit = params.windSpeedUnit ?? DEFAULT_WIND_SPEED_UNIT;
  if (windSpeedUnit !== 'kmh' && windSpeedUnit !== 'mph') {
    throw new ForecastInputError('invalid-wind-speed-unit');
  }

  const precipitationUnit = params.precipitationUnit ?? DEFAULT_PRECIPITATION_UNIT;
  if (precipitationUnit !== 'mm' && precipitationUnit !== 'inch') {
    throw new ForecastInputError('invalid-precipitation-unit');
  }

  const model = params.model ?? DEFAULT_FORECAST_MODEL;
  if (model !== 'best_match' && model !== 'icon_seamless' && model !== 'ncep_gfs_seamless' && model !== 'ecmwf_ifs025') {
    throw new ForecastInputError('invalid-model');
  }

  return { latitude: params.latitude, longitude: params.longitude, forecastDays, temperatureUnit, windSpeedUnit, precipitationUnit, model };
}

function makeForecastUrl(params: NormalizedForecastParams): URL {
  const url = new URL(FORECAST_API_URL);
  const search = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    current: FORECAST_CURRENT_VARIABLES.join(','),
    hourly: FORECAST_HOURLY_VARIABLES.join(','),
    daily: FORECAST_DAILY_VARIABLES.join(','),
    timezone: 'auto',
    forecast_days: String(params.forecastDays),
    temperature_unit: params.temperatureUnit,
    wind_speed_unit: params.windSpeedUnit,
    precipitation_unit: params.precipitationUnit,
    models: params.model,
  });
  url.search = search.toString();
  return url;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getModelVariable(block: Record<string, unknown>, variableName: string, model: ForecastModel): unknown {
  const direct = block[variableName];
  if (direct !== undefined) return direct;
  if (model !== 'best_match') return block[`${variableName}_${model}`];
  return undefined;
}

function validateDataArray(block: Record<string, unknown>, variableNames: readonly string[], model: ForecastModel): void {
  for (const name of variableNames) {
    const value = getModelVariable(block, name, model);
    if (value !== undefined && value !== null && !Array.isArray(value)) {
      throw new AppError('E-05', `La variable ${name} no tiene un formato válido.`);
    }
  }
}

function validateForecastPayload(payload: unknown, model: ForecastModel): asserts payload is OpenMeteoForecastResponse & {
  current: OpenMeteoForecastCurrent;
  hourly: OpenMeteoForecastHourly;
  daily: OpenMeteoForecastDaily;
} {
  if (!isRecord(payload)) throw new AppError('E-05', 'La respuesta no es un objeto.');

  const current = payload.current;
  const hourly = payload.hourly;
  const daily = payload.daily;
  if (!isRecord(current) || typeof current.time !== 'string' || current.time.length === 0) {
    throw new AppError('E-05', 'El bloque current no es válido.');
  }
  if (!isRecord(hourly) || !Array.isArray(hourly.time)) {
    throw new AppError('E-05', 'El bloque hourly no es válido.');
  }
  if (!isRecord(daily) || !Array.isArray(daily.time)) {
    throw new AppError('E-05', 'El bloque daily no es válido.');
  }

  validateDataArray(hourly, FORECAST_HOURLY_VARIABLES, model);
  validateDataArray(daily, FORECAST_DAILY_VARIABLES, model);
}

function localHourKey(time: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2})/.exec(time);
  return match?.[1] ?? null;
}

/** Uses an exact local-time match, then falls back to the same local hour. */
export function findCurrentUvIndex(currentTime: string, hourlyTimes: readonly unknown[], uvValues: readonly unknown[]): number | null {
  const exactIndex = hourlyTimes.findIndex((time) => time === currentTime);
  let index = exactIndex;
  if (index < 0) {
    const currentHour = localHourKey(currentTime);
    if (currentHour === null) return null;
    index = hourlyTimes.findIndex((time) => typeof time === 'string' && localHourKey(time) === currentHour);
  }
  return index < 0 ? null : nullableNumber(uvValues[index]);
}

function normalizeCurrent(current: Record<string, unknown>, hourly: Record<string, unknown>, model: ForecastModel): CurrentForecast {
  const currentTime = current.time as string;
  const hourlyTimes = hourly.time as unknown[];
  const uvVariable = getModelVariable(hourly, 'uv_index', model);
  const uvValues = Array.isArray(uvVariable) ? uvVariable : [];
  return {
    time: currentTime,
    temperature: nullableNumber(getModelVariable(current, 'temperature_2m', model)),
    apparentTemperature: nullableNumber(getModelVariable(current, 'apparent_temperature', model)),
    relativeHumidity: nullableNumber(getModelVariable(current, 'relative_humidity_2m', model)),
    precipitation: nullableNumber(getModelVariable(current, 'precipitation', model)),
    weatherCode: nullableNumber(getModelVariable(current, 'weather_code', model)),
    windSpeed: nullableNumber(getModelVariable(current, 'wind_speed_10m', model)),
    windDirection: nullableNumber(getModelVariable(current, 'wind_direction_10m', model)),
    uvIndex: findCurrentUvIndex(currentTime, hourlyTimes, uvValues),
  };
}

function normalizeHourly(hourly: Record<string, unknown>, model: ForecastModel): HourlyForecast[] {
  const times = hourly.time as unknown[];
  const values = Object.fromEntries(FORECAST_HOURLY_VARIABLES.map((name) => [name, getModelVariable(hourly, name, model)]));
  return times.flatMap((time, index): HourlyForecast[] => {
    if (typeof time !== 'string' || time.length === 0) return [];
    return [{
      time,
      temperature: nullableNumber(Array.isArray(values.temperature_2m) ? values.temperature_2m[index] : null),
      apparentTemperature: nullableNumber(Array.isArray(values.apparent_temperature) ? values.apparent_temperature[index] : null),
      precipitationProbability: nullableNumber(Array.isArray(values.precipitation_probability) ? values.precipitation_probability[index] : null),
      precipitation: nullableNumber(Array.isArray(values.precipitation) ? values.precipitation[index] : null),
      windSpeed: nullableNumber(Array.isArray(values.wind_speed_10m) ? values.wind_speed_10m[index] : null),
      uvIndex: nullableNumber(Array.isArray(values.uv_index) ? values.uv_index[index] : null),
      weatherCode: nullableNumber(Array.isArray(values.weather_code) ? values.weather_code[index] : null),
    }];
  });
}

function normalizeDaily(daily: Record<string, unknown>, model: ForecastModel): DailyForecast[] {
  const times = daily.time as unknown[];
  const values = Object.fromEntries(FORECAST_DAILY_VARIABLES.map((name) => [name, getModelVariable(daily, name, model)]));
  return times.flatMap((date, index): DailyForecast[] => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    return [{
      date,
      weatherCode: nullableNumber(Array.isArray(values.weather_code) ? values.weather_code[index] : null),
      temperatureMax: nullableNumber(Array.isArray(values.temperature_2m_max) ? values.temperature_2m_max[index] : null),
      temperatureMin: nullableNumber(Array.isArray(values.temperature_2m_min) ? values.temperature_2m_min[index] : null),
      precipitationSum: nullableNumber(Array.isArray(values.precipitation_sum) ? values.precipitation_sum[index] : null),
      precipitationProbabilityMax: nullableNumber(Array.isArray(values.precipitation_probability_max) ? values.precipitation_probability_max[index] : null),
      windSpeedMax: nullableNumber(Array.isArray(values.wind_speed_10m_max) ? values.wind_speed_10m_max[index] : null),
      uvIndexMax: nullableNumber(Array.isArray(values.uv_index_max) ? values.uv_index_max[index] : null),
      sunrise: nullableString(Array.isArray(values.sunrise) ? values.sunrise[index] : null),
      sunset: nullableString(Array.isArray(values.sunset) ? values.sunset[index] : null),
      daylightDuration: nullableNumber(Array.isArray(values.daylight_duration) ? values.daylight_duration[index] : null),
    }];
  });
}

export function normalizeForecast(payload: unknown, params: Pick<NormalizedForecastParams, 'latitude' | 'longitude' | 'temperatureUnit' | 'windSpeedUnit' | 'precipitationUnit'> & Partial<Pick<NormalizedForecastParams, 'model'>>): ForecastData {
  const model = params.model ?? DEFAULT_FORECAST_MODEL;
  validateForecastPayload(payload, model);
  const current = payload.current as Record<string, unknown>;
  const hourly = payload.hourly as Record<string, unknown>;
  const daily = payload.daily as Record<string, unknown>;
  const apiLatitude = nullableNumber(payload.latitude);
  const apiLongitude = nullableNumber(payload.longitude);
  const units: ForecastUnits = {
    temperature: params.temperatureUnit,
    windSpeed: params.windSpeedUnit,
    precipitation: params.precipitationUnit,
  };

  return {
    location: {
      latitude: apiLatitude !== null && apiLatitude >= -90 && apiLatitude <= 90 ? apiLatitude : params.latitude,
      longitude: apiLongitude !== null && apiLongitude >= -180 && apiLongitude <= 180 ? apiLongitude : params.longitude,
      elevation: nullableNumber(payload.elevation),
      timezone: nullableString(payload.timezone),
      timezoneAbbreviation: nullableString(payload.timezone_abbreviation),
    },
    current: normalizeCurrent(current, hourly, model),
    hourly: normalizeHourly(hourly, model),
    daily: normalizeDaily(daily, model),
    units,
  };
}

export async function getForecast(params: ForecastParams, options: ForecastOptions = {}): Promise<ForecastData> {
  const normalizedParams = validateParams(params);
  if (options.signal?.aborted) throw new RequestAbortedError();
  const payload = await fetchJson(makeForecastUrl(normalizedParams), { signal: options.signal });
  return normalizeForecast(payload, normalizedParams);
}
