// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_ERROR_MESSAGES, AppError, RequestAbortedError } from '../types/errors';
import type { ForecastUnits } from '../types/forecast';
import type { HistoricalParams, HistoricalWeatherData } from '../types/historical';
import type { Location } from '../types/location';
import { HistoricalWeather } from './HistoricalWeather';

const { mockGetHistoricalWeather } = vi.hoisted(() => ({ mockGetHistoricalWeather: vi.fn() }));
vi.mock('../services/historical', () => ({ getHistoricalWeather: mockGetHistoricalWeather }));

const location: Location = { id: 1, name: 'Neiva', admin1: 'Huila', country: 'Colombia', latitude: 2.93, longitude: -75.28 };
const bogota: Location = { id: 2, name: 'Bogotá', admin1: 'Bogotá D.C.', country: 'Colombia', latitude: 4.71, longitude: -74.07 };
const celsius: ForecastUnits = { temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm' };
const fahrenheit: ForecastUnits = { temperature: 'fahrenheit', windSpeed: 'mph', precipitation: 'inch' };

const defaultParams: HistoricalParams = { latitude: location.latitude, longitude: location.longitude, startDate: '2026-08-10', endDate: '2026-08-10', temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm' };

function historicalData(params: HistoricalParams = defaultParams): HistoricalWeatherData {
  const days = params.startDate === params.endDate ? 1 : 2;
  return {
    location: { latitude: params.latitude, longitude: params.longitude, timezone: 'America/Bogota' },
    startDate: params.startDate,
    endDate: params.endDate,
    units: { temperature: params.temperatureUnit, windSpeed: params.windSpeedUnit, precipitation: params.precipitationUnit, humidity: '%' },
    days: Array.from({ length: days }, (_, index) => ({
      date: index === 0 ? params.startDate : '2026-08-11',
      temperatureMax: index === 0 ? 31.46 : null,
      temperatureMin: index === 0 ? 21 : 22,
      temperatureMean: index === 0 ? 25.2 : null,
      precipitationSum: index === 0 ? 2.1 : null,
      windSpeedMax: index === 0 ? 10 : null,
      humidity: index === 0 ? 64 : null,
    })),
  };
}

async function flushPromises() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function setRange(start: string, end: string) {
  fireEvent.change(screen.getByLabelText('Fecha inicial'), { target: { value: start } });
  fireEvent.change(screen.getByLabelText('Fecha final'), { target: { value: end } });
}

async function submitRange(start = '2026-08-10', end = '2026-08-10') {
  setRange(start, end);
  fireEvent.click(screen.getByRole('button', { name: 'Consultar histórico' }));
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 25, 12));
  mockGetHistoricalWeather.mockReset().mockImplementation((params?: HistoricalParams) => Promise.resolve(historicalData(params)));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('HistoricalWeather', () => {
  it('muestra Históricos, los campos accesibles y no consulta sin ubicación', () => {
    render(<HistoricalWeather activeLocation={null} units={celsius} />);
    expect(screen.getByRole('heading', { name: 'Históricos' })).toBeTruthy();
    expect(screen.getByLabelText('Fecha inicial')).toBeTruthy();
    expect(screen.getByLabelText('Fecha final')).toBeTruthy();
    expect(screen.getAllByText('Formato: DD/MM/AAAA')).toHaveLength(2);
    expect(screen.getByText('Seleccione una ubicación antes de consultar datos históricos.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Consultar histórico' }).hasAttribute('disabled')).toBe(true);
    expect(mockGetHistoricalWeather).not.toHaveBeenCalled();
  });

  it('consulta una fecha individual con coordenadas, fechas y unidades compartidas', async () => {
    render(<HistoricalWeather activeLocation={location} units={celsius} />);
    await submitRange('2026-08-10', '2026-08-10');
    expect(mockGetHistoricalWeather).toHaveBeenCalledTimes(1);
    expect(mockGetHistoricalWeather).toHaveBeenCalledWith({
      latitude: 2.93, longitude: -75.28, startDate: '2026-08-10', endDate: '2026-08-10',
      temperatureUnit: 'celsius', windSpeedUnit: 'kmh', precipitationUnit: 'mm',
    }, { signal: expect.any(AbortSignal) });
    expect(screen.getByRole('heading', { name: 'Histórico — 10/08/2026' })).toBeTruthy();
    expect(screen.getByRole('table', { name: /Datos meteorológicos diarios/ })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Máxima' })).toBeTruthy();
  });

  it('muestra rangos inclusivos y evita desplazamientos de fecha en la presentación', async () => {
    render(<HistoricalWeather activeLocation={location} units={celsius} />);
    await submitRange('2026-08-10', '2026-08-11');
    expect(screen.getByRole('heading', { name: 'Histórico — 10/08/2026 – 11/08/2026' })).toBeTruthy();
    expect(screen.getAllByRole('rowheader').map((element) => element.textContent)).toEqual(['10/08/2026', '11/08/2026']);
    expect(screen.getByText('Se encontraron 2 días de datos históricos.')).toBeTruthy();
  });

  it.each([
    ['1939-12-31', '1939-12-31', 'Solo hay datos disponibles desde el 01/01/1940.'],
    ['2026-09-26', '2026-09-26', 'No es posible consultar fechas futuras. Consulte el pronóstico.'],
    ['2026-09-21', '2026-09-21', /Los datos de esa fecha aún no están disponibles\. La última fecha consultable es/],
    ['2026-07-31', '2026-08-31', 'El rango máximo permitido es de 31 días.'],
    ['2026-08-11', '2026-08-10', 'La fecha inicial no puede ser posterior a la final.'],
  ])('rechaza el rango %s a %s antes de solicitar el servicio', (start, end, message) => {
    render(<HistoricalWeather activeLocation={location} units={celsius} />);
    setRange(start, end);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar histórico' }));
    expect(screen.getByRole('alert').textContent).toMatch(message);
    expect(mockGetHistoricalWeather).not.toHaveBeenCalled();
  });

  it('anuncia carga y muestra N/D para campos ausentes sin ocultar otras métricas', async () => {
    let resolveRequest: ((data: HistoricalWeatherData) => void) | undefined;
    mockGetHistoricalWeather.mockImplementationOnce((params: HistoricalParams) => new Promise((resolve) => {
      resolveRequest = () => resolve({ ...historicalData(params), days: [{ ...historicalData(params).days[0]!, temperatureMin: null, temperatureMean: null, precipitationSum: null, windSpeedMax: null }] });
    }));
    render(<HistoricalWeather activeLocation={location} units={celsius} />);
    setRange('2026-08-10', '2026-08-10');
    fireEvent.click(screen.getByRole('button', { name: 'Consultar histórico' }));
    expect(screen.getByRole('status').textContent).toContain('Consultando datos históricos…');
    await act(async () => { resolveRequest?.(historicalData()); });
    expect(screen.getByText('31,5 °C')).toBeTruthy();
    expect(screen.getAllByText('N/D').length).toBeGreaterThan(0);
    expect(screen.getByText('64 %')).toBeTruthy();
  });

  it('aplica RF-12 al histórico y vuelve a consultar el mismo rango al cambiar unidades', async () => {
    const view = render(<HistoricalWeather activeLocation={location} units={celsius} />);
    await submitRange('2026-08-08', '2026-08-10');
    view.rerender(<HistoricalWeather activeLocation={location} units={fahrenheit} />);
    await flushPromises();
    expect(mockGetHistoricalWeather).toHaveBeenCalledTimes(2);
    expect(mockGetHistoricalWeather.mock.calls[1]?.[0]).toMatchObject({
      startDate: '2026-08-08', endDate: '2026-08-10', temperatureUnit: 'fahrenheit', windSpeedUnit: 'mph', precipitationUnit: 'inch',
    });
    expect(screen.getByText('31,5 °F')).toBeTruthy();
    expect(screen.getByText(/mph · in/)).toBeTruthy();
  });

  it('mantiene las fechas al cambiar ubicación, limpia resultados anteriores y requiere consulta explícita', async () => {
    const view = render(<HistoricalWeather activeLocation={location} units={celsius} />);
    await submitRange('2026-08-10', '2026-08-10');
    view.rerender(<HistoricalWeather activeLocation={bogota} units={celsius} />);
    await flushPromises();
    expect(screen.queryByText('31,5 °C')).toBeNull();
    expect(mockGetHistoricalWeather).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText('Fecha inicial') as HTMLInputElement).value).toBe('2026-08-10');
    await submitRange('2026-08-10', '2026-08-10');
    expect(mockGetHistoricalWeather).toHaveBeenCalledTimes(2);
    expect(mockGetHistoricalWeather.mock.calls[1]?.[0]).toMatchObject({ latitude: bogota.latitude, longitude: bogota.longitude });
    expect(screen.getAllByText(/Bogotá, Bogotá D\.C\., Colombia/).length).toBeGreaterThan(0);
  });

  it.each(['E-01', 'E-02', 'E-03', 'E-04', 'E-05'] as const)('muestra el mensaje seguro %s y permite reintentar el mismo rango', async (code) => {
    mockGetHistoricalWeather.mockRejectedValueOnce(new AppError(code));
    render(<HistoricalWeather activeLocation={location} units={celsius} />);
    await submitRange('2026-08-10', '2026-08-10');
    expect(screen.getByRole('alert').textContent).toContain(APP_ERROR_MESSAGES[code]);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await flushPromises();
    expect(mockGetHistoricalWeather).toHaveBeenCalledTimes(2);
    expect(mockGetHistoricalWeather.mock.calls[1]?.[0]).toMatchObject({ startDate: '2026-08-10', endDate: '2026-08-10', latitude: location.latitude });
    expect(screen.getByText('31,5 °C')).toBeTruthy();
  });

  it('no muestra como error una cancelación y no acepta respuesta obsoleta de otra fecha', async () => {
    mockGetHistoricalWeather
      .mockImplementationOnce((params: HistoricalParams) => new Promise((resolve) => setTimeout(() => resolve(historicalData(params)), 35)))
      .mockImplementationOnce((params: HistoricalParams) => Promise.resolve(historicalData(params)));
    render(<HistoricalWeather activeLocation={location} units={celsius} />);
    setRange('2026-08-10', '2026-08-10');
    fireEvent.click(screen.getByRole('button', { name: 'Consultar histórico' }));
    setRange('2026-08-11', '2026-08-11');
    fireEvent.click(screen.getByRole('button', { name: 'Consultar histórico' }));
    expect(mockGetHistoricalWeather).toHaveBeenCalledTimes(2);
    await flushPromises();
    expect(screen.getByRole('heading', { name: 'Histórico — 11/08/2026' })).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await flushPromises();
    expect(screen.getByRole('heading', { name: 'Histórico — 11/08/2026' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mantiene silenciosa la cancelación voluntaria', async () => {
    mockGetHistoricalWeather.mockRejectedValueOnce(new RequestAbortedError());
    render(<HistoricalWeather activeLocation={location} units={celsius} />);
    await submitRange('2026-08-10', '2026-08-10');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('cancela la solicitud al desmontar y conserva la unidad consultada ante un fallo por cambio de unidades', async () => {
    const view = render(<HistoricalWeather activeLocation={location} units={celsius} />);
    await submitRange('2026-08-10', '2026-08-10');
    mockGetHistoricalWeather.mockRejectedValueOnce(new AppError('E-01'));
    view.rerender(<HistoricalWeather activeLocation={location} units={fahrenheit} />);
    await flushPromises();
    expect(screen.queryByText('31,5 °C')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(APP_ERROR_MESSAGES['E-01']);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await flushPromises();
    expect(mockGetHistoricalWeather.mock.calls.at(-1)?.[0]).toMatchObject({ temperatureUnit: 'fahrenheit', windSpeedUnit: 'mph', precipitationUnit: 'inch' });
    expect(screen.getByText('31,5 °F')).toBeTruthy();

    let capturedSignal: AbortSignal | undefined;
    mockGetHistoricalWeather.mockImplementationOnce((_params: HistoricalParams, options: { signal?: AbortSignal }) => {
      capturedSignal = options.signal;
      return new Promise(() => undefined);
    });
    setRange('2026-08-12', '2026-08-12');
    fireEvent.click(screen.getByRole('button', { name: 'Consultar histórico' }));
    expect(capturedSignal?.aborted).toBe(false);
    view.unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
