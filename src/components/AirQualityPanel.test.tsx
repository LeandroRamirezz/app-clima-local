// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AIR_QUALITY_TEXT } from '../config/air-quality';
import { APP_ERROR_MESSAGES, AppError } from '../types/errors';
import type { AirQualityData } from '../types/air-quality';
import type { Location } from '../types/location';
import { AirQualityPanel } from './AirQualityPanel';

const { mockGetAirQuality } = vi.hoisted(() => ({ mockGetAirQuality: vi.fn() }));
vi.mock('../services/air-quality', () => ({ getAirQuality: mockGetAirQuality }));

const neiva: Location = { id: 1, name: 'Neiva', admin1: 'Huila', country: 'Colombia', latitude: 2.93, longitude: -75.28 };
const bogota: Location = { id: 2, name: 'Bogotá', admin1: 'Bogotá D.C.', country: 'Colombia', latitude: 4.71, longitude: -74.07 };

function airData(aqi: number | null = 42, locationName: 'neiva' | 'bogota' = 'neiva'): AirQualityData {
  const latitude = locationName === 'neiva' ? neiva.latitude : bogota.latitude;
  const longitude = locationName === 'neiva' ? neiva.longitude : bogota.longitude;
  const times = Array.from({ length: 24 }, (_, index) => {
    const hour = String((10 + index) % 24).padStart(2, '0');
    const day = index < 14 ? '25' : '26';
    return `2026-09-${day}T${hour}:00`;
  });
  return {
    location: { latitude, longitude, timezone: 'America/Bogota' },
    current: {
      time: '2026-09-25T10:15', usAqi: aqi, pm25: 8.4, pm10: 15.3, ozone: 32,
      nitrogenDioxide: 4.5, sulphurDioxide: 0.9, carbonMonoxide: 180.4,
    },
    hourly: times.map((time, index) => ({
      time, usAqi: 40 + index, pm25: 8 + index / 10, pm10: 15 + index / 10,
      ozone: 32, nitrogenDioxide: 4.5, sulphurDioxide: 0.9, carbonMonoxide: 180.4,
    })),
    units: {
      current: { usAqi: 'USAQI', pm25: 'μg/m³', pm10: 'μg/m³', ozone: 'μg/m³', nitrogenDioxide: 'μg/m³', sulphurDioxide: 'μg/m³', carbonMonoxide: 'μg/m³' },
      hourly: { usAqi: 'USAQI', pm25: 'μg/m³', pm10: 'μg/m³', ozone: 'μg/m³', nitrogenDioxide: 'μg/m³', sulphurDioxide: 'μg/m³', carbonMonoxide: 'μg/m³' },
    },
  };
}

async function flushPromises() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => mockGetAirQuality.mockReset().mockResolvedValue(airData()));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('AirQualityPanel', () => {
  it('sin ubicación no consulta y mantiene el acceso al mensaje de estado inicial', () => {
    render(<AirQualityPanel activeLocation={null} />);
    expect(screen.getByRole('heading', { name: 'Calidad del aire' })).toBeTruthy();
    expect(screen.getByText(AIR_QUALITY_TEXT.noLocation)).toBeTruthy();
    expect(mockGetAirQuality).not.toHaveBeenCalled();
  });

  it('consulta con las coordenadas activas y anuncia carga', () => {
    render(<AirQualityPanel activeLocation={neiva} />);
    expect(mockGetAirQuality).toHaveBeenCalledWith(
      { latitude: neiva.latitude, longitude: neiva.longitude },
      { signal: expect.any(AbortSignal) },
    );
    expect(screen.getByRole('status', { name: 'Carga de calidad del aire' }).textContent).toBe(AIR_QUALITY_TEXT.loading);
  });

  it('muestra US AQI con categoría, explicación, contaminantes, hora local y tendencia', async () => {
    render(<AirQualityPanel activeLocation={neiva} />);
    await flushPromises();
    expect(screen.getByRole('group', { name: 'Índice de calidad del aire: 42, categoría Buena.' })).toBeTruthy();
    expect(screen.getAllByText('Buena').length).toBeGreaterThan(0);
    expect(screen.getByText('La escala US AQI clasifica esta lectura dentro del rango bueno.')).toBeTruthy();
    expect(screen.getAllByText('PM2.5').length).toBeGreaterThan(0);
    expect(screen.getByText('Partículas finas')).toBeTruthy();
    expect(screen.getAllByText('PM10').length).toBeGreaterThan(0);
    expect(screen.getByText('Ozono (O₃)')).toBeTruthy();
    expect(screen.getByText('Dióxido de nitrógeno (NO₂)')).toBeTruthy();
    expect(screen.getByText('Dióxido de azufre (SO₂)')).toBeTruthy();
    expect(screen.getByText('Monóxido de carbono (CO)')).toBeTruthy();
    expect(screen.getAllByText('8,4 μg/m³').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Tendencia para las próximas 24 horas' })).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(24);
    expect(screen.getByText('10:00')).toBeTruthy();
    expect(screen.getByText(AIR_QUALITY_TEXT.informationNote)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'CAMS ENSEMBLE' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open-Meteo' })).toBeTruthy();
  });

  it.each([
    [42, 'Buena'],
    [58, 'Moderada'],
    [125, 'Dañina para grupos sensibles'],
    [175, 'Dañina'],
    [250, 'Muy dañina'],
    [350, 'Peligrosa'],
  ])('acompaña la categoría AQI %i (%s) con un icono visible y decorativo', async (aqi, label) => {
    mockGetAirQuality.mockResolvedValueOnce(airData(aqi));
    render(<AirQualityPanel activeLocation={bogota} />);
    await flushPromises();
    const indicator = screen.getByRole('group', { name: `Índice de calidad del aire: ${aqi}, categoría ${label}.` });
    expect(indicator.textContent).toContain(label);
    const icon = indicator.querySelector('.air-quality__category svg');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('focusable')).toBe('false');
    expect(icon?.getAttribute('viewBox')).toBe('0 0 24 24');
  });

  it('muestra N/D por contaminante nulo y no calcula una categoría si falta US AQI', async () => {
    const result = airData(null);
    result.current.pm10 = null;
    result.current.ozone = null;
    mockGetAirQuality.mockResolvedValueOnce(result);
    render(<AirQualityPanel activeLocation={neiva} />);
    await flushPromises();
    expect(screen.getByText(AIR_QUALITY_TEXT.noAqi)).toBeTruthy();
    expect(screen.queryByRole('group', { name: /Índice de calidad del aire/ })).toBeNull();
    expect(screen.getAllByText('N/D').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('8,4 μg/m³').length).toBeGreaterThan(0);
  });

  it('mantiene current y contaminantes aunque la respuesta no tenga horas', async () => {
    const result = airData(80);
    result.hourly = [];
    mockGetAirQuality.mockResolvedValueOnce(result);
    render(<AirQualityPanel activeLocation={neiva} />);
    await flushPromises();
    expect(screen.getAllByText('Moderada').length).toBeGreaterThan(0);
    expect(screen.getByText(AIR_QUALITY_TEXT.noHourly)).toBeTruthy();
  });

  it.each(['E-01', 'E-02', 'E-03', 'E-04', 'E-05'] as const)('presenta el mensaje seguro %s y ofrece reintento', async (code) => {
    mockGetAirQuality.mockRejectedValueOnce(new AppError(code));
    render(<AirQualityPanel activeLocation={neiva} />);
    await flushPromises();
    expect(screen.getByRole('alert').textContent).toContain(APP_ERROR_MESSAGES[code]);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('Reintentar consulta de nuevo las mismas coordenadas y reemplaza el error al tener éxito', async () => {
    mockGetAirQuality.mockRejectedValueOnce(new AppError('E-01')).mockResolvedValueOnce(airData());
    render(<AirQualityPanel activeLocation={neiva} />);
    await flushPromises();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await flushPromises();
    expect(mockGetAirQuality).toHaveBeenCalledTimes(2);
    expect(mockGetAirQuality.mock.calls[1]?.[0]).toEqual({ latitude: neiva.latitude, longitude: neiva.longitude });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getAllByText('Buena').length).toBeGreaterThan(0);
  });

  it('cancela la consulta anterior e impide que una respuesta obsoleta reemplace la ubicación nueva', async () => {
    let resolveOld: ((value: AirQualityData) => void) | undefined;
    mockGetAirQuality
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValueOnce(airData(125, 'bogota'));
    const view = render(<AirQualityPanel activeLocation={neiva} />);
    const firstSignal = mockGetAirQuality.mock.calls[0]?.[1].signal as AbortSignal;
    view.rerender(<AirQualityPanel activeLocation={bogota} />);
    await flushPromises();
    expect(firstSignal.aborted).toBe(true);
    expect(screen.getByText('Bogotá, Bogotá D.C., Colombia')).toBeTruthy();
    expect(screen.getByText('Dañina para grupos sensibles')).toBeTruthy();
    await act(async () => { resolveOld?.(airData(20, 'neiva')); });
    expect(screen.getByText('Bogotá, Bogotá D.C., Colombia')).toBeTruthy();
    expect(screen.getByText('Dañina para grupos sensibles')).toBeTruthy();
  });

  it('cancela peticiones activas al desmontar', () => {
    const view = render(<AirQualityPanel activeLocation={neiva} />);
    const signal = mockGetAirQuality.mock.calls[0]?.[1].signal as AbortSignal;
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
});
