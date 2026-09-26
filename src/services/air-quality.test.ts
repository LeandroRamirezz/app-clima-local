import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIR_QUALITY_API_URL, AIR_QUALITY_CURRENT_VARIABLES, AIR_QUALITY_FORECAST_HOURS, AIR_QUALITY_HOURLY_VARIABLES } from '../config/air-quality';
import { AppError, RequestAbortedError } from '../types/errors';
import { getAirQuality, normalizeAirQuality } from './air-quality';

const params = { latitude: 2.93, longitude: -75.28 };

function makeTimes(length = 28): string[] {
  return Array.from({ length }, (_, index) => {
    const day = index < 24 ? '25' : '26';
    const hour = String(index % 24).padStart(2, '0');
    return `2026-09-${day}T${hour}:00`;
  });
}

function airQualityResponse(): Record<string, unknown> {
  const times = makeTimes();
  return {
    latitude: 2.94,
    longitude: -75.27,
    timezone: 'America/Bogota',
    current_units: { time: 'iso8601', us_aqi: 'USAQI', pm2_5: 'μg/m³', pm10: 'μg/m³', ozone: 'μg/m³', nitrogen_dioxide: 'μg/m³', sulphur_dioxide: 'μg/m³', carbon_monoxide: 'μg/m³' },
    current: { time: '2026-09-25T10:15', us_aqi: 42, pm2_5: 8.4, pm10: 15.3, ozone: 32, nitrogen_dioxide: 4.5, sulphur_dioxide: 0.9, carbon_monoxide: 180.4 },
    hourly_units: { time: 'iso8601', us_aqi: 'USAQI', pm2_5: 'μg/m³', pm10: 'μg/m³', ozone: 'μg/m³', nitrogen_dioxide: 'μg/m³', sulphur_dioxide: 'μg/m³', carbon_monoxide: 'μg/m³' },
    hourly: {
      time: times,
      us_aqi: times.map((_, index) => index + 20),
      pm2_5: times.map((_, index) => index + 1.1),
      pm10: times.map((_, index) => index + 2.2),
      ozone: times.map((_, index) => index + 3.3),
      nitrogen_dioxide: times.map((_, index) => index + 4.4),
      sulphur_dioxide: times.map((_, index) => index + 5.5),
      carbon_monoxide: times.map((_, index) => index + 6.6),
    },
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(airQualityResponse())));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getAirQuality', () => {
  it('consulta el endpoint correcto con current, hourly, timezone auto y 24 horas', async () => {
    await getAirQuality(params);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]));
    expect(requestUrl.origin + requestUrl.pathname).toBe(AIR_QUALITY_API_URL);
    expect(requestUrl.searchParams.get('latitude')).toBe(String(params.latitude));
    expect(requestUrl.searchParams.get('longitude')).toBe(String(params.longitude));
    expect(requestUrl.searchParams.get('timezone')).toBe('auto');
    expect(requestUrl.searchParams.get('forecast_hours')).toBe(String(AIR_QUALITY_FORECAST_HOURS));
    expect(requestUrl.searchParams.get('current')?.split(',')).toEqual([...AIR_QUALITY_CURRENT_VARIABLES]);
    expect(requestUrl.searchParams.get('hourly')?.split(',')).toEqual([...AIR_QUALITY_HOURLY_VARIABLES]);
  });

  it('no envía unidades meteorológicas ni modelo RF-08', async () => {
    await getAirQuality(params);
    const requestUrl = new URL(String(vi.mocked(fetch).mock.calls[0]?.[0]));
    for (const key of ['temperature_unit', 'wind_speed_unit', 'precipitation_unit', 'models']) {
      expect(requestUrl.searchParams.has(key)).toBe(false);
    }
  });

  it('normaliza current, hourly, timezone y unidades devueltas por la API', async () => {
    const result = await getAirQuality(params);
    expect(result.location).toEqual({ latitude: 2.94, longitude: -75.27, timezone: 'America/Bogota' });
    expect(result.current).toEqual({
      time: '2026-09-25T10:15', usAqi: 42, pm25: 8.4, pm10: 15.3, ozone: 32,
      nitrogenDioxide: 4.5, sulphurDioxide: 0.9, carbonMonoxide: 180.4,
    });
    expect(result.hourly).toHaveLength(28);
    expect(result.hourly[0]).toEqual({
      time: '2026-09-25T00:00', usAqi: 20, pm25: 1.1, pm10: 2.2, ozone: 3.3,
      nitrogenDioxide: 4.4, sulphurDioxide: 5.5, carbonMonoxide: 6.6,
    });
    expect(result.units.current.pm25).toBe('μg/m³');
    expect(result.units.current.usAqi).toBe('USAQI');
  });

  it('representa variables y posiciones ausentes como null sin convertirlas a cero', () => {
    const payload = airQualityResponse();
    const current = payload.current as Record<string, unknown>;
    const hourly = payload.hourly as Record<string, unknown>;
    current.pm10 = null;
    current.ozone = Number.NaN;
    hourly.pm10 = [null];
    delete hourly.ozone;
    const result = normalizeAirQuality(payload, params);
    expect(result.current.pm10).toBeNull();
    expect(result.current.ozone).toBeNull();
    expect(result.hourly[0]?.pm10).toBeNull();
    expect(result.hourly[1]?.pm10).toBeNull();
    expect(result.hourly[1]?.ozone).toBeNull();
    expect(result.hourly[0]?.nitrogenDioxide).not.toBeNaN();
  });

  it.each([
    { invalidParams: { ...params, latitude: -90.01 }, field: 'latitude' },
    { invalidParams: { ...params, latitude: 90.01 }, field: 'latitude' },
    { invalidParams: { ...params, longitude: -180.01 }, field: 'longitude' },
    { invalidParams: { ...params, longitude: 180.01 }, field: 'longitude' },
    { invalidParams: { ...params, latitude: Number.NaN }, field: 'latitude' },
  ])('rechaza coordenadas inválidas antes del request ($field)', async ({ invalidParams, field }) => {
    await expect(getAirQuality(invalidParams)).rejects.toMatchObject({ name: 'AirQualityInputError', field });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'E-04'],
    [429, 'E-03'],
    [500, 'E-05'],
  ] as const)('clasifica HTTP %i con el catálogo común', async (status, code) => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ reason: 'no exponer' }, status));
    await expect(getAirQuality(params)).rejects.toMatchObject({ code });
  });

  it('clasifica un fallo de red como E-01', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline'));
    await expect(getAirQuality(params)).rejects.toMatchObject({ code: 'E-01' });
  });

  it('clasifica JSON o estructura malformada como E-05', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{malformado', { status: 200 }));
    await expect(getAirQuality(params)).rejects.toMatchObject({ code: 'E-05' });
    expect(() => normalizeAirQuality({ current: {}, hourly: { time: [] } }, params)).toThrowError(AppError);
  });

  it('mapea timeout de 10 segundos a E-02', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const request = getAirQuality(params);
    const rejection = expect(request).rejects.toMatchObject({ code: 'E-02' });
    await vi.advanceTimersByTimeAsync(10_000);
    await rejection;
  });

  it('trata una cancelación externa como cancelación intencional', async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const request = getAirQuality(params, { signal: controller.signal });
    const rejection = expect(request).rejects.toBeInstanceOf(RequestAbortedError);
    controller.abort();
    await rejection;
  });
});
