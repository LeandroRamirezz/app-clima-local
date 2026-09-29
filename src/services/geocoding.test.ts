import { afterEach, describe, expect, it, vi } from 'vitest';
import { GEOCODING_API_URL, GEOCODING_TIMEOUT_MS } from '../config/geocoding';
import { APP_ERROR_MESSAGES, AppError } from '../types/errors';
import { searchCities } from './geocoding';

const city = { id: 123, name: 'Bogotá', admin1: 'Bogotá D.C.', country: 'Colombia', latitude: 4.711, longitude: -74.0721, timezone: 'America/Bogota', elevation: 2640 };
const jsonResponse = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('searchCities', () => {
  it('envía los parámetros requeridos', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [city] }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await searchCities('Bogotá')).toEqual([city]);
    const url = new URL(fetchMock.mock.calls[0]![0] as URL);
    expect(url.origin + url.pathname).toBe(GEOCODING_API_URL);
    expect(Object.fromEntries(url.searchParams)).toEqual({ name: 'Bogotá', count: '10', language: 'es', format: 'json' });
  });
  it('recorta espacios externos antes de enviar la consulta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [city] })); vi.stubGlobal('fetch', fetchMock);
    await searchCities('  Bogotá  ');
    expect(new URL(fetchMock.mock.calls[0]![0] as URL).searchParams.get('name')).toBe('Bogotá');
  });
  it('codifica caracteres especiales como parámetros', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [] })); vi.stubGlobal('fetch', fetchMock);
    await searchCities('São Paulo & Cía');
    const url = new URL(fetchMock.mock.calls[0]![0] as URL);
    expect(url.searchParams.get('name')).toBe('São Paulo & Cía'); expect(url.search).toContain('%26');
  });
  it.each(['a', '   ', '!!!', 'A!', 'x'.repeat(101)])('rechaza consulta inválida sin petición', async (query) => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(searchCities(query)).rejects.toMatchObject({ code: 'E-04' }); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('devuelve múltiples ubicaciones', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ results: [city, { ...city, id: 124, name: 'Medellín' }] })));
    expect(await searchCities('Medellín')).toHaveLength(2);
  });
  it('trata results ausente como una colección vacía', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ generationtime_ms: 2 })));
    await expect(searchCities('Cali')).resolves.toEqual([]);
  });
  it('acepta ubicaciones sin admin1', async () => {
    const { admin1: _admin1, ...withoutAdmin1 } = city; void _admin1;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ results: [withoutAdmin1] })));
    expect(await searchCities('Bogotá')).toEqual([withoutAdmin1]);
  });
  it('normaliza admin1 null como campo ausente', async () => {
    const { admin1: _admin1, ...withoutAdmin1 } = city; void _admin1;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ results: [{ ...withoutAdmin1, admin1: null }] })));
    expect(await searchCities('Bogotá')).toEqual([withoutAdmin1]);
  });
  it('acepta ubicaciones sin elevation', async () => {
    const { elevation: _elevation, ...withoutElevation } = city; void _elevation;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ results: [withoutElevation] })));
    expect(await searchCities('Bogotá')).toEqual([withoutElevation]);
  });
  it.each([[400, 'E-04'], [429, 'E-03'], [500, 'E-05']] as const)('clasifica HTTP %i', async (status, code) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: true, reason: 'detalle técnico crudo' }, status)));
    const error = await searchCities('Lima').catch((cause: unknown) => cause);
    expect(error).toMatchObject({ code, message: APP_ERROR_MESSAGES[code] });
    expect((error as Error).message).not.toContain('detalle técnico crudo');
  });
  it('clasifica JSON malformado como E-05', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{', { status: 200 })));
    await expect(searchCities('Lima')).rejects.toMatchObject({ code: 'E-05' });
  });
  it('clasifica estructura inesperada como E-05', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ results: [{ id: 'no', name: 'Lima' }] })));
    await expect(searchCities('Lima')).rejects.toMatchObject({ code: 'E-05' });
  });
  it('clasifica fallo de red como E-01', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    await expect(searchCities('Lima')).rejects.toMatchObject({ code: 'E-01' });
  });
  it('clasifica el timeout de 10 segundos como E-02 y limpia temporizadores', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: URL, { signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
    const pending = searchCities('Quito');
    const settled = pending.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(GEOCODING_TIMEOUT_MS);
    expect(await settled).toMatchObject({ code: 'E-02' }); expect(vi.getTimerCount()).toBe(0);
  });
  it('cancela con AbortController sin convertirlo en error de aplicación', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', vi.fn((_url: URL, { signal }: { signal: AbortSignal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
    const pending = searchCities('Quito', { signal: controller.signal });
    const settled = pending.catch((error: unknown) => error); controller.abort();
    const error = await settled; expect(error).toMatchObject({ name: 'AbortError' }); expect(error).not.toBeInstanceOf(AppError);
  });
});
