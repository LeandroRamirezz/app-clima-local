import type { HistoricalDay } from '../types/historical';
import { formatForecastNumber } from './forecast-presentation';

export type HistoricalMetric = keyof Pick<HistoricalDay, 'temperatureMax' | 'temperatureMin' | 'temperatureMean' | 'precipitationSum' | 'windSpeedMax' | 'humidity'>;

export function formatHistoricalDifference(first: HistoricalDay, second: HistoricalDay, metric: HistoricalMetric, unit: string): string {
  const a = first[metric];
  const b = second[metric];
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return 'N/D';
  const difference = a - b;
  const rounded = Number(difference.toFixed(metric === 'humidity' ? 0 : 1));
  return `${rounded > 0 ? '+' : ''}${formatForecastNumber(rounded, metric === 'humidity' ? 0 : 1)} ${unit}`;
}
