import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page, type Response } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-011
 * Nombre / Escenario: Unidades por defecto y alternancia °C/°F, km/h/mph y mm/in con coincidencia de la API
 * Módulo / Endpoint: Selector de unidades + GET /v1/forecast (temperature_unit, wind_speed_unit, precipitation_unit)
 * Tipo de prueba: Funcional
 * Prioridad: Media
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que las unidades por defecto sean °C, km/h y mm, que el usuario pueda alternar cada una, que la
 * conversión la haga la API (parámetros de unidad en la solicitud, sin cálculo en el cliente) y que los valores
 * y etiquetas mostrados coincidan con la respuesta; además, que la elevación (m) y los contaminantes (µg/m³)
 * no cambien.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-011__2026-09-29__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-011', 'evidencias', RUN_ID);

type Units = { t: 'celsius' | 'fahrenheit'; v: 'kmh' | 'mph'; p: 'mm' | 'inch' };
const LABEL = {
  celsius: '°C', fahrenheit: '°F', kmh: 'km/h', mph: 'mph', mm: 'mm', inch: 'in',
} as const;
// Patrones de unidades "prohibidas" (la no seleccionada) dentro del panel de clima
const OTHER_UNIT = {
  celsius: /°F/, fahrenheit: /°C/, kmh: /\bmph\b/, mph: /km\/h/, mm: /\d in\b/, inch: /\d mm\b/,
} as const;

const COMBOS: { id: number; slug: string; units: Units }[] = [
  { id: 1, slug: 'c1-celsius-kmh-mm', units: { t: 'celsius', v: 'kmh', p: 'mm' } },
  { id: 2, slug: 'c2-fahrenheit-kmh-mm', units: { t: 'fahrenheit', v: 'kmh', p: 'mm' } },
  { id: 3, slug: 'c3-celsius-mph-mm', units: { t: 'celsius', v: 'mph', p: 'mm' } },
  { id: 4, slug: 'c4-celsius-kmh-inch', units: { t: 'celsius', v: 'kmh', p: 'inch' } },
  { id: 5, slug: 'c5-fahrenheit-mph-inch', units: { t: 'fahrenheit', v: 'mph', p: 'inch' } },
];

function fmt(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/D';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value);
}
const measure = (value: unknown, unit: string) => (fmt(value) === 'N/D' ? 'N/D' : `${fmt(value)} ${unit}`);

function isForecastFor(res: Response, u: Units) {
  if (!res.url().includes('api.open-meteo.com/v1/forecast')) return false;
  const q = new URL(res.url()).searchParams;
  return q.get('temperature_unit') === u.t && q.get('wind_speed_unit') === u.v && q.get('precipitation_unit') === u.p;
}

async function openPrefs(page: Page) {
  const prefs = page.locator('details.current-weather__preferences');
  await expect(prefs).toBeVisible({ timeout: 15000 });
  if (!(await prefs.evaluate((el) => (el as HTMLDetailsElement).open))) await prefs.locator('summary').first().click();
}

async function readPanel(page: Page) {
  const metric = (label: string) => page.locator('.current-weather__metric').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');
  const days = page.locator('.forecast-panel__day');
  const dayCount = await days.count();
  const daily: string[][] = [];
  for (let i = 0; i < dayCount; i += 1) {
    const dd = (label: string) => days.nth(i).locator('.forecast-panel__metrics div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) }).locator('dd');
    daily.push([(await dd('Máxima').innerText()).trim(), (await dd('Mínima').innerText()).trim(), (await dd('Precipitación').innerText()).trim(), (await dd('Viento máx.').innerText()).trim()]);
  }
  return {
    temperatura: (await page.locator('.current-weather__temperature strong').innerText()).trim(),
    sensacion: (await metric('Sensación térmica').innerText()).trim(),
    precipitacion: (await metric('Precipitación').innerText()).trim(),
    viento: (await metric('Viento').innerText()).trim(),
    elevacion: (await page.locator('.current-weather__elevation').innerText()).trim(),
    diario: daily,
  };
}

function expectedPanel(body: any, u: Units) {
  const T = LABEL[u.t], V = LABEL[u.v], P = LABEL[u.p];
  return {
    temperatura: measure(body.current.temperature_2m, T),
    sensacion: measure(body.current.apparent_temperature, T),
    precipitacion: measure(body.current.precipitation, P),
    viento: measure(body.current.wind_speed_10m, V),
    diario: body.daily.time.map((_: string, i: number) => [
      measure(body.daily.temperature_2m_max[i], T),
      measure(body.daily.temperature_2m_min[i], T),
      measure(body.daily.precipitation_sum[i], P),
      measure(body.daily.wind_speed_10m_max[i], V),
    ]),
  };
}

async function readAirQuality(page: Page) {
  await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
  await expect(page.locator('.air-quality__pollutant').first()).toBeVisible({ timeout: 20000 });
  const values = (await page.locator('.air-quality__pollutant dd').allInnerTexts()).map((t) => t.trim());
  const aqi = (await page.locator('.air-quality__aqi strong').innerText().catch(() => 'N/D')).trim();
  await page.getByRole('button', { name: 'Clima', exact: true }).click();
  await expect(page.locator('.current-weather__temperature strong')).toBeVisible({ timeout: 15000 });
  return { aqi, contaminantes: values };
}

test.describe('TC-SS-011: Unidades por defecto y alternancia (RF-10)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(150000);

  test('Neiva: 5 combinaciones de unidades, elevación, contaminantes y operación por teclado', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Paso 1: primera visita (contexto nuevo de Playwright = localStorage vacío)
    await page.goto('/');
    const storedBefore = await page.evaluate(() => window.localStorage.length);
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Neiva');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    const firstForecast = page.waitForResponse((r) => isForecastFor(r, COMBOS[0].units), { timeout: 20000 });
    await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
    let response = await firstForecast;
    await expect(page.locator('.forecast-panel__day').first()).toBeVisible({ timeout: 15000 });
    await openPrefs(page);

    const selectState = async () => ({
      temperatura: await page.locator('#temperature-unit').inputValue(),
      viento: await page.locator('#wind-unit').inputValue(),
      precipitacion: await page.locator('#precipitation-unit').inputValue(),
      texto_visible: await page.locator('.current-weather__unit-grid select').evaluateAll((els) => els.map((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent)),
    });
    const defaults = await selectState();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso1-unidades-por-defecto.png'), fullPage: true });
    const airDefault = await readAirQuality(page);
    await openPrefs(page);

    // Pasos 2 a 4: combinaciones
    const results: Record<string, unknown>[] = [];
    let previous: Units = COMBOS[0].units;
    let celsiusBody: any = null;
    for (const combo of COMBOS) {
      const u = combo.units;
      if (combo.id > 1) {
        const wait = page.waitForResponse((r) => isForecastFor(r, u), { timeout: 20000 });
        if (u.t !== previous.t) await page.locator('#temperature-unit').selectOption(u.t);
        if (u.v !== previous.v) await page.locator('#wind-unit').selectOption(u.v);
        if (u.p !== previous.p) await page.locator('#precipitation-unit').selectOption(u.p);
        response = await wait;
      }
      const body = await response.json();
      const q = new URL(response.url()).searchParams;
      await expect(page.locator('.current-weather__temperature strong')).toHaveText(expectedPanel(body, u).temperatura, { timeout: 15000 });
      const shown = await readPanel(page);
      const expected = expectedPanel(body, u);
      const panelText = await page.locator('.current-weather__card').innerText() + '\n' + await page.locator('.forecast-panel__days').innerText();
      const wrongUnits = [OTHER_UNIT[u.t], OTHER_UNIT[u.v], OTHER_UNIT[u.p]].filter((re) => re.test(panelText)).map(String);
      if (combo.id === 1) celsiusBody = body;
      // Control de conversión hecha por la API: F ≈ C × 9/5 + 32 (misma hora de la API)
      const control = u.t === 'fahrenheit' && celsiusBody && celsiusBody.current.time === body.current.time
        ? { c: celsiusBody.current.temperature_2m, f: body.current.temperature_2m, f_calculado: Math.round((celsiusBody.current.temperature_2m * 9 / 5 + 32) * 10) / 10 }
        : null;
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `${combo.slug}.png`), fullPage: true });

      const row = {
        combinacion: combo.id, unidades: u,
        solicitud: response.url(), http: response.status(),
        parametros: { temperature_unit: q.get('temperature_unit'), wind_speed_unit: q.get('wind_speed_unit'), precipitation_unit: q.get('precipitation_unit') },
        unidades_api: { current: body.current_units, daily: body.daily_units },
        mostrado: shown, esperado: expected,
        coincide_actual: shown.temperatura === expected.temperatura && shown.sensacion === expected.sensacion && shown.precipitacion === expected.precipitacion && shown.viento === expected.viento,
        coincide_diario: JSON.stringify(shown.diario) === JSON.stringify(expected.diario),
        unidades_no_seleccionadas_visibles: wrongUnits,
        control_conversion: control,
      };
      results.push(row);
      expect.soft(response.status()).toBe(200);
      expect.soft(row.parametros, `C${combo.id}: parámetros de unidad`).toEqual({ temperature_unit: u.t, wind_speed_unit: u.v, precipitation_unit: u.p });
      expect.soft({ ...shown, elevacion: undefined }, `C${combo.id}: valores = API`).toEqual({ ...expected, elevacion: undefined });
      expect.soft(wrongUnits, `C${combo.id}: unidades distintas a la seleccionada`).toEqual([]);
      if (control) expect.soft(Math.abs(control.f - control.f_calculado), 'Control °F ≈ °C×9/5+32').toBeLessThanOrEqual(0.2);
      previous = u;
    }

    // Paso 5: elevación y contaminantes con °F / mph / in
    const elevations = results.map((r) => (r.mostrado as { elevacion: string }).elevacion);
    const airImperial = await readAirQuality(page);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso5-elevacion-con-f-mph-in.png'), fullPage: true });
    expect.soft(new Set(elevations).size, 'Elevación igual en todas las combinaciones').toBe(1);
    expect.soft(elevations[0]).toMatch(/m s\. n\. m\.$/);
    expect.soft(airImperial.contaminantes, 'Contaminantes sin cambio').toEqual(airDefault.contaminantes);
    for (const v of airImperial.contaminantes) expect.soft(v).toMatch(/([µμ]g\/m³|N\/D)$/);

    // Paso 6: operación con teclado y estado perceptible
    await openPrefs(page);
    const resetWait = page.waitForResponse((r) => isForecastFor(r, COMBOS[0].units), { timeout: 20000 });
    await page.locator('#temperature-unit').selectOption('celsius');
    await page.locator('#wind-unit').selectOption('kmh');
    await page.locator('#precipitation-unit').selectOption('mm');
    await resetWait;
    await page.locator('details.current-weather__preferences > summary').focus();
    await page.keyboard.press('Enter'); // cierra
    await page.keyboard.press('Enter'); // abre con teclado
    const keyboardSteps: Record<string, unknown>[] = [];
    const keyWait = page.waitForResponse((r) => isForecastFor(r, { t: 'fahrenheit', v: 'mph', p: 'inch' }), { timeout: 30000 });
    for (const [id, name, target] of [['temperature-unit', 'Temperatura', 'fahrenheit'], ['wind-unit', 'Viento', 'mph'], ['precipitation-unit', 'Precipitación', 'inch']] as const) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.id ?? null);
      await page.keyboard.press('ArrowDown');
      const select = page.getByRole('combobox', { name, exact: true });
      await expect(select).toHaveValue(target);
      keyboardSteps.push({
        tecla_tab_enfoca: focused, esperado: id, valor_tras_flecha: await select.inputValue(),
        nombre_accesible: name, opcion_anunciada: await select.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent),
        arbol_accesibilidad: await select.ariaSnapshot(),
      });
    }
    const keyResponse = await keyWait;
    await expect(page.locator('.current-weather__temperature strong')).toContainText('°F', { timeout: 15000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso6-operacion-teclado.png'), fullPage: true });
    for (const s of keyboardSteps) expect.soft(s.tecla_tab_enfoca, `Tab debe enfocar ${s.esperado}`).toBe(s.esperado);

    const summary = {
      localstorage_inicial: storedBefore,
      paso1_selector_por_defecto: defaults,
      combinaciones: results,
      paso5: { elevacion_por_combinacion: elevations, calidad_aire_por_defecto: airDefault, calidad_aire_f_mph_in: airImperial },
      paso6_teclado: { pasos: keyboardSteps, solicitud_resultante: keyResponse.url() },
      errores_consola: pageErrors,
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'resumen-unidades.json'), JSON.stringify(summary, null, 2));

    expect.soft(defaults.temperatura).toBe('celsius');
    expect.soft(defaults.viento).toBe('kmh');
    expect.soft(defaults.precipitacion).toBe('mm');
    expect.soft(defaults.texto_visible).toEqual(['°C', 'km/h', 'mm']);
    expect(pageErrors).toHaveLength(0);
  });
});
