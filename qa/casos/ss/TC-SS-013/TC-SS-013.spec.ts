import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-013
 * Nombre / Escenario: Persistencia de la preferencia de unidades: recarga, valor corrupto y localStorage no disponible
 * Módulo / Endpoint: Preferencia de unidades (localStorage)
 * Tipo de prueba: Funcional
 * Prioridad: Media
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que la preferencia de unidades se guarde en localStorage y se aplique al volver a abrir la app; que un
 * valor alterado o inválido se ignore y se restablezcan los valores por defecto; que la app funcione sin error si
 * localStorage no está disponible, y que solo se guarden unidades (sin coordenadas ni datos de clima).
 *
 * Clave validada en el código (src/config/forecast.ts): FORECAST_UNITS_STORAGE_KEY = 'weather-app.units'.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-013__2026-09-29__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-013', 'evidencias', RUN_ID);
const KEY = 'weather-app.units';
const DEFAULTS = 'celsius/kmh/mm';
const IMPERIAL = 'fahrenheit/mph/inch';

function watchConsole(page: Page, sink: string[]) {
  page.on('pageerror', (err) => sink.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') sink.push(`console.error: ${msg.text()}`); });
}

// Selecciona Neiva y devuelve las unidades de la solicitud a /v1/forecast y del selector
async function loadNeiva(page: Page) {
  await page.getByRole('combobox', { name: /Nombre de la ciudad/i }).first().fill('Neiva');
  const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  await expect(listbox).toBeVisible({ timeout: 10000 });
  const forecast = page.waitForResponse((r) => r.url().includes('api.open-meteo.com/v1/forecast'), { timeout: 20000 });
  await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
  const res = await forecast;
  const q = new URL(res.url()).searchParams;
  await expect(page.locator('.current-weather__temperature strong')).toBeVisible({ timeout: 15000 });
  const prefs = page.locator('details.current-weather__preferences');
  if (!(await prefs.evaluate((el) => (el as HTMLDetailsElement).open))) await prefs.locator('summary').first().click();
  return {
    solicitud: `${q.get('temperature_unit')}/${q.get('wind_speed_unit')}/${q.get('precipitation_unit')}`,
    http: res.status(),
    selector: `${await page.locator('#temperature-unit').inputValue()}/${await page.locator('#wind-unit').inputValue()}/${await page.locator('#precipitation-unit').inputValue()}`,
    temperatura_mostrada: (await page.locator('.current-weather__temperature strong').innerText()).trim(),
    error_visible: (await page.locator('[role="alert"]').count()) > 0,
  };
}

async function setImperial(page: Page) {
  const wait = page.waitForResponse((r) => r.url().includes('temperature_unit=fahrenheit') && r.url().includes('wind_speed_unit=mph') && r.url().includes('precipitation_unit=inch'), { timeout: 20000 });
  await page.locator('#temperature-unit').selectOption('fahrenheit');
  await page.locator('#wind-unit').selectOption('mph');
  await page.locator('#precipitation-unit').selectOption('inch');
  const res = await wait;
  await expect(page.locator('.current-weather__temperature strong')).toContainText('°F', { timeout: 15000 });
  return res.status();
}

const readKey = (page: Page) => page.evaluate((k) => { try { return window.localStorage.getItem(k); } catch (e) { return `ERROR: ${(e as Error).name}`; } }, KEY);
const dumpStorage = (page: Page) => page.evaluate(() => {
  const all: Record<string, string | null> = {};
  for (let i = 0; i < window.localStorage.length; i += 1) { const k = window.localStorage.key(i)!; all[k] = window.localStorage.getItem(k); }
  return { localStorage: all, sessionStorage_claves: window.sessionStorage.length };
});

test.describe('TC-SS-013: Persistencia de la preferencia de unidades (RF-10, RNF-07)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(90000);

  test('Escenario A: guardar °F/mph/in, recargar, pestaña nueva y contenido de localStorage', async ({ context }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const errors: string[] = [];
    let page = await context.newPage();
    watchConsole(page, errors);
    await page.goto('/');
    const initial = await loadNeiva(page);
    await setImperial(page);
    const storedAfterChange = await readKey(page);

    // Paso 1: recarga (F5)
    await page.reload();
    const afterReload = await loadNeiva(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'escenario-A-tras-recarga.png'), fullPage: true });

    // Paso 2: cerrar la pestaña y abrir una nueva
    await page.close();
    page = await context.newPage();
    watchConsole(page, errors);
    await page.goto('/');
    const newTab = await loadNeiva(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'escenario-A-pestana-nueva.png'), fullPage: true });

    // Paso 3: contenido del almacenamiento (con una ubicación y datos de clima cargados)
    const storage = await dumpStorage(page);
    const serialized = JSON.stringify(storage.localStorage);
    const leaks = {
      coordenadas: /-?\d{1,3}\.\d{2,}/.test(serialized),
      nombre_de_ciudad: /Neiva|Huila|Colombia/i.test(serialized),
      datos_de_clima: /temperature_2m|current|daily|hourly|latitude|longitude|elevation/i.test(serialized),
    };

    const result = { inicial: initial, clave_tras_cambio: storedAfterChange, tras_recarga: afterReload, pestana_nueva: newTab, almacenamiento: storage, fugas: leaks, errores_consola: errors };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'escenario-A.json'), JSON.stringify(result, null, 2));

    expect.soft(initial.solicitud).toBe(DEFAULTS);
    expect.soft(JSON.parse(storedAfterChange ?? '{}')).toEqual({ temperature: 'fahrenheit', windSpeed: 'mph', precipitation: 'inch' });
    expect.soft(afterReload.solicitud, 'Tras recarga: solicitud').toBe(IMPERIAL);
    expect.soft(afterReload.selector, 'Tras recarga: selector').toBe(IMPERIAL);
    expect.soft(newTab.solicitud, 'Pestaña nueva: solicitud').toBe(IMPERIAL);
    expect.soft(newTab.selector, 'Pestaña nueva: selector').toBe(IMPERIAL);
    expect.soft(Object.keys(storage.localStorage), 'Solo la preferencia de unidades').toEqual([KEY]);
    expect.soft(leaks).toEqual({ coordenadas: false, nombre_de_ciudad: false, datos_de_clima: false });
    expect(errors).toEqual([]);
  });

  for (const sc of [
    { id: 'B', slug: 'escenario-B-json-corrupto', value: 'abc{', description: 'valor corrupto "abc{" (JSON inválido)' },
    { id: 'C', slug: 'escenario-C-objeto-invalido', value: JSON.stringify({ temperatura: 'kelvin', viento: 'nudos', precipitacion: 'cm' }), description: 'objeto con unidades inválidas' },
  ]) {
    test(`Escenario ${sc.id}: ${sc.description}`, async ({ page }) => {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      const errors: string[] = [];
      watchConsole(page, errors);

      await page.goto('/');
      await page.evaluate(([k, v]) => window.localStorage.setItem(k, v), [KEY, sc.value]);
      const written = await readKey(page);
      await page.reload();
      const afterReload = await loadNeiva(page);
      const keyAfterLoad = await readKey(page);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `${sc.slug}.png`), fullPage: true });
      await setImperial(page);
      const keyAfterChange = await readKey(page);

      const result = { valor_escrito: written, tras_recarga: afterReload, clave_tras_cargar: keyAfterLoad, clave_tras_cambiar_unidad: keyAfterChange, errores_consola: errors };
      fs.writeFileSync(path.join(EVIDENCE_DIR, `${sc.slug}.json`), JSON.stringify(result, null, 2));

      expect.soft(written).toBe(sc.value);
      expect.soft(afterReload.solicitud, 'Solicitud con unidades por defecto').toBe(DEFAULTS);
      expect.soft(afterReload.selector, 'Selector con unidades por defecto').toBe(DEFAULTS);
      expect.soft(afterReload.error_visible, 'Sin error visible').toBe(false);
      expect.soft(JSON.parse(keyAfterChange ?? '{}'), 'Clave sobrescrita al cambiar de unidad').toEqual({ temperature: 'fahrenheit', windSpeed: 'mph', precipitation: 'inch' });
      expect(errors).toEqual([]);
    });
  }

  test('Escenario D: localStorage lanza SecurityError al leer o escribir', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const errors: string[] = [];
    watchConsole(page, errors);
    await page.addInitScript(() => {
      const fail = () => { throw new DOMException('Acceso a localStorage bloqueado (simulado)', 'SecurityError'); };
      Storage.prototype.getItem = fail;
      Storage.prototype.setItem = fail;
    });

    await page.goto('/');
    const probe = await readKey(page);
    const initial = await loadNeiva(page);
    const changeStatus = await setImperial(page);
    const duringSession = {
      temperatura_mostrada: (await page.locator('.current-weather__temperature strong').innerText()).trim(),
      selector: `${await page.locator('#temperature-unit').inputValue()}/${await page.locator('#wind-unit').inputValue()}/${await page.locator('#precipitation-unit').inputValue()}`,
    };
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'escenario-D-cambio-en-sesion.png'), fullPage: true });
    await page.reload();
    const afterReload = await loadNeiva(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'escenario-D-tras-recarga.png'), fullPage: true });

    const result = { lectura_de_prueba: probe, inicial: initial, cambio_http: changeStatus, durante_sesion: duringSession, tras_recarga: afterReload, errores_consola: errors };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'escenario-D.json'), JSON.stringify(result, null, 2));

    expect.soft(probe).toBe('ERROR: SecurityError');
    expect.soft(initial.solicitud, 'Unidades por defecto').toBe(DEFAULTS);
    expect.soft(initial.error_visible).toBe(false);
    expect.soft(duringSession.selector, 'El cambio funciona durante la sesión').toBe(IMPERIAL);
    expect.soft(duringSession.temperatura_mostrada).toContain('°F');
    expect.soft(afterReload.solicitud, 'Tras recarga vuelve a los valores por defecto').toBe(DEFAULTS);
    expect.soft(afterReload.error_visible).toBe(false);
    expect(errors).toEqual([]);
  });
});
