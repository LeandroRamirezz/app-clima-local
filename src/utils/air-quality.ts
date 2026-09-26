import { AIR_QUALITY_VARIABLES, US_AQI_LEVELS } from '../config/air-quality';
import type { AirQualityData, AirQualityHourly, UsAqiCategory } from '../types/air-quality';
import { formatForecastTime } from './forecast-presentation';

export function getUsAqiCategory(value: number | null | undefined): UsAqiCategory | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;

  const match = [...US_AQI_LEVELS].reverse().find((category) => value >= category.minimum);
  return match ? { level: match.level, label: match.label, message: match.message } : null;
}

function localHourKey(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}):\d{2}$/.exec(value);
  return match?.[1] ?? null;
}

/**
 * The Archive API supplies local ISO times. Match the current local hour first,
 * then the first hour at or after current.time; never parse through Date/UTC.
 */
export function getNextAirQualityHours(data: AirQualityData, limit = 24): AirQualityHourly[] {
  if (!Number.isInteger(limit) || limit < 1) return [];
  const currentHour = localHourKey(data.current.time);
  let startIndex = currentHour === null
    ? -1
    : data.hourly.findIndex((entry) => localHourKey(entry.time) === currentHour);

  if (startIndex < 0) {
    startIndex = data.hourly.findIndex((entry) => entry.time >= data.current.time);
  }
  if (startIndex < 0) return [];
  return data.hourly.slice(startIndex, startIndex + limit);
}

export function formatAirQualityTime(value: string): string {
  return formatForecastTime(value) ?? 'Hora no disponible';
}

export const AIR_QUALITY_VARIABLE_KEYS = AIR_QUALITY_VARIABLES;
