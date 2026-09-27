// @vitest-environment happy-dom
import { act, cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AirQualityData } from '../types/air-quality';
import type { DailyForecast, ForecastData, ForecastParams, HourlyForecast } from '../types/forecast';
import { FORECAST_UNITS_STORAGE_KEY } from '../config/forecast';
import { APP_ERROR_MESSAGES, AppError, RequestAbortedError, type AppErrorCode } from '../types/errors';
import type { Location } from '../types/location';
import { CurrentWeather } from './CurrentWeather';

const { mockGetForecast, mockGetAirQuality, mockSearchCities } = vi.hoisted(() => ({ mockGetForecast: vi.fn(), mockGetAirQuality: vi.fn(), mockSearchCities: vi.fn() }));
vi.mock('../services/forecast', () => ({ getForecast: mockGetForecast }));
vi.mock('../services/air-quality', () => ({ getAirQuality: mockGetAirQuality }));
vi.mock('../services/geocoding', () => ({ searchCities: mockSearchCities }));

const neiva: Location = { id: 1, name: 'Neiva', admin1: 'Huila', country: 'Colombia', latitude: 2.93, longitude: -75.28 };
const bogota: Location = { id: 2, name: 'Bogotá', admin1: 'Bogotá D.C.', country: 'Colombia', latitude: 4.71, longitude: -74.07 };

function forecast(
  overrides: Partial<ForecastData['current']> = {},
  units: ForecastData['units'] = { temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm' },
  schedule: { hourly?: HourlyForecast[]; daily?: DailyForecast[] } = {},
): ForecastData {
  return {
    location: { latitude: 2.93, longitude: -75.28, elevation: 442, timezone: 'America/Bogota', timezoneAbbreviation: '-05' },
    current: {
      time: '2026-09-24T10:00', temperature: 28.43782, apparentTemperature: 30.1, relativeHumidity: 67,
      precipitation: 0.4, weatherCode: 2, windSpeed: 12.04, windDirection: 145, uvIndex: 7, ...overrides,
    },
    hourly: schedule.hourly ?? [], daily: schedule.daily ?? [], units,
  };
}

function airQuality(): AirQualityData {
  const current = {
    time: '2026-09-24T10:00', usAqi: 42, pm25: 8.4, pm10: 15.3, ozone: 32,
    nitrogenDioxide: 4.5, sulphurDioxide: .9, carbonMonoxide: 180,
  };
  const units = {
    usAqi: 'USAQI', pm25: 'μg/m³', pm10: 'μg/m³', ozone: 'μg/m³',
    nitrogenDioxide: 'μg/m³', sulphurDioxide: 'μg/m³', carbonMonoxide: 'μg/m³',
  };
  return {
    location: { latitude: 2.93, longitude: -75.28, timezone: 'America/Bogota' },
    current,
    hourly: Array.from({ length: 24 }, (_, index) => ({
      ...current,
      time: `2026-09-24T${String(index).padStart(2, '0')}:00`,
    })),
    units: { current: units, hourly: units },
  };
}

function renderWeather(location: Location | null = neiva) {
  return render(<CurrentWeather activeLocation={location} />);
}

async function flushPromises() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function delayedForecast(data: ForecastData, delay: number): Promise<ForecastData> {
  return new Promise((resolve) => setTimeout(() => resolve(data), delay));
}

beforeEach(() => {
  localStorage.clear();
  mockGetForecast.mockReset().mockResolvedValue(forecast());
  mockGetAirQuality.mockReset().mockResolvedValue(airQuality());
  mockSearchCities.mockReset().mockResolvedValue([]);
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

describe('CurrentWeather', () => {
  it('presenta cuatro áreas de consulta y abre solo la elegida', async () => {
    renderWeather();
    await flushPromises();
    const navigation = screen.getByRole('navigation', { name: 'Áreas de consulta' });
    expect(within(navigation).getAllByRole('button')).toHaveLength(4);
    expect(within(navigation).getByRole('button', { name: 'Clima' }).getAttribute('aria-pressed')).toBe('true');
    expect(await screen.findByRole('region', { name: 'Clima actual' })).toBeTruthy();

    fireEvent.click(within(navigation).getByRole('button', { name: 'Históricos' }));
    expect(screen.getByRole('heading', { name: 'Históricos' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Clima actual' })).toBeNull();

    fireEvent.click(within(navigation).getByRole('button', { name: 'Calidad del aire' }));
    expect(screen.getByRole('heading', { name: 'Calidad del aire' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Históricos' })).toBeNull();

    fireEvent.click(within(navigation).getByRole('button', { name: 'Clima' }));
    expect(await screen.findByRole('region', { name: 'Clima actual' })).toBeTruthy();
  });

  it('sin ubicación no consulta ni muestra carga o error y mantiene un mensaje inicial', () => {
    renderWeather(null);
    expect(mockGetForecast).not.toHaveBeenCalled();
    expect(screen.getByText('Busca una ciudad o utiliza tu ubicación para consultar el clima.')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('no consulta cuando la ubicación tiene coordenadas inválidas', () => {
    renderWeather({ ...neiva, latitude: 91 });
    expect(mockGetForecast).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('consulta automáticamente las coordenadas activas y muestra loading accesible', async () => {
    mockGetForecast.mockImplementation(() => delayedForecast(forecast(), 20));
    renderWeather(neiva);
    expect(mockGetForecast).toHaveBeenCalledWith(
      { latitude: neiva.latitude, longitude: neiva.longitude, forecastDays: 7, temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm', model: 'best_match' },
      { signal: expect.any(AbortSignal) },
    );
    expect(screen.getByText('Consultando clima…', { selector: '[role="status"]' })).toBeTruthy();
    expect(await screen.findByRole('region', { name: 'Clima actual' })).toBeTruthy();
  });

  it('muestra todas las métricas actuales, unidad, condición, hora local y nombre de ciudad', async () => {
    renderWeather(neiva);
    await flushPromises();
    expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Clima actual' })).getByText('Neiva, Huila, Colombia')).toBeTruthy();
    expect(screen.getByText('28,4 °C')).toBeTruthy();
    expect(screen.getByText('30,1 °C')).toBeTruthy();
    expect(screen.getByText('67 %')).toBeTruthy();
    expect(screen.getByText('0,4 mm')).toBeTruthy();
    expect(screen.getByText('12 km/h')).toBeTruthy();
    expect(screen.getByText('145°')).toBeTruthy();
    expect(screen.getByText('7 — Alto')).toBeTruthy();
    expect(screen.getByText('Parcialmente nublado')).toBeTruthy();
    expect(screen.getByText('Actualizado: 10:00')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(document.querySelector('[data-icon-key="partly-cloudy"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('muestra elevación en metros y el día solar local actual con duración formateada', async () => {
    const day: DailyForecast = {
      date: '2026-09-25', weatherCode: 0, temperatureMax: 30, temperatureMin: 20,
      precipitationSum: 0, precipitationProbabilityMax: 0, windSpeedMax: 8, uvIndexMax: 2,
      sunrise: '2026-09-25T05:52', sunset: '2026-09-25T18:01', daylightDuration: 43_740,
    };
    mockGetForecast.mockResolvedValue(forecast({}, undefined, { daily: [day] }));
    renderWeather();
    await flushPromises();
    expect(screen.getByText('Elevación: 442 m s. n. m.')).toBeTruthy();
    expect(screen.getAllByText('05:52')).toHaveLength(2);
    expect(screen.getAllByText('18:01')).toHaveLength(2);
    expect(screen.getAllByText('12 h 9 min')).toHaveLength(2);
  });

  it.each([null, 0])('maneja elevación %s sin afectar clima ni pronóstico', async (elevation) => {
    const data = forecast();
    data.location.elevation = elevation;
    mockGetForecast.mockResolvedValue(data);
    renderWeather();
    await flushPromises();
    expect(screen.getByText(elevation === null ? 'Elevación: no disponible' : 'Elevación: 0 m s. n. m.')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
  });

  it('muestra el aviso de elevación estimada y sunrise/sunset ausentes sin romper la tarjeta', async () => {
    const day: DailyForecast = {
      date: '2026-09-25', weatherCode: 0, temperatureMax: 30, temperatureMin: 20,
      precipitationSum: 0, precipitationProbabilityMax: 0, windSpeedMax: 8, uvIndexMax: 2,
      sunrise: null, sunset: null, daylightDuration: null,
    };
    const data = forecast({}, undefined, { daily: [day] });
    data.location.elevation = Number.NaN;
    mockGetForecast.mockResolvedValue(data);
    renderWeather();
    await flushPromises();
    expect(screen.getByText('Elevación: no disponible')).toBeTruthy();
    expect(screen.getByText(/modelo de terreno de Open-Meteo/)).toBeTruthy();
    expect(screen.getAllByText('No disponible').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
  });

  it('permite incluir en la comparación la ubicación activa de RF-03', async () => {
    const gps: Location = { id: 'geolocation', name: 'Mi ubicación', latitude: 4.71, longitude: -74.07, source: 'geolocation' };
    renderWeather(gps);
    fireEvent.click(screen.getByRole('button', { name: 'Comparar ciudades' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar ubicación seleccionada (Mi ubicación)' }));
    expect(screen.getByRole('button', { name: 'Quitar Mi ubicación de la comparación' })).toBeTruthy();
    expect(screen.getByText('Agregue al menos dos ciudades para comparar.')).toBeTruthy();
  });

  it('confirma la ciudad agregada, actualiza el contador y limpia el buscador', async () => {
    mockSearchCities.mockResolvedValue([bogota]);
    renderWeather(neiva);
    await flushPromises();
    fireEvent.click(screen.getByRole('button', { name: 'Comparar ciudades' }));

    const search = screen.getByRole('combobox', { name: 'Nombre de la ciudad' });
    fireEvent.change(search, { target: { value: 'Bogotá' } });
    const option = await screen.findByRole('option', { name: /Bogotá.*Bogotá D\.C\., Colombia/ }, { timeout: 1500 });
    fireEvent.click(option);

    expect(await screen.findByText('Bogotá se agregó a la comparación (1 de 4).')).toBeTruthy();
    expect(screen.getByText('1 de 4 ubicaciones agregadas')).toBeTruthy();
    expect((screen.getByRole('combobox', { name: 'Nombre de la ciudad' }) as HTMLInputElement).value).toBe('');
    expect(screen.getByText('Bogotá', { selector: '.city-comparison__locations li span' })).toBeTruthy();
  });

  it('usa unidades normalizadas para Fahrenheit, mph e pulgadas', async () => {
    mockGetForecast.mockResolvedValue(forecast({}, { temperature: 'fahrenheit', windSpeed: 'mph', precipitation: 'inch' }));
    renderWeather();
    await flushPromises();
    expect(screen.getByText('28,4 °F')).toBeTruthy();
    expect(screen.getByText('12 mph')).toBeTruthy();
    expect(screen.getByText('0,4 in')).toBeTruthy();
  });

  it('muestra valores predeterminados, controles etiquetados y opciones avanzadas cerradas', async () => {
    renderWeather();
    await flushPromises();
    expect((screen.getByLabelText('Temperatura') as HTMLSelectElement).value).toBe('celsius');
    expect((screen.getByLabelText('Viento') as HTMLSelectElement).value).toBe('kmh');
    expect((screen.getByLabelText('Precipitación') as HTMLSelectElement).value).toBe('mm');
    expect((screen.getByLabelText('Días de pronóstico') as HTMLInputElement).value).toBe('7');
    expect((screen.getByText('Opciones avanzadas').closest('details') as HTMLDetailsElement).open).toBe(false);
    expect(screen.getByText('Modelo: Automático')).toBeTruthy();
    expect(mockGetForecast.mock.calls[0]?.[0]).toMatchObject({ temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm', model: 'best_match' });
  });

  it('cada selector de unidades realiza un request con la nueva configuración y conserva contexto', async () => {
    mockGetForecast.mockImplementation((params: ForecastParams) => Promise.resolve(forecast({}, {
      temperature: params.temperatureUnit ?? 'celsius',
      windSpeed: params.windSpeedUnit ?? 'kmh',
      precipitation: params.precipitationUnit ?? 'mm',
    })));
    renderWeather();
    await flushPromises();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Días de pronóstico' }), { target: { value: '10' } });
    await flushPromises();
    fireEvent.click(screen.getByRole('button', { name: 'Horario' }));
    fireEvent.change(screen.getByLabelText('Temperatura'), { target: { value: 'fahrenheit' } });
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ latitude: neiva.latitude, longitude: neiva.longitude, forecastDays: 10, temperatureUnit: 'fahrenheit', model: 'best_match' });
    expect(screen.getByText('28,4 °F')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Horario' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.change(screen.getByLabelText('Viento'), { target: { value: 'mph' } });
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ windSpeedUnit: 'mph', temperatureUnit: 'fahrenheit', precipitationUnit: 'mm', forecastDays: 10 });
    expect(screen.getByText('12 mph')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Precipitación'), { target: { value: 'inch' } });
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ precipitationUnit: 'inch', temperatureUnit: 'fahrenheit', windSpeedUnit: 'mph', forecastDays: 10 });
    expect(screen.getByText('0,4 in')).toBeTruthy();
    expect(screen.getByText('Elevación: 442 m s. n. m.')).toBeTruthy();
  });

  it('persiste solo unidades y las restaura al montar nuevamente', async () => {
    localStorage.setItem(FORECAST_UNITS_STORAGE_KEY, JSON.stringify({ temperature: 'fahrenheit', windSpeed: 'mph', precipitation: 'inch' }));
    mockGetForecast.mockImplementation((params: ForecastParams) => Promise.resolve(forecast({}, {
      temperature: params.temperatureUnit ?? 'celsius', windSpeed: params.windSpeedUnit ?? 'kmh', precipitation: params.precipitationUnit ?? 'mm',
    })));
    const first = renderWeather();
    await flushPromises();
    expect(mockGetForecast.mock.calls[0]?.[0]).toMatchObject({ temperatureUnit: 'fahrenheit', windSpeedUnit: 'mph', precipitationUnit: 'inch' });
    expect((screen.getByLabelText('Temperatura') as HTMLSelectElement).value).toBe('fahrenheit');
    expect(localStorage.length).toBe(1);
    expect(localStorage.key(0)).toBe(FORECAST_UNITS_STORAGE_KEY);
    expect(localStorage.getItem(FORECAST_UNITS_STORAGE_KEY)).not.toContain('Neiva');
    first.unmount();
    renderWeather();
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ temperatureUnit: 'fahrenheit', windSpeedUnit: 'mph', precipitationUnit: 'inch' });
  });

  it('descarta unidades inválidas guardadas y usa defaults', async () => {
    localStorage.setItem(FORECAST_UNITS_STORAGE_KEY, JSON.stringify({ temperature: 'kelvin', windSpeed: 'mach', precipitation: 'litros' }));
    renderWeather();
    await flushPromises();
    expect((screen.getByLabelText('Temperatura') as HTMLSelectElement).value).toBe('celsius');
    expect((screen.getByLabelText('Viento') as HTMLSelectElement).value).toBe('kmh');
    expect((screen.getByLabelText('Precipitación') as HTMLSelectElement).value).toBe('mm');
    expect(mockGetForecast.mock.calls[0]?.[0]).toMatchObject({ temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm' });
  });

  it('al leer una preferencia válida conserva únicamente los tres campos de unidades', async () => {
    localStorage.setItem(FORECAST_UNITS_STORAGE_KEY, JSON.stringify({
      temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm', location: neiva, model: 'ecmwf_ifs025',
    }));
    renderWeather();
    await flushPromises();
    expect(localStorage.getItem(FORECAST_UNITS_STORAGE_KEY)).toBe(JSON.stringify({ temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm' }));
  });

  it('sigue funcionando si localStorage no permite leer ni escribir', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('blocked'); });
    renderWeather();
    await flushPromises();
    expect(mockGetForecast).toHaveBeenCalledTimes(1);
    expect(mockGetForecast.mock.calls[0]?.[0]).toMatchObject({ temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm' });
    expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
  });

  it('muestra un error al fallar el cambio de unidades sin etiquetar datos previos con la unidad nueva', async () => {
    mockGetForecast.mockResolvedValueOnce(forecast());
    mockGetForecast.mockRejectedValueOnce(new AppError('E-01'));
    mockGetForecast.mockResolvedValue(forecast({}, { temperature: 'fahrenheit', windSpeed: 'kmh', precipitation: 'mm' }));
    renderWeather();
    await flushPromises();
    fireEvent.change(screen.getByLabelText('Temperatura'), { target: { value: 'fahrenheit' } });
    await flushPromises();
    expect(screen.getByRole('alert').textContent).toContain(APP_ERROR_MESSAGES['E-01']);
    expect(screen.queryByText('28,4 °C')).toBeNull();
    expect((screen.getByLabelText('Temperatura') as HTMLSelectElement).value).toBe('fahrenheit');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ temperatureUnit: 'fahrenheit' });
    expect(screen.getByText('28,4 °F')).toBeTruthy();
  });

  it('cambia modelo en Opciones avanzadas y conserva ubicación, unidades, días y vista', async () => {
    renderWeather();
    await flushPromises();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Días de pronóstico' }), { target: { value: '10' } });
    await flushPromises();
    fireEvent.click(screen.getByRole('button', { name: 'Horario' }));
    fireEvent.change(screen.getByLabelText('Temperatura'), { target: { value: 'fahrenheit' } });
    await flushPromises();
    fireEvent.click(screen.getByText('Opciones avanzadas'));
    const modelControl = screen.getByLabelText('Modelo numérico');
    expect((modelControl as HTMLSelectElement).options.length).toBe(4);
    fireEvent.change(modelControl, { target: { value: 'ncep_gfs_seamless' } });
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ latitude: neiva.latitude, longitude: neiva.longitude, forecastDays: 10, temperatureUnit: 'fahrenheit', windSpeedUnit: 'kmh', precipitationUnit: 'mm', model: 'ncep_gfs_seamless' });
    expect(screen.getByText('Modelo: GFS')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Horario' }).getAttribute('aria-pressed')).toBe('true');
    expect(localStorage.getItem(FORECAST_UNITS_STORAGE_KEY)).not.toContain('ncep_gfs_seamless');
  });

  it('restablece Automático tras HTTP 400 de un modelo sin repetir el fallo ni persistir el modelo', async () => {
    mockGetForecast.mockResolvedValueOnce(forecast());
    mockGetForecast.mockRejectedValueOnce(new AppError('E-04'));
    mockGetForecast.mockResolvedValueOnce(forecast());
    renderWeather();
    await flushPromises();
    fireEvent.click(screen.getByText('Opciones avanzadas'));
    fireEvent.change(screen.getByLabelText('Modelo numérico'), { target: { value: 'ecmwf_ifs025' } });
    await flushPromises();
    await flushPromises();
    expect(mockGetForecast).toHaveBeenCalledTimes(3);
    expect(mockGetForecast.mock.calls[1]?.[0].model).toBe('ecmwf_ifs025');
    expect(mockGetForecast.mock.calls[2]?.[0].model).toBe('best_match');
    expect(screen.getByText('Modelo: Automático')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
    expect(localStorage.getItem(FORECAST_UNITS_STORAGE_KEY)).not.toContain('ecmwf_ifs025');
  });

  it('al cambiar de modelo actualiza solo el resultado más reciente y el modelo se reinicia al montar', async () => {
    const outdated = forecast({ temperature: 99 });
    const current = forecast({ temperature: 21 });
    mockGetForecast.mockResolvedValueOnce(forecast()).mockImplementationOnce(() => delayedForecast(outdated, 40)).mockResolvedValueOnce(current);
    const view = renderWeather();
    await flushPromises();
    fireEvent.click(screen.getByText('Opciones avanzadas'));
    fireEvent.change(screen.getByLabelText('Modelo numérico'), { target: { value: 'icon_seamless' } });
    const signal = mockGetForecast.mock.calls.at(-1)?.[1].signal as AbortSignal;
    fireEvent.change(screen.getByLabelText('Modelo numérico'), { target: { value: 'ecmwf_ifs025' } });
    expect(signal.aborted).toBe(true);
    await flushPromises();
    expect(screen.getByText('Modelo: ECMWF')).toBeTruthy();
    expect(screen.getByText('21 °C')).toBeTruthy();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(screen.queryByText('99 °C')).toBeNull();
    view.unmount();
    renderWeather();
    await flushPromises();
    expect(screen.getByText('Modelo: Automático')).toBeTruthy();
    expect(mockGetForecast.mock.calls.at(-1)?.[0].model).toBe('best_match');
  });

  it.each([
    [2, 'Bajo'], [4, 'Moderado'], [6, 'Alto'], [9, 'Muy alto'], [11, 'Extremo'],
  ])('muestra la categoría UV %i como %s', async (uvIndex, category) => {
    mockGetForecast.mockResolvedValue(forecast({ uvIndex }));
    renderWeather();
    await flushPromises();
    expect(screen.getByText(`${uvIndex} — ${category}`)).toBeTruthy();
  });

  it('muestra N/D para valores nulos sin ocultar las demás métricas', async () => {
    mockGetForecast.mockResolvedValue(forecast({
      temperature: null, apparentTemperature: null, relativeHumidity: null,
      precipitation: null, windSpeed: null, windDirection: null, uvIndex: null,
    }));
    renderWeather();
    await flushPromises();
    expect(screen.getAllByText('N/D').length).toBe(7);
    expect(screen.getByText('Parcialmente nublado')).toBeTruthy();
  });

  it('muestra el fallback textual y el icono neutro para código WMO desconocido', async () => {
    mockGetForecast.mockResolvedValue(forecast({ weatherCode: 123 }));
    renderWeather();
    await flushPromises();
    expect(screen.getByText('Condición no disponible')).toBeTruthy();
    expect(document.querySelector('[data-icon-key="unavailable"] svg')).toBeTruthy();
  });

  it('presenta la ubicación geolocalizada sin crear un flujo Forecast distinto', async () => {
    const gpsLocation: Location = { id: 'geolocation', name: 'Mi ubicación', latitude: 2.93, longitude: -75.28, source: 'geolocation' };
    renderWeather(gpsLocation);
    await flushPromises();
    expect(mockGetForecast).toHaveBeenCalledTimes(1);
    expect(mockGetForecast).toHaveBeenCalledWith({ latitude: 2.93, longitude: -75.28, forecastDays: 7, temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm', model: 'best_match' }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(within(screen.getByRole('region', { name: 'Clima actual' })).getByText('Mi ubicación (2.93, -75.28)')).toBeTruthy();
  });

  it.each(['E-01', 'E-02', 'E-03', 'E-04', 'E-05'] as AppErrorCode[])(
    'muestra el mensaje seguro %s y permite reintentar para la ubicación activa', async (code) => {
      mockGetForecast.mockRejectedValueOnce(new AppError(code, { reason: 'detalle privado' }));
      renderWeather(neiva);
      await flushPromises();
      expect(screen.getByRole('alert').textContent).toContain(APP_ERROR_MESSAGES[code]);
      expect(screen.getByRole('alert').textContent).not.toContain('detalle privado');
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      await flushPromises();
      expect(mockGetForecast).toHaveBeenCalledTimes(2);
      expect(mockGetForecast.mock.calls[1]?.[0]).toEqual({ latitude: neiva.latitude, longitude: neiva.longitude, forecastDays: 7, temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm', model: 'best_match' });
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
    },
  );

  it('cancela la consulta anterior y mantiene solo los datos de la ubicación más reciente', async () => {
    mockGetForecast.mockImplementation(() => mockGetForecast.mock.calls.length === 1
      ? delayedForecast(forecast({ temperature: 29 }), 60)
      : delayedForecast(forecast({ temperature: 18 }), 10));
    const view = renderWeather(neiva);
    const firstSignal = mockGetForecast.mock.calls[0]?.[1].signal as AbortSignal;
    view.rerender(<CurrentWeather activeLocation={bogota} />);
    const secondSignal = mockGetForecast.mock.calls[1]?.[1].signal as AbortSignal;
    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);
    expect(screen.getByText('Consultando clima…', { selector: '[role="status"]' })).toBeTruthy();
    expect(screen.queryByText('28,4 °C')).toBeNull();
    await screen.findByText('18 °C');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 70)); });
    expect(within(screen.getByRole('region', { name: 'Clima actual' })).getByText('Bogotá, Bogotá D.C., Colombia')).toBeTruthy();
    expect(screen.getByText('18 °C')).toBeTruthy();
    expect(screen.getByText('18 °C')).toBeTruthy();
    expect(screen.queryByText('29 °C')).toBeNull();
  });

  it('no permite que una respuesta anterior reemplace un nuevo resultado aunque la promesa anterior termine tarde', async () => {
    mockGetForecast.mockImplementation(() => mockGetForecast.mock.calls.length === 1
      ? delayedForecast(forecast({ temperature: 29 }), 60)
      : delayedForecast(forecast({ temperature: 19 }), 10));
    const view = renderWeather(neiva);
    view.rerender(<CurrentWeather activeLocation={bogota} />);
    await screen.findByText('19 °C');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 70)); });
    expect(within(screen.getByRole('region', { name: 'Clima actual' })).getByText('Bogotá, Bogotá D.C., Colombia')).toBeTruthy();
    expect(screen.getByText('19 °C')).toBeTruthy();
    expect(screen.queryByText('29 °C')).toBeNull();
  });

  it('ignora la cancelación intencional sin mostrar error', async () => {
    mockGetForecast.mockRejectedValueOnce(new RequestAbortedError());
    renderWeather();
    await flushPromises();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('cancela la consulta al desmontarse', async () => {
    mockGetForecast.mockImplementation(() => delayedForecast(forecast(), 20));
    const view = renderWeather();
    const signal = mockGetForecast.mock.calls[0]?.[1].signal as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 30));
  });

  it('conserva los valores del objeto normalizado y solo formatea la presentación', async () => {
    const data = forecast();
    mockGetForecast.mockResolvedValue(data);
    renderWeather();
    await flushPromises();
    expect(data.current.temperature).toBe(28.43782);
    expect(data.current.windSpeed).toBe(12.04);
  });

  it('inicia con siete días y permite seleccionar entre uno y dieciséis', async () => {
    renderWeather();
    await flushPromises();
    const days = screen.getByRole('spinbutton', { name: 'Días de pronóstico' }) as HTMLInputElement;
    expect(days.value).toBe('7');
    expect(days.min).toBe('1');
    expect(days.max).toBe('16');
    fireEvent.change(days, { target: { value: '1' } });
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ latitude: neiva.latitude, longitude: neiva.longitude, forecastDays: 1 });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Días de pronóstico' }), { target: { value: '16' } });
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ latitude: neiva.latitude, longitude: neiva.longitude, forecastDays: 16 });
  });

  it.each([['0', 1], ['17', 16], ['-1', 1], ['100', 16], ['NaN', 7]])(
    'rechaza el rango inválido %s sin enviarlo a Forecast', async (value, expectedDays) => {
      renderWeather();
      await flushPromises();
      fireEvent.change(screen.getByRole('spinbutton', { name: 'Días de pronóstico' }), { target: { value } });
      expect(screen.getByRole('alert').textContent).toBe('El pronóstico admite entre 1 y 16 días.');
      await flushPromises();
      expect(mockGetForecast.mock.calls.every(([params]) => params.forecastDays !== Number(value))).toBe(true);
      expect((screen.getByRole('spinbutton', { name: 'Días de pronóstico' }) as HTMLInputElement).value).toBe(String(expectedDays));
    },
  );

  it('cambia entre las vistas diaria y horaria sin volver a consultar', async () => {
    const daily: DailyForecast = {
      date: '2026-09-25', weatherCode: 2, temperatureMax: 29.2, temperatureMin: 20,
      precipitationSum: 3.2, precipitationProbabilityMax: 65, windSpeedMax: 18, uvIndexMax: 7,
      sunrise: null, sunset: null, daylightDuration: null,
    };
    const hourly: HourlyForecast = {
      time: '2026-09-25T14:00', temperature: 28, apparentTemperature: 30, precipitationProbability: 40,
      precipitation: 0.2, windSpeed: 12, uvIndex: 7, weatherCode: 2,
    };
    mockGetForecast.mockResolvedValue(forecast({}, undefined, { daily: [daily], hourly: [hourly] }));
    renderWeather();
    await flushPromises();
    expect(mockGetForecast).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Pronóstico diario' })).toBeTruthy();
    expect(screen.getByText('29,2 °C')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Diario' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Horario' }));
    expect(screen.getByRole('heading', { name: 'Pronóstico horario' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Pronóstico horario' })).getByText('14:00')).toBeTruthy();
    expect(screen.getByText('Sensación')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Horario' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Diario' }).getAttribute('aria-pressed')).toBe('false');
    expect(mockGetForecast).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Diario' }));
    expect(screen.getByRole('heading', { name: 'Pronóstico diario' })).toBeTruthy();
    expect(mockGetForecast).toHaveBeenCalledTimes(1);
  });

  it('presenta daily/hourly agrupados por fecha, valores nulos como N/D y fallback WMO', async () => {
    const daily: DailyForecast = {
      date: '2026-09-25', weatherCode: 404, temperatureMax: null, temperatureMin: 20,
      precipitationSum: null, precipitationProbabilityMax: null, windSpeedMax: 18, uvIndexMax: null,
      sunrise: null, sunset: null, daylightDuration: null,
    };
    const hourly: HourlyForecast[] = [
      { time: '2026-09-25T08:00', temperature: null, apparentTemperature: 20, precipitationProbability: null, precipitation: 0, windSpeed: 5, uvIndex: null, weatherCode: 404 },
      { time: '2026-09-25T09:00', temperature: 21, apparentTemperature: null, precipitationProbability: 30, precipitation: null, windSpeed: null, uvIndex: 2, weatherCode: 0 },
      { time: '2026-09-26T09:00', temperature: 22, apparentTemperature: 22, precipitationProbability: 0, precipitation: 0, windSpeed: 2, uvIndex: 1, weatherCode: 0 },
    ];
    mockGetForecast.mockResolvedValue(forecast({}, undefined, { daily: [daily], hourly }));
    renderWeather();
    await flushPromises();
    expect(screen.getByText('Viernes')).toBeTruthy();
    expect(screen.getByText('25/09/2026')).toBeTruthy();
    expect(screen.getByText('Condición no disponible')).toBeTruthy();
    expect(screen.getByText('20 °C')).toBeTruthy();
    expect(screen.getAllByText('N/D').length).toBeGreaterThanOrEqual(4);
    fireEvent.click(screen.getByRole('button', { name: 'Horario' }));
    expect(screen.getByRole('heading', { name: 'Viernes 25/09/2026' })).toBeTruthy();
    expect(screen.getByText('08:00')).toBeTruthy();
    expect(screen.getAllByText('09:00')).toHaveLength(2);
    expect(screen.queryByText('26/09/2026')).toBeNull();
  });

  it('cambio de rango invalida respuesta previa y conserva ubicación y vista', async () => {
    const oldData = forecast({ temperature: 99 });
    const newData = forecast({ temperature: 33 });
    mockGetForecast.mockImplementation(() => mockGetForecast.mock.calls.length === 1 ? delayedForecast(oldData, 60) : delayedForecast(newData, 5));
    renderWeather();
    const firstSignal = mockGetForecast.mock.calls[0]?.[1].signal as AbortSignal;
    fireEvent.click(screen.getByRole('button', { name: 'Horario' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Días de pronóstico' }), { target: { value: '3' } });
    expect(firstSignal.aborted).toBe(true);
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ latitude: neiva.latitude, longitude: neiva.longitude, forecastDays: 3 });
    expect(screen.getByText('Consultando clima…', { selector: '[role="status"]' })).toBeTruthy();
    await screen.findByRole('heading', { name: 'Pronóstico horario' });
    await screen.findByText('33 °C');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 70)); });
    expect(within(screen.getByRole('region', { name: 'Clima actual' })).getByText('Neiva, Huila, Colombia')).toBeTruthy();
    expect(screen.queryByText('99 °C')).toBeNull();
    expect(screen.getByRole('button', { name: 'Horario' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('cambios rápidos de rango dejan vigente solo la última consulta', async () => {
    mockGetForecast.mockImplementation((params?: { forecastDays?: number }) => {
      const requestedDays = params?.forecastDays ?? 7;
      return delayedForecast(forecast({ temperature: requestedDays }), requestedDays === 5 ? 5 : 45);
    });
    renderWeather();
    const signals: AbortSignal[] = [mockGetForecast.mock.calls[0]?.[1].signal as AbortSignal];
      const daysControl = screen.getByRole('spinbutton', { name: 'Días de pronóstico' });
    for (const days of ['10', '14', '5']) {
      fireEvent.change(daysControl, { target: { value: days } });
      signals.push(mockGetForecast.mock.calls.at(-1)?.[1].signal as AbortSignal);
    }
    expect(mockGetForecast).toHaveBeenCalledTimes(4);
    expect(mockGetForecast.mock.calls.map(([params]) => params.forecastDays)).toEqual([7, 10, 14, 5]);
    expect(signals.slice(0, 3).every((signal) => signal.aborted)).toBe(true);
    await screen.findByText('5 °C');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 55)); });
    expect(screen.queryByText('7 °C')).toBeNull();
    expect(screen.queryByText('10 °C')).toBeNull();
    expect(screen.queryByText('14 °C')).toBeNull();
  });

  it('el reintento conserva el rango actual', async () => {
    mockGetForecast.mockResolvedValueOnce(forecast()).mockRejectedValueOnce(new AppError('E-01')).mockResolvedValue(forecast());
    renderWeather();
    await flushPromises();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Días de pronóstico' }), { target: { value: '3' } });
    await flushPromises();
    expect(screen.getByRole('alert').textContent).toContain(APP_ERROR_MESSAGES['E-01']);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ latitude: neiva.latitude, longitude: neiva.longitude, forecastDays: 3 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('conserva el rango y la vista diaria al cambiar de ubicación', async () => {
    const view = renderWeather();
    await flushPromises();
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Días de pronóstico' }), { target: { value: '10' } });
    await flushPromises();
    fireEvent.click(screen.getByRole('button', { name: 'Horario' }));
    view.rerender(<CurrentWeather activeLocation={bogota} />);
    await flushPromises();
    expect(mockGetForecast.mock.calls.at(-1)?.[0]).toMatchObject({ latitude: bogota.latitude, longitude: bogota.longitude, forecastDays: 10 });
    expect(screen.getByRole('button', { name: 'Horario' }).getAttribute('aria-pressed')).toBe('true');
    view.unmount();
  });

  it('muestra un estado controlado cuando la colección activa está vacía sin ocultar clima actual', async () => {
    mockGetForecast.mockResolvedValue(forecast());
    renderWeather();
    await flushPromises();
    expect(screen.getByText('No hay pronóstico diario disponible para esta ubicación.')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Horario' }));
    expect(screen.getByText('No hay pronóstico horario disponible para esta ubicación.')).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
  });

  it('puede mostrar horas agrupadas aunque la colección diaria esté vacía', async () => {
    const hour: HourlyForecast = { time: '2026-09-25T14:00', temperature: 22, apparentTemperature: 22, precipitationProbability: null, precipitation: null, windSpeed: null, uvIndex: null, weatherCode: 0 };
    mockGetForecast.mockResolvedValue(forecast({}, undefined, { hourly: [hour] }));
    renderWeather();
    await flushPromises();
    fireEvent.click(screen.getByRole('button', { name: 'Horario' }));
    expect(within(screen.getByRole('region', { name: 'Pronóstico horario' })).getByText('14:00')).toBeTruthy();
    expect(screen.getByText('Prob. lluvia').parentElement?.textContent).toContain('N/D');
  });
});
