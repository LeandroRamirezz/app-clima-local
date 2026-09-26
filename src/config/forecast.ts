import { API_TIMEOUT_MS } from './api';

export const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast';
export const FORECAST_TIMEOUT_MS = API_TIMEOUT_MS;
export const DEFAULT_FORECAST_DAYS = 7;
export const DEFAULT_TEMPERATURE_UNIT = 'celsius';
export const DEFAULT_WIND_SPEED_UNIT = 'kmh';
export const DEFAULT_PRECIPITATION_UNIT = 'mm';
export const DEFAULT_FORECAST_MODEL = 'best_match';
export const FORECAST_MODELS = [
  { value: 'best_match', label: 'Automático' },
  { value: 'icon_seamless', label: 'ICON' },
  { value: 'ncep_gfs_seamless', label: 'GFS' },
  { value: 'ecmwf_ifs025', label: 'ECMWF' },
] as const;
export const FORECAST_UNITS_STORAGE_KEY = 'weather-app.units';

export const FORECAST_CURRENT_VARIABLES = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
] as const;

export const FORECAST_HOURLY_VARIABLES = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'wind_speed_10m',
  'uv_index',
  'weather_code',
] as const;

export const FORECAST_DAILY_VARIABLES = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'uv_index_max',
  'sunrise',
  'sunset',
  'daylight_duration',
] as const;
