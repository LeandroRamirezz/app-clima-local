import type { ForecastUnits, PrecipitationUnit, TemperatureUnit, WindSpeedUnit } from './forecast';

export interface HistoricalParams {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  temperatureUnit: TemperatureUnit;
  windSpeedUnit: WindSpeedUnit;
  precipitationUnit: PrecipitationUnit;
}

export interface HistoricalOptions {
  signal?: AbortSignal;
}

export interface HistoricalLocation {
  latitude: number;
  longitude: number;
  timezone: string | null;
}

export interface HistoricalDay {
  date: string;
  temperatureMax: number | null;
  temperatureMin: number | null;
  temperatureMean: number | null;
  precipitationSum: number | null;
  windSpeedMax: number | null;
  humidity: number | null;
}

export interface HistoricalUnits extends ForecastUnits {
  humidity: '%';
}

export interface HistoricalWeatherData {
  location: HistoricalLocation;
  startDate: string;
  endDate: string;
  days: HistoricalDay[];
  units: HistoricalUnits;
}

export interface OpenMeteoArchiveDaily {
  [variable: string]: unknown;
  time: unknown;
  temperature_2m_max?: unknown;
  temperature_2m_min?: unknown;
  temperature_2m_mean?: unknown;
  precipitation_sum?: unknown;
  wind_speed_10m_max?: unknown;
  relative_humidity_2m_mean?: unknown;
}

export interface OpenMeteoArchiveResponse {
  latitude?: unknown;
  longitude?: unknown;
  timezone?: unknown;
  daily?: OpenMeteoArchiveDaily;
  daily_units?: Record<string, unknown>;
}

export type HistoricalDateErrorCode =
  | 'invalid-date'
  | 'start-after-end'
  | 'before-minimum'
  | 'future-date'
  | 'not-yet-available'
  | 'range-too-long';

export class HistoricalDateError extends Error {
  readonly code: HistoricalDateErrorCode;

  constructor(code: HistoricalDateErrorCode, message: string) {
    super(message);
    this.name = 'HistoricalDateError';
    this.code = code;
  }
}

export class HistoricalInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HistoricalInputError';
  }
}
