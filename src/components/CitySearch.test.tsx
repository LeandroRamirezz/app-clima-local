// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CitySearch } from './CitySearch';
import App from '../App';
import { APP_ERROR_MESSAGES, AppError, RequestAbortedError, type AppErrorCode } from '../types/errors';
import type { Location } from '../types/location';

const { mockSearchCities } = vi.hoisted(() => ({ mockSearchCities: vi.fn() }));
vi.mock('../services/geocoding', () => ({ searchCities: mockSearchCities }));

const locations: Location[] = [
  { id: 1, name: 'Neiva', country: 'Colombia', latitude: 2.9, longitude: -75.3 },
  { id: 2, name: 'Neiva', admin1: 'Huila', country: 'Colombia', latitude: 2.9, longitude: -75.3 },
];

function cityInput() { return screen.getByRole('combobox', { name: 'Nombre de la ciudad' }); }
function activeLocationText(text: string) { return within(screen.getByRole('status', { name: 'Ubicación seleccionada' })).getByText(text); }
function currentWeatherLocationText(text: string) { return within(screen.getByRole('region', { name: 'Clima actual' })).getByText(text); }
function forecastResponse(): Response {
  return new Response(JSON.stringify({
    latitude: 2.9, longitude: -75.3, timezone: 'America/Bogota',
    current: { time: '2026-09-24T10:00', temperature_2m: 25, apparent_temperature: 25, relative_humidity_2m: 60, precipitation: 0, weather_code: 0, wind_speed_10m: 3, wind_direction_10m: 0 },
    hourly: { time: [] }, daily: { time: [] },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}
function renderCitySearch() {
  return render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
}
async function elapse(milliseconds: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
}
async function search(query: string) {
  fireEvent.change(cityInput(), { target: { value: query } });
  await elapse(300);
}

beforeEach(() => {
  vi.useFakeTimers();
  mockSearchCities.mockReset().mockResolvedValue(locations);
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(forecastResponse())));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('CitySearch', () => {
  it('muestra etiqueta y campo accesibles, sin carga ni errores al inicio', () => {
    renderCitySearch();
    expect(cityInput()).toBeTruthy();
    expect(cityInput().getAttribute('maxlength')).toBe('100');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('no consulta con el campo vacío', async () => {
    renderCitySearch();
    await elapse(500);
    expect(mockSearchCities).not.toHaveBeenCalled();
  });

  it('no consulta con un carácter y muestra validación después de la pausa', async () => {
    renderCitySearch();
    fireEvent.change(cityInput(), { target: { value: 'N' } });
    await elapse(299);
    expect(mockSearchCities).not.toHaveBeenCalled();
    expect(screen.queryByText('Ingrese al menos 2 caracteres válidos.')).toBeNull();
    await elapse(1);
    expect(screen.getByText('Ingrese al menos 2 caracteres válidos.')).toBeTruthy();
  });

  it('permite una consulta válida y la envía al servicio', async () => {
    renderCitySearch();
    await search('Neiva');
    expect(mockSearchCities).toHaveBeenCalledWith('Neiva', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('admite una entrada válida de 100 caracteres', async () => {
    renderCitySearch();
    const query = 'a'.repeat(100);
    fireEvent.change(cityInput(), { target: { value: query } });
    await elapse(300);
    expect(mockSearchCities).toHaveBeenCalledWith(query, expect.any(Object));
  });

  it('rechaza más de 100 caracteres aunque el evento eluda maxlength', async () => {
    renderCitySearch();
    fireEvent.change(cityInput(), { target: { value: 'a'.repeat(101) } });
    await elapse(300);
    expect(mockSearchCities).not.toHaveBeenCalled();
    expect(screen.getByText('El texto no puede superar los 100 caracteres.')).toBeTruthy();
  });

  it('no consulta inmediatamente antes de los 300 ms', async () => {
    renderCitySearch();
    fireEvent.change(cityInput(), { target: { value: 'Cali' } });
    await elapse(299);
    expect(mockSearchCities).not.toHaveBeenCalled();
  });

  it('consulta una vez al cumplirse el debounce', async () => {
    renderCitySearch();
    fireEvent.change(cityInput(), { target: { value: 'Cali' } });
    await elapse(300);
    expect(mockSearchCities).toHaveBeenCalledTimes(1);
  });

  it('agrupa pulsaciones rápidas y busca el último texto una sola vez', async () => {
    renderCitySearch();
    for (const value of ['N', 'Ne', 'Nei', 'Neiv', 'Neiva']) {
      fireEvent.change(cityInput(), { target: { value } });
      await elapse(60);
    }
    await elapse(300);
    expect(mockSearchCities).toHaveBeenCalledTimes(1);
    expect(mockSearchCities.mock.calls[0]?.[0]).toBe('Neiva');
  });

  it('recorta espacios externos con el validador reutilizado', async () => {
    renderCitySearch();
    await search('  Bogotá  ');
    expect(mockSearchCities).toHaveBeenCalledWith('Bogotá', expect.any(Object));
  });

  it('cancela la solicitud anterior cuando cambia la búsqueda', async () => {
    const signals: AbortSignal[] = [];
    mockSearchCities.mockImplementation((_query: string, { signal }: { signal: AbortSignal }) => {
      signals.push(signal);
      return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new RequestAbortedError()), { once: true }));
    });
    renderCitySearch();
    await search('Cali');
    expect(signals[0]?.aborted).toBe(false);
    fireEvent.change(cityInput(), { target: { value: 'Medellín' } });
    expect(signals[0]?.aborted).toBe(true);
    await elapse(300);
    expect(mockSearchCities).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('cancela la solicitud al desmontar el componente', async () => {
    let requestSignal: AbortSignal | undefined;
    mockSearchCities.mockImplementation((_query: string, { signal }: { signal: AbortSignal }) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });
    const view = renderCitySearch();
    await search('Pasto');
    view.unmount();
    expect(requestSignal?.aborted).toBe(true);
  });

  it('anuncia la carga mientras la consulta está pendiente', async () => {
    mockSearchCities.mockImplementation(() => new Promise(() => undefined));
    renderCitySearch();
    await search('Tunja');
    expect(screen.getByRole('status').textContent).toBe('Buscando ubicaciones…');
  });

  it('muestra cantidad y ubicaciones del resultado exitoso', async () => {
    renderCitySearch();
    await search('Neiva');
    expect(screen.getByRole('status').textContent).toBe('2 ubicaciones encontradas.');
    expect(screen.getByRole('listbox', { name: 'Ubicaciones encontradas' })).toBeTruthy();
    expect(screen.getAllByText(/Neiva/)).toHaveLength(2);
  });

  it('quita la carga al completar la consulta', async () => {
    renderCitySearch();
    await search('Neiva');
    expect(screen.queryByText('Buscando ubicaciones…')).toBeNull();
  });

  it('muestra estado vacío con el texto de la búsqueda que produjo la respuesta', async () => {
    mockSearchCities.mockResolvedValueOnce([]);
    renderCitySearch();
    await search('Villa de Leyva');
    expect(screen.getByRole('status').textContent).toBe('No se encontraron ubicaciones para «Villa de Leyva». Verifique la ortografía o pruebe con otro nombre.');
  });

  it.each(['E-01', 'E-02', 'E-03', 'E-04', 'E-05'] as AppErrorCode[])('muestra el mensaje seguro %s y ofrece Reintentar', async (code) => {
    mockSearchCities.mockRejectedValueOnce(new AppError(code, { reason: 'detalle interno' }));
    renderCitySearch();
    await search('Cali');
    expect(screen.getByRole('alert').textContent).toContain(APP_ERROR_MESSAGES[code]);
    expect(screen.getByRole('alert').textContent).not.toContain('detalle interno');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });

  it('reintenta la última búsqueda válida y conserva el texto del campo', async () => {
    mockSearchCities.mockRejectedValueOnce(new AppError('E-01')).mockImplementationOnce(() => new Promise(() => undefined));
    renderCitySearch();
    await search('Cali');
    expect((cityInput() as HTMLInputElement).value).toBe('Cali');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await elapse(0);
    expect(mockSearchCities).toHaveBeenCalledTimes(2);
    expect(mockSearchCities.mock.calls[1]?.[0]).toBe('Cali');
    expect(screen.getByText('Buscando ubicaciones…')).toBeTruthy();
  });

  it('no muestra Reintentar para campo vacío ni entrada inválida', async () => {
    renderCitySearch();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
    fireEvent.change(cityInput(), { target: { value: 'a' } });
    await elapse(300);
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('limpia resultados anteriores cuando la entrada queda corta', async () => {
    renderCitySearch();
    await search('Neiva');
    fireEvent.change(cityInput(), { target: { value: 'N' } });
    expect(screen.queryByRole('listbox', { name: 'Ubicaciones encontradas' })).toBeNull();
    await elapse(300);
    expect(mockSearchCities).toHaveBeenCalledTimes(1);
  });

  it('vaciar el campo limpia resultados y errores y cancela el debounce', async () => {
    renderCitySearch();
    fireEvent.change(cityInput(), { target: { value: 'Cali' } });
    await elapse(100);
    fireEvent.change(cityInput(), { target: { value: '' } });
    await elapse(300);
    expect(mockSearchCities).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('vaciar el campo después de un error limpia el mensaje y el reintento', async () => {
    mockSearchCities.mockRejectedValueOnce(new AppError('E-01'));
    renderCitySearch();
    await search('Cali');
    expect(screen.getByRole('alert')).toBeTruthy();
    fireEvent.change(cityInput(), { target: { value: '' } });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('vaciar el campo cancela una solicitud HTTP activa', async () => {
    let requestSignal: AbortSignal | undefined;
    mockSearchCities.mockImplementation((_query: string, { signal }: { signal: AbortSignal }) => {
      requestSignal = signal;
      return new Promise(() => undefined);
    });
    renderCitySearch();
    await search('Cali');
    expect(requestSignal?.aborted).toBe(false);
    fireEvent.change(cityInput(), { target: { value: '' } });
    expect(requestSignal?.aborted).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('una cancelación intencional no muestra error ni botón de reintento', async () => {
    mockSearchCities.mockImplementation((_query: string, { signal }: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new RequestAbortedError()), { once: true })));
    renderCitySearch();
    fireEvent.change(cityInput(), { target: { value: 'Cali' } });
    await elapse(300);
    fireEvent.change(cityInput(), { target: { value: '' } });
    await elapse(300);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).toBeNull();
  });

  it('una respuesta antigua que llega tarde no reemplaza resultados recientes', async () => {
    const pending: Array<{ query: string; resolve: (value: Location[]) => void }> = [];
    mockSearchCities.mockImplementation((query: string) => new Promise<Location[]>((resolve) => pending.push({ query, resolve })));
    renderCitySearch();
    await search('Cali');
    fireEvent.change(cityInput(), { target: { value: 'Medellín' } });
    await search('Medellín');
    await act(async () => { pending.find((request) => request.query === 'Medellín')?.resolve([{ ...locations[1]!, id: 7, name: 'Medellín' }]); });
    expect(screen.getByRole('status').textContent).toBe('1 ubicación encontrada.');
    await act(async () => { pending.find((request) => request.query === 'Cali')?.resolve([{ ...locations[0]!, name: 'Cali' }]); });
    expect(screen.getByRole('status').textContent).toBe('1 ubicación encontrada.');
    expect(screen.getByText(/Medellín/)).toBeTruthy();
    expect(screen.queryByText(/^Cali$/)).toBeNull();
  });

  it('presenta resultados con nombre, región, país y coordenadas', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    const options = screen.getAllByRole('option');
    expect(options[1]?.textContent).toContain('Neiva');
    expect(options[1]?.textContent).toContain('Huila, Colombia');
    expect(options[1]?.textContent).toContain('2.90, -75.30');
  });

  it('muestra opciones sin admin1, timezone o elevation y no imprime null/undefined', async () => {
    const minimal: Location = { id: 31, name: 'Mocoa', country: 'Colombia', latitude: 1.15, longitude: -76.65 };
    mockSearchCities.mockResolvedValueOnce([minimal]);
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Mocoa');
    expect(screen.getByRole('option').textContent).toContain('Mocoa');
    expect(screen.getByRole('option').textContent).toContain('Colombia');
    expect(document.body.textContent).not.toMatch(/undefined|null/);
  });

  it('distingue ubicaciones homónimas por región, país y coordenadas sin elegir ninguna', async () => {
    const homonyms: Location[] = [
      { id: 40, name: 'San José', admin1: 'San José', country: 'Costa Rica', latitude: 9.93, longitude: -84.08 },
      { id: 41, name: 'San José', admin1: 'California', country: 'Estados Unidos', latitude: 37.34, longitude: -121.89 },
      { id: 42, name: 'San José', admin1: 'Entre Ríos', country: 'Argentina', latitude: -32.21, longitude: -58.22 },
    ];
    mockSearchCities.mockResolvedValueOnce(homonyms);
    render(<App />);
    await search('San José');
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText('California, Estados Unidos')).toBeTruthy();
    expect(screen.getByText('Entre Ríos, Argentina')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Ubicación seleccionada' })).toBeNull();
    expect(cityInput().getAttribute('aria-activedescendant')).toBeNull();
  });

  it('usa semántica de combobox y lista contraída sin referencias rotas', () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    const input = cityInput();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-controls')).toBeNull();
    expect(input.getAttribute('aria-activedescendant')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('al abrir resultados aria-expanded y aria-controls apuntan al listbox visible', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    const input = cityInput();
    const listbox = screen.getByRole('listbox', { name: 'Ubicaciones encontradas' });
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe(listbox.id);
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('ArrowDown activa la primera opción sin seleccionarla', async () => {
    render(<App />);
    await search('Neiva');
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    const firstOption = screen.getAllByRole('option')[0]!;
    expect(cityInput().getAttribute('aria-activedescendant')).toBe(firstOption.id);
    expect(firstOption.getAttribute('aria-selected')).toBe('false');
    expect(screen.queryByRole('region', { name: 'Ubicación seleccionada' })).toBeNull();
  });

  it('varios ArrowDown recorren opciones y hacen wrap consistente al inicio', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    expect(cityInput().getAttribute('aria-activedescendant')).toBe(options[1]!.id);
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    expect(cityInput().getAttribute('aria-activedescendant')).toBe(options[0]!.id);
  });

  it('ArrowUp recorre hacia arriba y envuelve desde la primera hasta la última opción', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    const options = screen.getAllByRole('option');
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(cityInput(), { key: 'ArrowUp' });
    expect(cityInput().getAttribute('aria-activedescendant')).toBe(options[1]!.id);
    fireEvent.keyDown(cityInput(), { key: 'ArrowUp' });
    expect(cityInput().getAttribute('aria-activedescendant')).toBe(options[0]!.id);
  });

  it('ArrowUp al abrir la lista activa la última opción y conserva índice válido', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    fireEvent.keyDown(cityInput(), { key: 'Escape' });
    expect(cityInput().getAttribute('aria-expanded')).toBe('false');
    fireEvent.keyDown(cityInput(), { key: 'ArrowUp' });
    const options = screen.getAllByRole('option');
    expect(cityInput().getAttribute('aria-activedescendant')).toBe(options[options.length - 1]!.id);
    expect(options.some((option) => option.id === cityInput().getAttribute('aria-activedescendant'))).toBe(true);
  });

  it('Enter selecciona la opción activa y publica la ubicación en App', async () => {
    render(<App />);
    await search('Neiva');
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(cityInput(), { key: 'Enter' });
    await elapse(0);
    expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Ubicación seleccionada' })).toBeTruthy();
    expect(activeLocationText('Neiva, Colombia')).toBeTruthy();
    expect(currentWeatherLocationText('Neiva, Colombia')).toBeTruthy();
    expect(screen.getByText('Latitud: 2.90')).toBeTruthy();
    expect(screen.getByText('Longitud: -75.30')).toBeTruthy();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect((cityInput() as HTMLInputElement).value).toBe('Neiva, Colombia');
  });

  it('Escape cierra resultados, mantiene el texto y conserva la ubicación ya elegida', async () => {
    const bogota: Location = { id: 50, name: 'Bogotá', admin1: 'Bogotá D.C.', country: 'Colombia', latitude: 4.71, longitude: -74.07 };
    mockSearchCities.mockResolvedValueOnce([locations[0]!]).mockResolvedValueOnce([bogota]);
    render(<App />);
    await search('Neiva');
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(cityInput(), { key: 'Enter' });
    fireEvent.change(cityInput(), { target: { value: 'Bogotá' } });
    await elapse(300);
    fireEvent.keyDown(cityInput(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(cityInput().getAttribute('aria-expanded')).toBe('false');
    expect((cityInput() as HTMLInputElement).value).toBe('Bogotá');
    expect(activeLocationText('Neiva, Colombia')).toBeTruthy();
  });

  it('seleccionar una opción con clic usa el mismo flujo y cierra el listbox', async () => {
    render(<App />);
    await search('Neiva');
    const option = screen.getByRole('option', { name: /Huila, Colombia/ });
    fireEvent.mouseDown(option);
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.click(option);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(activeLocationText('Neiva, Huila, Colombia')).toBeTruthy();
    expect(cityInput().getAttribute('aria-activedescendant')).toBeNull();
  });

  it('al seleccionar pasa el objeto Location completo, incluidos timezone y elevation', async () => {
    const fullLocation: Location = { ...locations[0]!, timezone: 'America/Bogota', elevation: 2640 };
    const onSelect = vi.fn();
    mockSearchCities.mockResolvedValueOnce([fullLocation]);
    render(<CitySearch activeLocation={null} onSelectLocation={onSelect} />);
    await search('Neiva');
    fireEvent.click(screen.getByRole('option'));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(fullLocation);
  });

  it('buscar y seleccionar otra ciudad reemplaza la ubicación activa', async () => {
    const bogota: Location = { id: 52, name: 'Bogotá', country: 'Colombia', latitude: 4.71, longitude: -74.07 };
    mockSearchCities.mockResolvedValueOnce([locations[0]!]).mockResolvedValueOnce([bogota]);
    render(<App />);
    await search('Neiva');
    fireEvent.click(screen.getAllByRole('option')[0]!);
    fireEvent.change(cityInput(), { target: { value: 'Bogotá' } });
    await elapse(300);
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(cityInput(), { key: 'Enter' });
    expect(activeLocationText('Bogotá, Colombia')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Ubicación seleccionada' }).textContent).not.toContain('Neiva, Colombia');
  });

  it('escribir otra ciudad sin seleccionar conserva la ubicación activa anterior', async () => {
    render(<App />);
    await search('Neiva');
    fireEvent.click(screen.getAllByRole('option')[0]!);
    await elapse(0);
    fireEvent.change(cityInput(), { target: { value: 'Bogotá' } });
    expect((cityInput() as HTMLInputElement).value).toBe('Bogotá');
    expect(activeLocationText('Neiva, Colombia')).toBeTruthy();
    expect(screen.getByRole('status', { name: 'Ubicación seleccionada' }).textContent).not.toContain('Bogotá, Colombia');
  });

  it('una respuesta vieja posterior a una selección no cambia ni reabre la ubicación', async () => {
    const pending: Array<{ query: string; resolve: (value: Location[]) => void }> = [];
    mockSearchCities.mockImplementation((query: string) => new Promise<Location[]>((resolve) => pending.push({ query, resolve })));
    render(<App />);
    fireEvent.change(cityInput(), { target: { value: 'Cali' } });
    await elapse(300);
    fireEvent.change(cityInput(), { target: { value: 'Medellín' } });
    await elapse(300);
    const medellin: Location = { id: 70, name: 'Medellín', admin1: 'Antioquia', country: 'Colombia', latitude: 6.24, longitude: -75.58 };
    await act(async () => { pending.find((request) => request.query === 'Medellín')?.resolve([medellin]); });
    fireEvent.click(screen.getByRole('option'));
    await act(async () => { pending.find((request) => request.query === 'Cali')?.resolve([{ ...locations[0]!, name: 'Cali' }]); });
    expect(activeLocationText('Medellín, Antioquia, Colombia')).toBeTruthy();
    expect(currentWeatherLocationText('Medellín, Antioquia, Colombia')).toBeTruthy();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect((cityInput() as HTMLInputElement).value).toBe('Medellín, Antioquia, Colombia');
  });

  it('renderiza el nombre externo como texto aunque parezca una etiqueta script', async () => {
    const unsafeName = '<script>alert(1)</script>';
    mockSearchCities.mockResolvedValueOnce([{ id: 80, name: unsafeName, country: 'Colombia', latitude: 1, longitude: 1 }]);
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Medellín');
    expect(screen.getByRole('option').textContent).toContain(unsafeName);
    expect(document.querySelector('script')).toBeNull();
  });

  it('trata la consulta con apariencia de script como texto y no ejecuta HTML', async () => {
    mockSearchCities.mockResolvedValueOnce([]);
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    const unsafeQuery = '<script>alert(1)</script>';
    await search(unsafeQuery);
    expect(screen.getByRole('status').textContent).toContain(unsafeQuery);
    expect(document.querySelector('script')).toBeNull();
  });


  it('usa solo el país como detalle cuando admin1 está ausente', async () => {
    const withoutRegion: Location = { id: 91, name: 'Cali', country: 'Colombia', latitude: 3.45, longitude: -76.52 };
    mockSearchCities.mockResolvedValueOnce([withoutRegion]);
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Cali');
    expect(screen.getByRole('option').textContent).toContain('Colombia');
    expect(screen.getByRole('option').textContent).not.toContain('undefined');
  });

  it('tolera admin1 null de una respuesta externa como un campo opcional', async () => {
    const nullRegion = { id: 92, name: 'Cali', admin1: null, country: 'Colombia', latitude: 3.45, longitude: -76.52 } as unknown as Location;
    mockSearchCities.mockResolvedValueOnce([nullRegion]);
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Cali');
    expect(screen.getByRole('option').textContent).toContain('Cali');
    expect(screen.getByRole('option').textContent).toContain('Colombia');
    expect(document.body.textContent).not.toMatch(/null|undefined/);
  });

  it('tolera país ausente si la región administrativa sí está disponible', async () => {
    const withoutCountry: Location = { id: 93, name: 'Cali', admin1: 'Valle del Cauca', latitude: 3.45, longitude: -76.52 };
    mockSearchCities.mockResolvedValueOnce([withoutCountry]);
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Cali');
    expect(screen.getByRole('option').textContent).toContain('Valle del Cauca');
    expect(document.body.textContent).not.toMatch(/null|undefined/);
  });

  it('muestra latitud y longitud de la ubicación en formato legible', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    expect(screen.getAllByRole('option')[0]?.textContent).toContain('2.90, -75.30');
  });

  it('una única coincidencia tampoco se selecciona automáticamente', async () => {
    mockSearchCities.mockResolvedValueOnce([locations[0]!]);
    render(<App />);
    await search('Neiva');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.queryByRole('heading', { name: 'Ubicación seleccionada' })).toBeNull();
    expect(cityInput().getAttribute('aria-activedescendant')).toBeNull();
  });

  it('cada opción está dentro del listbox y no recibe foco DOM', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    const listbox = screen.getByRole('listbox');
    for (const option of screen.getAllByRole('option')) {
      expect(listbox.contains(option)).toBe(true);
      expect(option.getAttribute('tabindex')).toBeNull();
    }
  });

  it('no muestra listbox vacío ni expandido cuando la búsqueda no tiene resultados', async () => {
    mockSearchCities.mockResolvedValueOnce([]);
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Nombreinexistente');
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('combobox').getAttribute('aria-controls')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('mantiene listbox cerrado si una consulta termina en error', async () => {
    mockSearchCities.mockRejectedValueOnce(new AppError('E-05'));
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Cali');
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('restablece la opción activa al empezar una búsqueda nueva', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    expect(cityInput().getAttribute('aria-activedescendant')).not.toBeNull();
    fireEvent.change(cityInput(), { target: { value: 'Medellín' } });
    expect(cityInput().getAttribute('aria-activedescendant')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Enter sin opción activa no elige el primer resultado por su cuenta', async () => {
    render(<App />);
    await search('Neiva');
    fireEvent.keyDown(cityInput(), { key: 'Enter' });
    expect(screen.queryByRole('heading', { name: 'Ubicación seleccionada' })).toBeNull();
    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('Escape quita la opción activa pero conserva el valor escrito', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(cityInput(), { key: 'Escape' });
    expect(cityInput().getAttribute('aria-activedescendant')).toBeNull();
    expect((cityInput() as HTMLInputElement).value).toBe('Neiva');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('una selección sin admin1 conserva nombre y país en el campo y resumen', async () => {
    const withoutRegion: Location = { id: 94, name: 'Cali', country: 'Colombia', latitude: 3.45, longitude: -76.52 };
    mockSearchCities.mockResolvedValueOnce([withoutRegion]);
    render(<App />);
    await search('Cali');
    fireEvent.click(screen.getByRole('option'));
    expect((cityInput() as HTMLInputElement).value).toBe('Cali, Colombia');
    expect(activeLocationText('Cali, Colombia')).toBeTruthy();
    expect(screen.getByText('Latitud: 3.45')).toBeTruthy();
  });

  it('una opción elegida con pointer/click sigue el mismo manejador de selección', async () => {
    const onSelect = vi.fn();
    render(<CitySearch activeLocation={null} onSelectLocation={onSelect} />);
    await search('Neiva');
    const option = screen.getAllByRole('option')[0]!;
    fireEvent.pointerDown(option, { pointerType: 'touch' });
    fireEvent.pointerUp(option, { pointerType: 'touch' });
    fireEvent.click(option);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith(locations[0]);
  });

  it('una opción activa por teclado no se anuncia como ubicación seleccionada', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]!.getAttribute('aria-selected')).toBe('false');
  });

  it('al confirmar por Enter la opción deja de estar activa y se anuncia la selección', async () => {
    render(<App />);
    await search('Neiva');
    fireEvent.keyDown(cityInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(cityInput(), { key: 'Enter' });
    expect(cityInput().getAttribute('aria-activedescendant')).toBeNull();
    expect(screen.getAllByRole('status').some((status) => status.textContent?.includes('Ubicación seleccionada'))).toBe(true);
  });

  it('la lista se cierra al limpiar la consulta y no deja referencias ARIA', async () => {
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Neiva');
    fireEvent.change(cityInput(), { target: { value: '' } });
    expect(cityInput().getAttribute('aria-expanded')).toBe('false');
    expect(cityInput().getAttribute('aria-controls')).toBeNull();
    expect(cityInput().getAttribute('aria-activedescendant')).toBeNull();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('los datos externos con apariencia HTML en región siguen siendo texto', async () => {
    const hostileRegion: Location = { id: 95, name: 'Cali', admin1: '<img src=x onerror=alert(1)>', country: 'Colombia', latitude: 3.45, longitude: -76.52 };
    mockSearchCities.mockResolvedValueOnce([hostileRegion]);
    render(<CitySearch activeLocation={null} onSelectLocation={vi.fn()} />);
    await search('Cali');
    expect(screen.getByRole('option').textContent).toContain('<img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
  });

  it('integra selección de ciudad, clima actual, vistas y recarga por rango', async () => {
    const payload = {
      latitude: 2.9, longitude: -75.3, elevation: 442, timezone: 'America/Bogota', timezone_abbreviation: '-05',
      current: { time: '2026-09-25T10:00', temperature_2m: 27, apparent_temperature: 28, relative_humidity_2m: 60, precipitation: 0, weather_code: 0, wind_speed_10m: 5, wind_direction_10m: 90 },
      hourly: { time: ['2026-09-25T10:00'], temperature_2m: [27], apparent_temperature: [28], precipitation_probability: [10], precipitation: [0], wind_speed_10m: [5], uv_index: [3], weather_code: [0] },
      daily: { time: ['2026-09-25'], weather_code: [0], temperature_2m_max: [31], temperature_2m_min: [20], precipitation_sum: [1.2], precipitation_probability_max: [20], wind_speed_10m_max: [12], uv_index_max: [6], sunrise: ['2026-09-25T05:45'], sunset: ['2026-09-25T17:55'], daylight_duration: [43800] },
    };
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } }))));
    render(<App />);
    await search('Neiva');
    fireEvent.click(screen.getAllByRole('option')[0]!);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByRole('region', { name: 'Clima actual' })).toBeTruthy();
    expect(activeLocationText('Neiva, Colombia')).toBeTruthy();
    expect(currentWeatherLocationText('Neiva, Colombia')).toBeTruthy();
    expect(screen.getByText('27 °C')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Pronóstico diario' })).toBeTruthy();
    expect(screen.getByText('31 °C')).toBeTruthy();
    const callsBeforeViewChange = vi.mocked(fetch).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Horario' }));
    expect(screen.getByRole('heading', { name: 'Pronóstico horario' })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Pronóstico horario' })).getByText('10:00')).toBeTruthy();
    expect(vi.mocked(fetch).mock.calls).toHaveLength(callsBeforeViewChange);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Días de pronóstico' }), { target: { value: '3' } });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsBeforeViewChange + 1);
    const lastUrl = new URL(String(vi.mocked(fetch).mock.calls.at(-1)?.[0]));
    expect(lastUrl.searchParams.get('forecast_days')).toBe('3');
    expect(lastUrl.searchParams.get('latitude')).toBe('2.9');
    expect(screen.getByRole('heading', { name: 'Pronóstico horario' })).toBeTruthy();
    expect(activeLocationText('Neiva, Colombia')).toBeTruthy();
  });

  it('limpia la búsqueda de inmediato y devuelve el foco al campo', async () => {
    renderCitySearch();
    await search('Neiva');
    expect(screen.getByRole('listbox')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect((cityInput() as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(cityInput());
    expect(screen.queryByRole('listbox')).toBeNull();
    await elapse(300);
    expect(mockSearchCities).toHaveBeenCalledTimes(1);
  });

  it('espera al fin de una composición de texto antes de consultar', async () => {
    renderCitySearch();
    fireEvent.compositionStart(cityInput());
    fireEvent.change(cityInput(), { target: { value: 'Tokio' } });
    await elapse(400);
    expect(mockSearchCities).not.toHaveBeenCalled();
    fireEvent.compositionEnd(cityInput());
    await elapse(300);
    expect(mockSearchCities).toHaveBeenCalledWith('Tokio', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('compara 2 a 4 ciudades mediante la búsqueda existente y rechaza duplicados y una quinta', async () => {
    const comparisonResults: Location[] = [
      { id: 31, name: 'Neiva', admin1: 'Huila', country: 'Colombia', latitude: 2.93, longitude: -75.28 },
      { id: 32, name: 'Bogotá', admin1: 'Cundinamarca', country: 'Colombia', latitude: 4.71, longitude: -74.07 },
      { id: 33, name: 'Medellín', admin1: 'Antioquia', country: 'Colombia', latitude: 6.25, longitude: -75.56 },
      { id: 34, name: 'Cali', admin1: 'Valle del Cauca', country: 'Colombia', latitude: 3.45, longitude: -76.53 },
      { id: 35, name: 'Pasto', admin1: 'Nariño', country: 'Colombia', latitude: 1.21, longitude: -77.28 },
    ];
    mockSearchCities.mockResolvedValue(comparisonResults);
    render(<App />);
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Comparar ciudades' }));
    expect(await screen.findByText('Agregue al menos dos ciudades para comparar.')).toBeTruthy();
    vi.useFakeTimers();
    const comparisonInput = () => screen.getAllByRole('combobox', { name: 'Nombre de la ciudad' })[1]!;
    async function findAndAdd(name: string) {
      fireEvent.change(comparisonInput(), { target: { value: name } });
      await elapse(300);
      fireEvent.click(screen.getByRole('option', { name: new RegExp(name) }));
    }
    await findAndAdd('Neiva');
    expect(screen.getByText('Agregue al menos dos ciudades para comparar.')).toBeTruthy();
    await findAndAdd('Bogotá');
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(screen.getByRole('table', { name: /Clima actual por ciudad/ })).toBeTruthy();
    await findAndAdd('Medellín');
    await findAndAdd('Cali');
    await findAndAdd('Pasto');
    expect(screen.getByText('Puede comparar hasta 4 ciudades a la vez.')).toBeTruthy();
    await findAndAdd('Neiva');
    expect(screen.getByText('Esta ubicación ya está en la comparación.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quitar Neiva de la comparación' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quitar Cali de la comparación' })).toBeTruthy();
    expect(screen.queryByText('Pasto', { selector: 'li span' })).toBeNull();
  });

});
