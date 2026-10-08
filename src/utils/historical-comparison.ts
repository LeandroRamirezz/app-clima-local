import type { HistoricalDay } from '../types/historical';
import { formatForecastNumber } from './forecast-presentation';

export type HistoricalMetric = keyof Pick<HistoricalDay, 'temperatureMax' | 'temperatureMin' | 'temperatureMean' | 'precipitationSum' | 'windSpeedMax' | 'humidity'>;

export function formatHistoricalValueDifference(first: number | null, second: number | null, unit: string, fractionDigits = 1): string {
  if (first === null || second === null || !Number.isFinite(first) || !Number.isFinite(second)) return 'N/D';
  const rounded = Number((first - second).toFixed(fractionDigits));
  return `${rounded > 0 ? '+' : ''}${formatForecastNumber(rounded, fractionDigits)} ${unit}`;
}

export function formatHistoricalDifference(first: HistoricalDay, second: HistoricalDay, metric: HistoricalMetric, unit: string): string {
  return formatHistoricalValueDifference(first[metric], second[metric], unit, metric === 'humidity' ? 0 : 1);
}
