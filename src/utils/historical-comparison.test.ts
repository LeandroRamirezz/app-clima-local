import { describe, expect, it } from 'vitest';
import type { HistoricalDay } from '../types/historical';
import { formatHistoricalDifference } from './historical-comparison';

const first: HistoricalDay = {
  date: '2026-08-10', temperatureMax: 31.4, temperatureMin: 20, temperatureMean: 25,
  precipitationSum: 0, windSpeedMax: 10, humidity: 64,
};
const second: HistoricalDay = {
  date: '2026-08-09', temperatureMax: 29.2, temperatureMin: 22,
  temperatureMean: 25, precipitationSum: 1.8, windSpeedMax: 10, humidity: 60,
};

describe('formatHistoricalDifference', () => {
  it('distingue aumentos, descensos e igualdad con unidades', () => {
    expect(formatHistoricalDifference(first, second, 'temperatureMax', '°C')).toBe('+2,2 °C');
    expect(formatHistoricalDifference(first, second, 'temperatureMin', '°C')).toBe('-2 °C');
    expect(formatHistoricalDifference(first, second, 'temperatureMean', '°C')).toBe('0 °C');
    expect(formatHistoricalDifference(first, second, 'humidity', '%')).toBe('+4 %');
  });

  it('preserva un cero real y representa un dato ausente como N/D', () => {
    expect(formatHistoricalDifference(first, second, 'windSpeedMax', 'km/h')).toBe('0 km/h');
    expect(formatHistoricalDifference({ ...first, temperatureMax: null }, second, 'temperatureMax', '°C')).toBe('N/D');
    expect(formatHistoricalDifference(first, { ...second, precipitationSum: null }, 'precipitationSum', 'mm')).toBe('N/D');
  });
});
