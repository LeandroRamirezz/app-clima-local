import { describe, expect, it } from 'vitest';
import { getTodayCalendarDate, addCalendarDays } from '../../src/utils/historical-dates';
import { getAirQuality } from '../../src/services/air-quality';
import { searchCities } from '../../src/services/geocoding';
import { getForecast } from '../../src/services/forecast';
import { getHistoricalWeather } from '../../src/services/historical';
import type { ForecastModel } from '../../src/types/forecast';

const regions = [
  { name: 'América', latitude: 4.711, longitude: -74.0721, timezone: 'America/Bogota' },
  { name: 'Europa', latitude: 51.5072, longitude: -0.1276, timezone: 'Europe/London' },
  { name: 'Asia', latitude: 35.6762, longitude: 139.6503, timezone: 'Asia/Tokyo' },
] as const;

const explicitModels: readonly ForecastModel[] = [
  'icon_seamless',
  'ncep_gfs_seamless',
  'ecmwf_ifs025',
];

describe('Contrato live de Open-Meteo (requiere internet; no se ejecuta en npm test)', () => {
  it.each(regions)('Forecast devuelve estructura y hora local para $name ($timezone)', async (region) => {
    const data = await getForecast({
      latitude: region.latitude,
      longitude: region.longitude,
      forecastDays: 1,
      model: 'best_match',
    });

    expect(data.location.timezone).toBe(region.timezone);
    expect(data.current.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(data.hourly.length).toBeGreaterThan(0);
    expect(data.daily).toHaveLength(1);
  });

  it.each(explicitModels)('Forecast acepta el identificador de modelo %s', async (model) => {
    const data = await getForecast({
      latitude: 4.711,
      longitude: -74.0721,
      forecastDays: 1,
      model,
    });

    expect(data.current.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(data.daily).toHaveLength(1);
    expect(data.current.temperature === null || Number.isFinite(data.current.temperature)).toBe(true);
  });

  it('Geocoding entrega ubicaciones utilizables en español', async () => {
    const locations = await searchCities('Neiva');

    expect(locations.length).toBeGreaterThan(0);
    expect(locations.some((location) => location.country === 'Colombia')).toBe(true);
    expect(locations.every((location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude))).toBe(true);
  });

  it('Archive devuelve exactamente la fecha calendario solicitada en timezone auto', async () => {
    const date = addCalendarDays(getTodayCalendarDate(), -10);
    if (!date) throw new Error('No se pudo determinar la fecha estable para el contrato Archive.');

    const data = await getHistoricalWeather({
      latitude: 4.711,
      longitude: -74.0721,
      startDate: date,
      endDate: date,
      temperatureUnit: 'celsius',
      windSpeedUnit: 'kmh',
      precipitationUnit: 'mm',
    });

    expect(data.days.map((day) => day.date)).toEqual([date]);
    expect(data.location.timezone).toBe('America/Bogota');
  });

  it('Air Quality entrega AQI US, contaminantes y horas locales', async () => {
    const data = await getAirQuality({ latitude: 4.711, longitude: -74.0721 });

    expect(data.current.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(data.location.timezone).toBe('America/Bogota');
    expect(data.current.usAqi === null || Number.isFinite(data.current.usAqi)).toBe(true);
    expect(data.hourly.length).toBeGreaterThan(0);
    expect(data.hourly.length).toBeLessThanOrEqual(24);
    expect(data.hourly.every((hour) => hour.time.includes('T'))).toBe(true);
  });
});
