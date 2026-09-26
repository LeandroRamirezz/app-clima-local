import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FORECAST_API_URL, FORECAST_CURRENT_VARIABLES, FORECAST_DAILY_VARIABLES, FORECAST_HOURLY_VARIABLES } from '../config/forecast';
import { RequestAbortedError } from '../types/errors';
import type { ForecastParams } from '../types/forecast';
import { getForecast, findCurrentUvIndex, normalizeForecast } from './forecast';
import { mapWeatherCode } from '../utils/weather-code';
import { getUvCategory } from '../utils/uv-category';

const validParams: ForecastParams = { latitude: 2.9273, longitude: -75.2819 };

function forecastPayload(): Record<string, unknown> {
  return {
    latitude: 2.93,
    longitude: -75.28,
    elevation: 442.4,
    timezone: 'America/Bogota',
    timezone_abbreviation: '-05',
    utc_offset_seconds: -18000,
    current_units: { time: 'iso8601', temperature_2m: '°C' },
    current: {
      time: '2026-09-24T10:00', interval: 900, temperature_2m: 25.4, apparent_temperature: 27.1,
      relative_humidity_2m: 68, precipitation: 0.2, weather_code: 2, wind_speed_10m: 10.8, wind_direction_10m: 135,
    },
    hourly_units: { temperature_2m: '°C', uv_index: '' },
    hourly: {
      time: ['2026-09-24T10:00', '2026-09-24T11:00'],
      temperature_2m: [25.4, 26.1],
      apparent_temperature: [27.1, 28],
      precipitation_probability: [10, 20],
      precipitation: [0.2, 0],
      wind_speed_10m: [10.8, 12],
      uv_index: [4.2, 6.1],
      weather_code: [2, 3],
    },
    daily_units: { sunrise: 'iso8601', daylight_duration: 's' },
    daily: {
      time: ['2026-09-24', '2026-09-25'],
      weather_code: [2, 61],
      temperature_2m_max: [28.2, 27],
      temperature_2m_min: [18.3, 18.1],
      precipitation_sum: [1.4, 2.2],
      precipitation_probability_max: [30, 55],
      wind_speed_10m_max: [18, 20],
      uv_index_max: [9.2, 10.1],
      sunrise: ['2026-09-24T05:52', '2026-09-25T05:52'],
      sunset: ['2026-09-24T17:58', '2026-09-25T17:58'],
      daylight_duration: [43500, 43480],
    },
  };
}

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

function fetchMock(): ReturnType<typeof vi.fn> {
  return vi.mocked(fetch);
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(forecastPayload())));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getForecast', () => {
  it('hace un único request al endpoint Forecast con coordenadas y todas las variables requeridas', async () => {
    await getForecast(validParams);
    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const url = new URL(String(fetchMock().mock.calls[0]?.[0]));
    expect(url.origin + url.pathname).toBe(FORECAST_API_URL);
    expect(url.searchParams.get('latitude')).toBe(String(validParams.latitude));
    expect(url.searchParams.get('longitude')).toBe(String(validParams.longitude));
    expect(url.searchParams.get('timezone')).toBe('auto');
    expect(url.searchParams.get('forecast_days')).toBe('7');
    expect(url.searchParams.get('current')?.split(',')).toEqual([...FORECAST_CURRENT_VARIABLES]);
    expect(url.searchParams.get('hourly')?.split(',')).toEqual([...FORECAST_HOURLY_VARIABLES]);
    expect(url.searchParams.get('daily')?.split(',')).toEqual([...FORECAST_DAILY_VARIABLES]);
  });

  it('aplica las unidades por defecto y models=best_match', async () => {
    const result = await getForecast(validParams);
    const url = new URL(String(fetchMock().mock.calls[0]?.[0]));
    expect(url.searchParams.get('temperature_unit')).toBe('celsius');
    expect(url.searchParams.get('wind_speed_unit')).toBe('kmh');
    expect(url.searchParams.get('precipitation_unit')).toBe('mm');
    expect(url.searchParams.get('models')).toBe('best_match');
    expect(result.units).toEqual({ temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm' });
  });

  it('envía días, unidades y modelo recibidos explícitamente', async () => {
    await getForecast({ ...validParams, forecastDays: 16, temperatureUnit: 'fahrenheit', windSpeedUnit: 'mph', precipitationUnit: 'inch', model: 'best_match' });
    const url = new URL(String(fetchMock().mock.calls[0]?.[0]));
    expect(url.searchParams.get('forecast_days')).toBe('16');
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit');
    expect(url.searchParams.get('wind_speed_unit')).toBe('mph');
    expect(url.searchParams.get('precipitation_unit')).toBe('inch');
    expect(url.searchParams.get('models')).toBe('best_match');
  });

  it.each([
    ['icon_seamless', 'icon_seamless'],
    ['ncep_gfs_seamless', 'ncep_gfs_seamless'],
    ['ecmwf_ifs025', 'ecmwf_ifs025'],
  ] as const)('envía el identificador oficial del modelo %s', async (model, expected) => {
    await getForecast({ ...validParams, model });
    const url = new URL(String(fetchMock().mock.calls[0]?.[0]));
    expect(url.searchParams.get('models')).toBe(expected);
  });

  it.each([
    [{ ...validParams, latitude: -90.01 }, 'invalid-latitude'],
    [{ ...validParams, latitude: 90.01 }, 'invalid-latitude'],
    [{ ...validParams, longitude: -180.01 }, 'invalid-longitude'],
    [{ ...validParams, longitude: 180.01 }, 'invalid-longitude'],
    [{ ...validParams, latitude: Number.NaN }, 'invalid-latitude'],
    [{ ...validParams, longitude: Number.POSITIVE_INFINITY }, 'invalid-longitude'],
    [{ ...validParams, forecastDays: 0 }, 'invalid-forecast-days'],
    [{ ...validParams, forecastDays: 17 }, 'invalid-forecast-days'],
    [{ ...validParams, forecastDays: 1.5 }, 'invalid-forecast-days'],
    [{ ...validParams, temperatureUnit: 'kelvin' as 'celsius' }, 'invalid-temperature-unit'],
    [{ ...validParams, windSpeedUnit: 'knots' as 'kmh' }, 'invalid-wind-speed-unit'],
    [{ ...validParams, precipitationUnit: 'cm' as 'mm' }, 'invalid-precipitation-unit'],
    [{ ...validParams, model: 'gfs' as 'best_match' }, 'invalid-model'],
  ])('rechaza parámetros inválidos sin request (%s)', async (params, code) => {
    await expect(getForecast(params)).rejects.toMatchObject({ name: 'ForecastInputError', code });
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it.each([1, 16])('acepta el límite de %i días', async (forecastDays) => {
    await expect(getForecast({ ...validParams, forecastDays })).resolves.toBeTruthy();
  });

  it('normaliza current, hourly, daily, elevación, unidades y conserva las horas locales', async () => {
    const forecast = await getForecast(validParams);
    expect(forecast.location).toEqual({ latitude: 2.93, longitude: -75.28, elevation: 442.4, timezone: 'America/Bogota', timezoneAbbreviation: '-05' });
    expect(forecast.current).toEqual({
      time: '2026-09-24T10:00', temperature: 25.4, apparentTemperature: 27.1, relativeHumidity: 68,
      precipitation: 0.2, weatherCode: 2, windSpeed: 10.8, windDirection: 135, uvIndex: 4.2,
    });
    expect(forecast.hourly[1]).toEqual({
      time: '2026-09-24T11:00', temperature: 26.1, apparentTemperature: 28, precipitationProbability: 20,
      precipitation: 0, windSpeed: 12, uvIndex: 6.1, weatherCode: 3,
    });
    expect(forecast.daily[0]).toEqual({
      date: '2026-09-24', weatherCode: 2, temperatureMax: 28.2, temperatureMin: 18.3, precipitationSum: 1.4,
      precipitationProbabilityMax: 30, windSpeedMax: 18, uvIndexMax: 9.2, sunrise: '2026-09-24T05:52',
      sunset: '2026-09-24T17:58', daylightDuration: 43500,
    });
    expect(forecast.current.time).toBe('2026-09-24T10:00');
    expect(forecast.daily[0]?.sunrise).toBe('2026-09-24T05:52');
  });

  it('normaliza nulos y arrays opcionales más cortos sin undefined ni NaN', async () => {
    const payload = forecastPayload();
    const current = payload.current as Record<string, unknown>;
    const hourly = payload.hourly as Record<string, unknown>;
    const daily = payload.daily as Record<string, unknown>;
    current.apparent_temperature = null;
    current.relative_humidity_2m = Number.NaN;
    hourly.temperature_2m = [null];
    hourly.uv_index = null;
    daily.temperature_2m_max = [null];
    daily.sunrise = null;
    vi.mocked(fetch).mockResolvedValueOnce(response(payload));
    const forecast = await getForecast(validParams);
    expect(forecast.current.apparentTemperature).toBeNull();
    expect(forecast.current.relativeHumidity).toBeNull();
    expect(forecast.current.uvIndex).toBeNull();
    expect(forecast.hourly.map((row) => row.temperature)).toEqual([null, null]);
    expect(forecast.hourly[0]?.uvIndex).toBeNull();
    expect(forecast.daily.map((row) => row.temperatureMax)).toEqual([null, null]);
    expect(forecast.daily[0]?.sunrise).toBeNull();
    expect(JSON.stringify(forecast)).not.toContain('undefined');
    expect(JSON.stringify(forecast)).not.toContain('NaN');
  });

  it('normaliza valores con sufijo del modelo seleccionado y conserva campos ausentes como null', () => {
    const payload = forecastPayload();
    const current = payload.current as Record<string, unknown>;
    const hourly = payload.hourly as Record<string, unknown>;
    const daily = payload.daily as Record<string, unknown>;
    current.temperature_2m_icon_seamless = 26.5;
    delete current.temperature_2m;
    hourly.temperature_2m_icon_seamless = [26.5, null];
    hourly.uv_index_icon_seamless = [null, 5];
    delete hourly.temperature_2m;
    delete hourly.uv_index;
    daily.temperature_2m_max_icon_seamless = [30, null];
    delete daily.temperature_2m_max;
    const result = normalizeForecast(payload, { ...validParams, temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm', model: 'icon_seamless' });
    expect(result.current.temperature).toBe(26.5);
    expect(result.hourly.map((hour) => hour.temperature)).toEqual([26.5, null]);
    expect(result.current.uvIndex).toBeNull();
    expect(result.daily.map((day) => day.temperatureMax)).toEqual([30, null]);
  });

  it('conserva filas de hourly y daily aunque falten variables opcionales', () => {
    const payload = forecastPayload();
    const hourly = payload.hourly as Record<string, unknown>;
    const daily = payload.daily as Record<string, unknown>;
    delete hourly.apparent_temperature;
    delete daily.precipitation_sum;
    const result = normalizeForecast(payload, { ...validParams, temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm' });
    expect(result.hourly).toHaveLength(2);
    expect(result.hourly[0]?.apparentTemperature).toBeNull();
    expect(result.daily).toHaveLength(2);
    expect(result.daily[0]?.precipitationSum).toBeNull();
  });

  it('conserva la elevación válida y normaliza elevación ausente o no numérica como null', async () => {
    const valid = await getForecast(validParams);
    expect(valid.location.elevation).toBe(442.4);
    const missing = forecastPayload();
    delete missing.elevation;
    const invalid = forecastPayload();
    invalid.elevation = '441';
    vi.mocked(fetch).mockResolvedValueOnce(response(missing)).mockResolvedValueOnce(response(invalid));
    await expect(getForecast(validParams)).resolves.toMatchObject({ location: { elevation: null } });
    await expect(getForecast(validParams)).resolves.toMatchObject({ location: { elevation: null } });
  });

  it.each([
    [{}],
    [{ current: {}, hourly: {}, daily: {} }],
    [{ current: { time: '2026-09-24T10:00' }, hourly: {}, daily: { time: [] } }],
    [{ current: { time: '2026-09-24T10:00' }, hourly: { time: [] }, daily: {} }],
  ])('clasifica como E-05 una respuesta estructuralmente inválida', async (payload) => {
    vi.mocked(fetch).mockResolvedValueOnce(response(payload));
    await expect(getForecast(validParams)).rejects.toMatchObject({ name: 'AppError', code: 'E-05' });
  });

  it('clasifica un JSON malformado como E-05', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{', { status: 200 }));
    await expect(getForecast(validParams)).rejects.toMatchObject({ name: 'AppError', code: 'E-05' });
  });

  it.each([[400, 'E-04'], [429, 'E-03'], [500, 'E-05']])('mapea HTTP %i al error %s', async (status, code) => {
    vi.mocked(fetch).mockResolvedValueOnce(response({}, status));
    await expect(getForecast(validParams)).rejects.toMatchObject({ name: 'AppError', code });
  });

  it('mapea un fallo de red a E-01', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('offline detail'));
    await expect(getForecast(validParams)).rejects.toMatchObject({ name: 'AppError', code: 'E-01' });
  });

  it('mapea el timeout de 10 segundos a E-02 y limpia el timer', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementationOnce((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted')), { once: true });
    }));
    const pending = getForecast(validParams);
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AppError', code: 'E-02' });
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('la cancelación externa no se transforma en error genérico y limpia el timer', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockImplementationOnce((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted')), { once: true });
    }));
    const controller = new AbortController();
    const pending = getForecast(validParams, { signal: controller.signal });
    const assertion = expect(pending).rejects.toBeInstanceOf(RequestAbortedError);
    controller.abort();
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('una señal ya cancelada no inicia un request', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(getForecast(validParams, { signal: controller.signal })).rejects.toBeInstanceOf(RequestAbortedError);
    expect(fetchMock()).not.toHaveBeenCalled();
  });
});

describe('findCurrentUvIndex', () => {
  it('usa coincidencia exacta de current.time', () => {
    expect(findCurrentUvIndex('2026-09-24T10:00', ['2026-09-24T09:00', '2026-09-24T10:00'], [1, 5])).toBe(5);
  });

  it('usa el registro del mismo bloque horario cuando no hay coincidencia exacta', () => {
    expect(findCurrentUvIndex('2026-09-24T10:15', ['2026-09-24T10:00', '2026-09-24T11:00'], [4.2, 8])).toBe(4.2);
  });

  it('retorna null si UV no existe o no hay hora compatible', () => {
    expect(findCurrentUvIndex('2026-09-24T10:00', ['2026-09-24T10:00'], [])).toBeNull();
    expect(findCurrentUvIndex('2026-09-24T10:00', ['2026-09-24T11:00'], [0])).toBeNull();
    expect(findCurrentUvIndex('sin-fecha', ['2026-09-24T10:00'], [5])).toBeNull();
  });
});

describe('mapWeatherCode', () => {
  it.each([
    [0, 'Despejado', 'clear'],
    [3, 'Nublado', 'cloudy'],
    [45, 'Niebla', 'fog'],
    [61, 'Lluvia ligera', 'rain'],
    [71, 'Nevada ligera', 'snow'],
    [80, 'Chubascos ligeros', 'showers'],
    [95, 'Tormenta eléctrica', 'thunderstorm'],
  ] as const)('traduce el código WMO %i', (code, label, iconKey) => {
    expect(mapWeatherCode(code)).toEqual({ code, label, iconKey });
  });

  it('usa condición y clave neutras para código desconocido o ausente', () => {
    expect(mapWeatherCode(123)).toEqual({ code: 123, label: 'Condición no disponible', iconKey: 'unavailable' });
    expect(mapWeatherCode(null)).toEqual({ code: null, label: 'Condición no disponible', iconKey: 'unavailable' });
  });
});

describe('getUvCategory', () => {
  it.each([
    [0, 'Bajo'], [2, 'Bajo'], [3, 'Moderado'], [5, 'Moderado'], [6, 'Alto'], [7, 'Alto'],
    [8, 'Muy alto'], [10, 'Muy alto'], [11, 'Extremo'], [15, 'Extremo'],
  ] as const)('clasifica UV %i como %s', (value, category) => {
    expect(getUvCategory(value)).toBe(category);
  });

  it.each([null, undefined, Number.NaN, Number.POSITIVE_INFINITY, -1])('trata %s como dato no disponible', (value) => {
    expect(getUvCategory(value)).toBeNull();
  });
});
