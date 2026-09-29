// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { useGeolocation } from '../hooks/useGeolocation';
import { GEOLOCATION_MESSAGES } from '../config/geolocation';
import type { Location } from '../types/location';

const { mockSearchCities } = vi.hoisted(() => ({ mockSearchCities: vi.fn() }));
vi.mock('../services/geocoding', () => ({ searchCities: mockSearchCities }));

const neiva: Location = { id: 10, name: 'Neiva', admin1: 'Huila', country: 'Colombia', latitude: 2.93, longitude: -75.28 };
const rawLatitude = 2.927345678;
const rawLongitude = -75.281987654;

type SuccessCallback = (position: GeolocationPosition) => void;
type ErrorCallback = (error: GeolocationPositionError) => void;
type PositionHandler = (success: SuccessCallback, error?: ErrorCallback, options?: PositionOptions) => void;

let geoDescriptor: PropertyDescriptor | undefined;
let secureContextDescriptor: PropertyDescriptor | undefined;

function mockBrowserGeolocation(implementation: PositionHandler) {
  const getCurrentPosition = vi.fn(implementation);
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

function mockSuccessPosition(latitude = rawLatitude, longitude = rawLongitude): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy: 15,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: Date.now(),
    toJSON: () => ({}),
  };
}

function mockPositionError(code: number): GeolocationPositionError {
  return { code, message: 'internal browser detail' } as GeolocationPositionError;
}

function forecastResponse(): Response {
  return new Response(JSON.stringify({
    latitude: rawLatitude, longitude: rawLongitude, timezone: 'America/Bogota',
    current: { time: '2026-09-24T10:00', temperature_2m: 25, apparent_temperature: 25, relative_humidity_2m: 60, precipitation: 0, weather_code: 0, wind_speed_10m: 3, wind_direction_10m: 0 },
    hourly: { time: [] }, daily: { time: [] },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

function useFakeSecureContext(value: boolean) {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value });
}

async function selectNeiva() {
  fireEvent.change(screen.getByRole('combobox', { name: 'Nombre de la ciudad' }), { target: { value: 'Neiva' } });
  const option = await screen.findByRole('option', { name: /Neiva Huila, Colombia/ }, { timeout: 5000 });
  fireEvent.click(option);
  return option;
}

beforeEach(() => {
  geoDescriptor = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
  secureContextDescriptor = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
  useFakeSecureContext(true);
  mockSearchCities.mockReset().mockResolvedValue([neiva]);
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(forecastResponse())));
});

afterEach(() => {
  cleanup();
  if (geoDescriptor) Object.defineProperty(navigator, 'geolocation', geoDescriptor);
  else Reflect.deleteProperty(navigator, 'geolocation');
  if (secureContextDescriptor) Object.defineProperty(window, 'isSecureContext', secureContextDescriptor);
  else Reflect.deleteProperty(window, 'isSecureContext');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('RF-03: geolocalización del navegador', () => {
  it('muestra la acción y no solicita ubicación al renderizar', () => {
    const getCurrentPosition = mockBrowserGeolocation(vi.fn());
    render(<App />);
    expect(screen.getByRole('button', { name: 'Usar mi ubicación' })).toBeTruthy();
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.queryByText('Obteniendo ubicación…')).toBeNull();
    expect(screen.getByText('Tu ubicación se utilizará únicamente para consultar información meteorológica y no se guardará.')).toBeTruthy();
  });

  it('solicita ubicación solo al activar el botón y usa timeout de 10 segundos', () => {
    const getCurrentPosition = mockBrowserGeolocation(vi.fn());
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(getCurrentPosition.mock.calls[0]?.[2]).toEqual({ timeout: 10_000, enableHighAccuracy: false, maximumAge: 60_000 });
  });

  it('anuncia carga y evita solicitudes duplicadas mientras espera', () => {
    const getCurrentPosition = mockBrowserGeolocation(vi.fn());
    render(<App />);
    const button = screen.getByRole('button', { name: 'Usar mi ubicación' });
    fireEvent.click(button);
    expect(screen.getByRole('status').textContent).toBe('Obteniendo ubicación…');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('establece la ubicación y presenta coordenadas con dos decimales', async () => {
    let succeed: SuccessCallback | undefined;
    mockBrowserGeolocation((success) => { succeed = success; });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    await act(async () => succeed?.(mockSuccessPosition()));
    expect(within(screen.getByRole('status', { name: 'Ubicación seleccionada' })).getByText(`Mi ubicación (${rawLatitude.toFixed(2)}, ${rawLongitude.toFixed(2)})`)).toBeTruthy();
    expect(screen.getByText(`Latitud: ${rawLatitude.toFixed(2)}`)).toBeTruthy();
    expect(screen.getByText(`Longitud: ${rawLongitude.toFixed(2)}`)).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Ubicación seleccionada' })).toBeTruthy();
    expect(screen.getByText(GEOLOCATION_MESSAGES.success)).toBeTruthy();
  });

  it('entrega al estado activo las coordenadas originales sin redondearlas', async () => {
    let succeed: SuccessCallback | undefined;
    const onLocation = vi.fn();
    const { result } = renderHook(() => useGeolocation(onLocation));
    mockBrowserGeolocation((success) => { succeed = success; });
    act(() => result.current.requestLocation());
    await act(async () => succeed?.(mockSuccessPosition()));
    expect(onLocation).toHaveBeenCalledWith({
      id: 'geolocation', name: 'Mi ubicación', latitude: rawLatitude, longitude: rawLongitude, source: 'geolocation',
    });
  });

  it('maneja permiso denegado sin revelar el detalle del navegador ni reintentar solo', () => {
    let fail: ErrorCallback | undefined;
    const getCurrentPosition = mockBrowserGeolocation((_success, error) => { fail = error; });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    act(() => fail?.(mockPositionError(1)));
    expect(screen.getByRole('alert').textContent).toBe(GEOLOCATION_MESSAGES.permissionDenied);
    expect(screen.queryByText(/internal browser detail/)).toBeNull();
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('combobox', { name: 'Nombre de la ciudad' })).toBeTruthy();
  });

  it('maneja timeout y permite reintento manual', () => {
    let fail: ErrorCallback | undefined;
    const getCurrentPosition = mockBrowserGeolocation((_success, error) => { fail = error; });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    act(() => fail?.(mockPositionError(3)));
    expect(screen.getByRole('alert').textContent).toBe(GEOLOCATION_MESSAGES.timeout);
    const retry = screen.getByRole('button', { name: 'Reintentar ubicación' });
    fireEvent.click(retry);
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('status').textContent).toBe('Obteniendo ubicación…');
  });

  it('maneja posición no disponible y mantiene accesible la búsqueda manual', () => {
    let fail: ErrorCallback | undefined;
    mockBrowserGeolocation((_success, error) => { fail = error; });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    act(() => fail?.(mockPositionError(2)));
    expect(screen.getByRole('alert').textContent).toBe(GEOLOCATION_MESSAGES.positionUnavailable);
    expect(screen.getByRole('button', { name: 'Reintentar ubicación' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Nombre de la ciudad' })).toBeTruthy();
  });

  it('maneja códigos desconocidos sin mostrar detalles técnicos', () => {
    let fail: ErrorCallback | undefined;
    const getCurrentPosition = mockBrowserGeolocation((_success, error) => { fail = error; });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    act(() => fail?.(mockPositionError(99)));
    expect(screen.getByRole('alert').textContent).toBe(GEOLOCATION_MESSAGES.unknown);
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('maneja una excepción síncrona del navegador con un mensaje seguro', () => {
    mockBrowserGeolocation(() => { throw new Error('internal browser detail'); });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(screen.getByRole('alert').textContent).toBe(GEOLOCATION_MESSAGES.unknown);
    expect(screen.queryByText(/internal browser detail/)).toBeNull();
  });

  it.each([
    [1, 'permission-denied', GEOLOCATION_MESSAGES.permissionDenied],
    [2, 'unavailable', GEOLOCATION_MESSAGES.positionUnavailable],
    [3, 'timeout', GEOLOCATION_MESSAGES.timeout],
    [99, 'error', GEOLOCATION_MESSAGES.unknown],
  ] as const)('clasifica el código de error %i como %s', (code, expectedStatus, message) => {
    let fail: ErrorCallback | undefined;
    mockBrowserGeolocation((_success, error) => { fail = error; });
    const { result } = renderHook(() => useGeolocation(vi.fn()));
    act(() => result.current.requestLocation());
    act(() => fail?.(mockPositionError(code)));
    expect(result.current.status).toBe(expectedStatus);
    expect(result.current.message).toBe(message);
  });

  it('informa cuando navigator.geolocation no está disponible y no rompe la búsqueda', async () => {
    Reflect.deleteProperty(navigator, 'geolocation');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(screen.getByRole('alert').textContent).toBe(GEOLOCATION_MESSAGES.unsupported);
    await selectNeiva();
    expect(screen.getAllByText('Neiva, Huila, Colombia').length).toBeGreaterThanOrEqual(1);
  });

  it('no solicita ubicación en contexto no seguro y permite continuar con RF-02', async () => {
    useFakeSecureContext(false);
    const getCurrentPosition = mockBrowserGeolocation(vi.fn());
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(GEOLOCATION_MESSAGES.unsupported);
    await selectNeiva();
    expect(screen.getAllByText('Neiva, Huila, Colombia').length).toBeGreaterThanOrEqual(1);
  });

  it('conserva la ubicación manual existente si la geolocalización falla', async () => {
    let fail: ErrorCallback | undefined;
    mockBrowserGeolocation((_success, error) => { fail = error; });
    render(<App />);
    await selectNeiva();
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    act(() => fail?.(mockPositionError(3)));
    expect(within(screen.getByRole('status', { name: 'Ubicación seleccionada' })).getByText('Neiva, Huila, Colombia')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(GEOLOCATION_MESSAGES.timeout);
  });

  it('una ubicación geográfica reemplaza una ubicación manual activa', async () => {
    let succeed: SuccessCallback | undefined;
    mockBrowserGeolocation((success) => { succeed = success; });
    render(<App />);
    await selectNeiva();
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    await act(async () => succeed?.(mockSuccessPosition()));
    expect(within(screen.getByRole('status', { name: 'Ubicación seleccionada' })).getByText(`Mi ubicación (${rawLatitude.toFixed(2)}, ${rawLongitude.toFixed(2)})`)).toBeTruthy();
    expect(screen.queryByText('Neiva, Huila, Colombia')).toBeNull();
  });

  it('una nueva selección manual reemplaza una ubicación geográfica', async () => {
    let succeed: SuccessCallback | undefined;
    mockBrowserGeolocation((success) => { succeed = success; });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    await act(async () => succeed?.(mockSuccessPosition()));
    await selectNeiva();
    expect(within(screen.getByRole('status', { name: 'Ubicación seleccionada' })).getByText('Neiva, Huila, Colombia')).toBeTruthy();
    expect(screen.queryByText(/Mi ubicación \(/)).toBeNull();
  });

  it('ignora un callback de geolocalización pendiente después de una selección manual', async () => {
    let succeed: SuccessCallback | undefined;
    mockBrowserGeolocation((success) => { succeed = success; });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    await selectNeiva();
    await act(async () => succeed?.(mockSuccessPosition()));
    expect(screen.getAllByText('Neiva, Huila, Colombia').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Mi ubicación \(/)).toBeNull();
  });

  it('no actualiza estado desde un callback posterior al desmontaje', async () => {
    let succeed: SuccessCallback | undefined;
    const onLocation = vi.fn();
    mockBrowserGeolocation((success) => { succeed = success; });
    const view = renderHook(() => useGeolocation(onLocation));
    act(() => view.result.current.requestLocation());
    view.unmount();
    await act(async () => succeed?.(mockSuccessPosition()));
    expect(onLocation).not.toHaveBeenCalled();
  });

  it('persiste únicamente las unidades y no guarda coordenadas ni altera la URL', async () => {
    let succeed: SuccessCallback | undefined;
    const localSet = vi.spyOn(localStorage, 'setItem');
    const sessionSet = vi.spyOn(sessionStorage, 'setItem');
    mockBrowserGeolocation((success) => { succeed = success; });
    const initialUrl = window.location.href;
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    await act(async () => succeed?.(mockSuccessPosition()));
    expect(localSet.mock.calls.every(([key]) => key === 'weather-app.units')).toBe(true);
    expect(JSON.stringify(localSet.mock.calls)).not.toContain('2.93');
    expect(sessionSet).not.toHaveBeenCalled();
    expect(window.location.href).toBe(initialUrl);
  });
});
