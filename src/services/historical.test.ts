import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_TIMEOUT_MS } from '../config/api';
import { HISTORICAL_API_URL, HISTORICAL_DAILY_VARIABLES, HISTORICAL_TIMEOUT_MS } from '../config/historical';
import { AppError, RequestAbortedError } from '../types/errors';
import type { HistoricalParams } from '../types/historical';
import { getHistoricalWeather, normalizeHistoricalWeather } from './historical';

const params: HistoricalParams = {
  latitude: 2.93,
  longitude: -75.28,
  startDate: '2026-08-10',
  endDate: '2026-08-11',
  temperatureUnit: 'fahrenheit',
  windSpeedUnit: 'mph',
  precipitationUnit: 'inch',
};

function archivePayload(): Record<string, unknown> {
  return {
    latitude: 2.94,
    longitude: -75.27,
    timezone: 'America/Bogota',
    daily_units: {
      time: 'iso8601', temperature_2m_max: '°F', temperature_2m_min: '°F', temperature_2m_mean: '°F',
      precipitation_sum: 'inch', wind_speed_10m_max: 'mph', relative_humidity_2m_mean: '%',
    },
    daily: {
      time: ['2026-08-10', '2026-08-11'],
      temperature_2m_max: [88.2, 86.1],
      temperature_2m_min: [69.4, 68.9],
      temperature_2m_mean: [78.8, 77.5],
      precipitation_sum: [0.12, 0],
      wind_speed_10m_max: [11.3, 9.8],
      relative_humidity_2m_mean: [64, 67],
    },
  };
}

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(archivePayload())));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getHistoricalWeather', () => {
  it('solicita las variables oficiales de Archive, zona automática y las unidades recibidas sin modelo', async () => {
    await getHistoricalWeather(params);
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe(HISTORICAL_API_URL);
    expect(url.searchParams.get('latitude')).toBe('2.93');
    expect(url.searchParams.get('longitude')).toBe('-75.28');
    expect(url.searchParams.get('start_date')).toBe('2026-08-10');
    expect(url.searchParams.get('end_date')).toBe('2026-08-11');
    expect(url.searchParams.get('daily')?.split(',')).toEqual([...HISTORICAL_DAILY_VARIABLES]);
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit');
    expect(url.searchParams.get('wind_speed_unit')).toBe('mph');
    expect(url.searchParams.get('precipitation_unit')).toBe('inch');
    expect(url.searchParams.has('models')).toBe(false);
  });

  it('normaliza días, arrays paralelos, unidades y coordenadas de la respuesta', async () => {
    const data = await getHistoricalWeather(params);
    expect(data).toEqual({
      location: { latitude: 2.94, longitude: -75.27, timezone: 'America/Bogota' },
      startDate: '2026-08-10', endDate: '2026-08-11',
      days: [
        { date: '2026-08-10', temperatureMax: 88.2, temperatureMin: 69.4, temperatureMean: 78.8, precipitationSum: 0.12, windSpeedMax: 11.3, humidity: 64 },
        { date: '2026-08-11', temperatureMax: 86.1, temperatureMin: 68.9, temperatureMean: 77.5, precipitationSum: 0, windSpeedMax: 9.8, humidity: 67 },
      ],
      units: { temperature: 'fahrenheit', windSpeed: 'mph', precipitation: 'inch', humidity: '%' },
    });
  });

  it('normaliza una consulta de un día sin cambiar su fecha calendario', async () => {
    const singleDay = { ...params, startDate: '2026-08-10', endDate: '2026-08-10' };
    vi.mocked(fetch).mockResolvedValueOnce(response({ ...archivePayload(), daily: { ...archivePayload().daily as object, time: ['2026-08-10'] } }));
    const data = await getHistoricalWeather(singleDay);
    expect(new URL(String(vi.mocked(fetch).mock.calls[0]?.[0])).searchParams.get('start_date')).toBe('2026-08-10');
    expect(data.days.map((day) => day.date)).toEqual(['2026-08-10']);
  });

  it('no consulta con coordenadas, fechas, rango o unidades inválidas', async () => {
    const invalid = [
      { ...params, latitude: 91 },
      { ...params, longitude: -181 },
      { ...params, startDate: '1939-12-31', endDate: '1939-12-31' },
      { ...params, startDate: '2026-08-01', endDate: '2026-09-01' },
      { ...params, startDate: '2026-08-12', endDate: '2026-08-11' },
      { ...params, temperatureUnit: 'kelvin' as never },
    ];
    for (const input of invalid) await expect(getHistoricalWeather(input)).rejects.toBeInstanceOf(Error);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('mantiene variables ausentes y posiciones cortas como null sin invalidar el día', () => {
    const payload = archivePayload();
    const daily = payload.daily as Record<string, unknown>;
    daily.temperature_2m_max = [31];
    daily.temperature_2m_min = [21, null];
    daily.temperature_2m_mean = [24, 'invalid'];
    daily.precipitation_sum = [null];
    daily.wind_speed_10m_max = [10];
    delete daily.relative_humidity_2m_mean;
    const data = normalizeHistoricalWeather(payload, params);
    expect(data.days[0]).toMatchObject({ temperatureMax: 31, temperatureMin: 21, temperatureMean: 24, precipitationSum: null, humidity: null });
    expect(data.days[1]).toMatchObject({ temperatureMax: null, temperatureMin: null, temperatureMean: null, precipitationSum: null, windSpeedMax: null, humidity: null });
  });

  it.each([
    [400, 'E-04'], [429, 'E-03'], [500, 'E-05'],
  ] as const)('traduce HTTP %i al error %s sin mostrar reason', async (status, code) => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ reason: 'detalle privado del proveedor' }), { status }));
    await expect(getHistoricalWeather(params)).rejects.toMatchObject({ code, message: expect.not.stringContaining('detalle privado') });
  });

  it('clasifica fallo de red como E-01 y JSON inválido como E-05', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(getHistoricalWeather(params)).rejects.toMatchObject({ code: 'E-01' });
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{bad json', { status: 200 }));
    await expect(getHistoricalWeather(params)).rejects.toMatchObject({ code: 'E-05' });
  });

  it.each([
    null,
    {},
    { daily: { time: ['2026-08-09', '2026-08-11'] } },
    { daily: { time: ['2026-08-10'] } },
  ])('rechaza respuesta estructuralmente inválida o desalineada con las fechas', (payload) => {
    expect(() => normalizeHistoricalWeather(payload, params)).toThrow(AppError);
  });

  it('aplica timeout de 10 segundos y distingue una cancelación voluntaria', async () => {
    expect(HISTORICAL_TIMEOUT_MS).toBe(API_TIMEOUT_MS);
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementationOnce((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const timedRequest = getHistoricalWeather(params);
    const timeoutExpectation = expect(timedRequest).rejects.toMatchObject({ code: 'E-02' });
    await vi.advanceTimersByTimeAsync(API_TIMEOUT_MS);
    await timeoutExpectation;

    const controller = new AbortController();
    vi.mocked(fetch).mockImplementationOnce((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const abortedRequest = getHistoricalWeather(params, { signal: controller.signal });
    const abortExpectation = expect(abortedRequest).rejects.toBeInstanceOf(RequestAbortedError);
    controller.abort();
    await abortExpectation;
  });
});
