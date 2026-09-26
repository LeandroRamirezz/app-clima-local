import { API_TIMEOUT_MS } from './api';

export const HISTORICAL_API_URL = 'https://archive-api.open-meteo.com/v1/archive';
export const HISTORICAL_MIN_DATE = '1940-01-01';
export const HISTORICAL_MAX_RANGE_DAYS = 31;
export const HISTORICAL_AVAILABILITY_LAG_DAYS = 5;
export const HISTORICAL_TIMEOUT_MS = API_TIMEOUT_MS;

export const HISTORICAL_DAILY_VARIABLES = [
  'temperature_2m_max',
  'temperature_2m_min',
  'temperature_2m_mean',
  'precipitation_sum',
  'wind_speed_10m_max',
  'relative_humidity_2m_mean',
] as const;
