// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ForecastData, ForecastParams } from '../types/forecast';
import { APP_ERROR_MESSAGES, AppError, type AppErrorCode } from '../types/errors';
import type { Location } from '../types/location';
import { CityComparison } from './CityComparison';

const { mockGetForecast } = vi.hoisted(() => ({ mockGetForecast: vi.fn() }));
vi.mock('../services/forecast', () => ({ getForecast: mockGetForecast }));

const neiva: Location = { id: 11, name: 'Neiva', admin1: 'Huila', country: 'Colombia', latitude: 2.93, longitude: -75.28 };
const bogota: Location = { id: 12, name: 'Bogotá', admin1: 'Cundinamarca', country: 'Colombia', latitude: 4.71, longitude: -74.07 };
const medellin: Location = { id: 13, name: 'Medellín', admin1: 'Antioquia', country: 'Colombia', latitude: 6.25, longitude: -75.56 };
const cali: Location = { id: 14, name: 'Cali', admin1: 'Valle del Cauca', country: 'Colombia', latitude: 3.45, longitude: -76.53 };
const celsius = { temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm' } as const;
const fahrenheit = { temperature: 'fahrenheit', windSpeed: 'mph', precipitation: 'inch' } as const;

function forecast(params: ForecastParams, overrides: Partial<ForecastData['current']> = {}, elevation = 442): ForecastData {
  return {
    location: { latitude: params.latitude, longitude: params.longitude, elevation, timezone: 'America/Bogota', timezoneAbbreviation: '-05' },
    current: {
      time: '2026-09-25T16:00', temperature: 28.4, apparentTemperature: 30.1, relativeHumidity: 67,
      precipitation: 0.4, weatherCode: 2, windSpeed: 12.3, windDirection: 145, uvIndex: 7, ...overrides,
    },
    hourly: [],
    daily: [{ date: '2026-09-25', weatherCode: 2, temperatureMax: 31, temperatureMin: 20, precipitationSum: 3.2,
      precipitationProbabilityMax: 65, windSpeedMax: 18, uvIndexMax: 7, sunrise: null, sunset: null, daylightDuration: null }],
    units: params.temperatureUnit === 'fahrenheit' ? fahrenheit : celsius,
  };
}

function renderComparison(locations: Location[], props: Partial<Parameters<typeof CityComparison>[0]> = {}) {
  return render(<CityComparison locations={locations} forecastDays={props.forecastDays ?? 7} units={props.units ?? celsius} model={props.model ?? 'best_match'} onRemove={props.onRemove ?? vi.fn()} onUnsupportedModel={props.onUnsupportedModel} />);
}

async function flushPromises() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  mockGetForecast.mockReset().mockImplementation((params: ForecastParams) => Promise.resolve(forecast(params)));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('CityComparison', () => {
  it('con dos a cuatro ubicaciones dispara requests simultáneos con una configuración común', () => {
    mockGetForecast.mockImplementation(() => new Promise(() => undefined));
    renderComparison([neiva, bogota, medellin, cali], { forecastDays: 5, units: fahrenheit, model: 'ncep_gfs_seamless' });
    expect(mockGetForecast).toHaveBeenCalledTimes(4);
    const calls = mockGetForecast.mock.calls as unknown as [ForecastParams, { signal: AbortSignal }][];
    expect(calls.map(([params]) => [params.latitude, params.longitude])).toEqual([
      [neiva.latitude, neiva.longitude], [bogota.latitude, bogota.longitude], [medellin.latitude, medellin.longitude], [cali.latitude, cali.longitude],
    ]);
    for (const [params, options] of calls) {
      expect(params).toMatchObject({ forecastDays: 5, temperatureUnit: 'fahrenheit', windSpeedUnit: 'mph', precipitationUnit: 'inch', model: 'ncep_gfs_seamless' });
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('presenta mínimo de ciudades y tabla semántica con current, hora local y elevación', async () => {
    renderComparison([neiva, bogota]);
    await flushPromises();
    const table = screen.getByRole('table', { name: /Clima actual por ciudad/ });
    expect(table.querySelector('caption')?.textContent).toContain('Clima actual');
    expect([...table.querySelectorAll('thead th')].map((header) => header.textContent)).toEqual(['Variable', 'Neiva', 'Bogotá']);
    expect(screen.getByRole('rowheader', { name: 'Temperatura' })).toBeTruthy();
    expect(screen.getAllByText('28,4 °C')).toHaveLength(2);
    expect(screen.getAllByText('16:00').length).toBe(2);
    expect(screen.getAllByText('442 m s. n. m.').length).toBe(2);
    expect(screen.queryByText('Existe una diferencia importante de altitud entre las ciudades comparadas; la altitud puede influir en la temperatura.')).toBeNull();
  });

  it('muestra resumen diario con fechas, máximas, mínimas, precipitación, viento y UV', async () => {
    mockGetForecast.mockImplementation((params: ForecastParams) => Promise.resolve(forecast(params, {}, params.latitude === neiva.latitude ? 100 : 401)));
    renderComparison([neiva, bogota]);
    await flushPromises();
    expect(screen.getByRole('heading', { name: 'Pronóstico diario comparado' })).toBeTruthy();
    expect(screen.getByRole('table', { name: 'Pronóstico del día 1' })).toBeTruthy();
    expect(screen.getAllByText('Viernes 25/09/2026')).toHaveLength(2);
    expect(screen.getAllByText('31 °C').length).toBe(2);
    expect(screen.getAllByText('20 °C').length).toBe(2);
    expect(screen.getAllByText('3,2 mm').length).toBe(2);
    expect(screen.getAllByText('65 %').length).toBe(2);
    expect(screen.getAllByText('18 km/h').length).toBe(2);
    expect(screen.getAllByText('7 — Alto').length).toBe(4);
    expect(screen.getByRole('note').textContent).toContain('diferencia importante de altitud');
  });

  it('muestra N/D para variables nulas sin ocultar la ciudad ni el resto de filas', async () => {
    mockGetForecast.mockImplementation((params: ForecastParams) => Promise.resolve(forecast(params, { temperature: null, uvIndex: null, relativeHumidity: null })));
    renderComparison([neiva, bogota]);
    await flushPromises();
    expect(screen.getAllByText('N/D').length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByRole('columnheader', { name: 'Neiva' })).toHaveLength(2);
    expect(screen.getByRole('rowheader', { name: 'Sensación térmica' })).toBeTruthy();
  });

  it('muestra elevaciones ausentes sin calcular diferencia con menos de dos valores', async () => {
    mockGetForecast.mockImplementation((params: ForecastParams) => Promise.resolve(forecast(params, {}, params.latitude === neiva.latitude ? 400 : Number.NaN)));
    renderComparison([neiva, bogota]);
    await flushPromises();
    expect(screen.getByText('no disponible')).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
    expect(screen.getByRole('table', { name: /Clima actual/ })).toBeTruthy();
  });

  it.each(['E-01', 'E-02', 'E-03', 'E-04', 'E-05'] as AppErrorCode[])('aísla %s a su ciudad y permite reintentar solo esa ciudad', async (code) => {
    mockGetForecast.mockImplementation((params: ForecastParams) => params.latitude === bogota.latitude
      ? Promise.reject(new AppError(code))
      : Promise.resolve(forecast(params)));
    renderComparison([neiva, bogota, medellin]);
    await flushPromises();
    expect(await screen.findByText(`Bogotá: ${APP_ERROR_MESSAGES[code]}`)).toBeTruthy();
    expect(screen.getAllByText('28,4 °C')).toHaveLength(2);
    expect(screen.getAllByText('Medellín').length).toBeGreaterThan(0);
    mockGetForecast.mockImplementation((params: ForecastParams) => Promise.resolve(forecast(params)));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar Bogotá' }));
    await waitFor(() => expect(mockGetForecast).toHaveBeenCalledTimes(4));
    expect(mockGetForecast.mock.calls[3]?.[0].latitude).toBe(bogota.latitude);
    await flushPromises();
    expect(screen.queryByText(`Bogotá: ${APP_ERROR_MESSAGES[code]}`)).toBeNull();
    expect(screen.getAllByText('28,4 °C')).toHaveLength(3);
  });

  it('mantiene resultados correctos al cambiar configuración y no actualiza una ciudad removida', async () => {
    const onRemove = vi.fn();
    mockGetForecast.mockImplementation((params: ForecastParams) => Promise.resolve(forecast(params)));
    const view = renderComparison([neiva, bogota], { onRemove });
    await flushPromises();
    expect(screen.getAllByText('28,4 °C')).toHaveLength(2);
    view.rerender(<CityComparison locations={[neiva, bogota]} forecastDays={10} units={fahrenheit} model="ecmwf_ifs025" onRemove={onRemove} />);
    expect(screen.queryByText('28,4 °C')).toBeNull();
    await flushPromises();
    expect(mockGetForecast).toHaveBeenCalledTimes(4);
    expect(screen.getAllByText('28,4 °F')).toHaveLength(2);
    expect(mockGetForecast.mock.calls.slice(2).map(([params]) => params.model)).toEqual(['ecmwf_ifs025', 'ecmwf_ifs025']);

    let resolveBogota!: (value: ForecastData) => void;
    mockGetForecast.mockImplementation((params: ForecastParams) => params.latitude === bogota.latitude
      ? new Promise<ForecastData>((resolve) => { resolveBogota = resolve; })
      : Promise.resolve(forecast(params)));
    view.rerender(<CityComparison locations={[neiva, bogota]} forecastDays={11} units={fahrenheit} model="ecmwf_ifs025" onRemove={onRemove} />);
    expect(onRemove).not.toHaveBeenCalled();
    view.rerender(<CityComparison locations={[neiva]} forecastDays={11} units={fahrenheit} model="ecmwf_ifs025" onRemove={onRemove} />);
    await act(async () => { resolveBogota(forecast({ latitude: bogota.latitude, longitude: bogota.longitude })); });
    expect(screen.queryByText('Bogotá')).toBeNull();
    expect(screen.getByText('Neiva')).toBeTruthy();
  });
});
