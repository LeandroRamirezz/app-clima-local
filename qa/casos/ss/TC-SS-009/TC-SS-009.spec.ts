import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-009
 * Nombre / Escenario: Degradación controlada: ubicación sin cobertura (AQI nulo) y contaminante individual nulo
 * Módulo / Endpoint: GET /v1/air-quality (respuesta interceptada)
 * Tipo de prueba: Funcional
 * Prioridad: Media
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que, si la ubicación no tiene datos de calidad del aire (AQI nulo) o un contaminante llega
 * nulo, la aplicación lo informe de forma controlada sin romper la sección ni el resto de la app.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-009__2026-09-29__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-009', 'evidencias', RUN_ID);

const CURRENT_VARS = ['us_aqi', 'pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide'];
const POLLUTANTS = ['pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide'];
const NULL_OFFSETS = [2, 10, 20]; // posiciones nulas dentro de las 24 h a partir de la hora actual
const FORBIDDEN = /\bnull\b|\bNaN\b|\bundefined\b/;

function fmt(value: unknown, fractionDigits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/D';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: fractionDigits }).format(value);
}

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`); });
  return errors;
}

async function openAirQuality(page: Page, mutate: (body: any) => void) {
  const captured: { body: any } = { body: null };
  await page.route('**/air-quality-api.open-meteo.com/v1/air-quality**', async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    mutate(body);
    captured.body = body;
    await route.fulfill({ response, json: body });
  });

  await page.goto('/');
  const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  await searchInput.fill('Neiva');
  const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  await expect(listbox).toBeVisible({ timeout: 10000 });
  await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
  await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);
  // Precondición: panel de clima actual (RF-01) cargado
  await expect(page.locator('.current-weather__location')).toContainText(/Neiva/i, { timeout: 15000 });

  await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
  const section = page.locator('section.air-quality');
  await expect(section.locator('.air-quality__current')).toBeVisible({ timeout: 20000 });
  return { section, captured };
}

test.describe('TC-SS-009: Degradación controlada en calidad del aire (RF-06)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(60000);

  test('Escenario A: todos los current.* nulos (sin cobertura)', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const errors = watchConsole(page);

    // Paso 1: escenario A
    const { section } = await openAirQuality(page, (body) => {
      for (const v of CURRENT_VARS) body.current[v] = null;
    });
    const unavailable = section.locator('.air-quality__unavailable');
    const message = (await unavailable.innerText().catch(() => '')).trim();
    const pollutants = (await section.locator('.air-quality__pollutant dd').allInnerTexts()).map((t) => t.trim());
    const hasAqiBlock = (await section.locator('.air-quality__aqi').count()) > 0;
    const sectionText = await section.innerText();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'escenario-A-sin-cobertura.png'), fullPage: true });

    // Paso 2: el resto de la app sigue operativo
    await page.getByRole('button', { name: 'Clima', exact: true }).click();
    const weatherOk = await page.locator('.current-weather__location').filter({ hasText: /Neiva/i }).isVisible({ timeout: 15000 }).catch(() => false);
    await expect(page.locator('.current-weather__location')).toContainText(/Neiva/i, { timeout: 15000 });
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Bogotá');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    const searchOk = (await listbox.getByRole('option', { name: /Bogotá/i }).count()) > 0;
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'escenario-A-resto-app-operativo.png'), fullPage: true });

    const result = {
      escenario: 'A', mensaje_mostrado: message, bloque_aqi_presente: hasAqiBlock, contaminantes_mostrados: pollutants,
      texto_prohibido: sectionText.match(FORBIDDEN)?.[0] ?? null, clima_actual_operativo: weatherOk, busqueda_operativa: searchOk, errores_consola: errors,
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'escenario-A.json'), JSON.stringify(result, null, 2));

    expect.soft(message).toBe('La calidad del aire no está disponible para esta ubicación.');
    expect.soft(hasAqiBlock, 'No debe mostrarse un AQI').toBe(false);
    expect.soft(pollutants).toEqual(Array(6).fill('N/D'));
    expect.soft(result.texto_prohibido).toBeNull();
    expect.soft(searchOk).toBe(true);
    expect(errors).toEqual([]);
  });

  test('Escenario B: us_aqi = 42 y sulphur_dioxide nulo', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const errors = watchConsole(page);

    // Paso 3: escenario B
    const { section, captured } = await openAirQuality(page, (body) => {
      body.current.us_aqi = 42;
      body.current.sulphur_dioxide = null;
    });
    const aqiBlock = section.locator('.air-quality__aqi');
    await expect(aqiBlock).toBeVisible();
    const aqi = (await aqiBlock.locator('strong').innerText()).trim();
    const category = (await aqiBlock.locator('.air-quality__category').innerText()).trim();
    const pollutants = (await section.locator('.air-quality__pollutant dd').allInnerTexts()).map((t) => t.trim());
    const expected = POLLUTANTS.map((v) => (captured.body.current[v] === null ? 'N/D' : `${fmt(captured.body.current[v])} ${captured.body.current_units[v]}`));
    const sectionText = await section.innerText();
    await section.locator('.air-quality__current').screenshot({ path: path.join(EVIDENCE_DIR, 'escenario-B-so2-nulo.png') });

    const result = {
      escenario: 'B', aqi_mostrado: aqi, categoria_mostrada: category,
      contaminantes: POLLUTANTS.map((v, i) => ({ variable: v, api: captured.body.current[v], esperado: expected[i], mostrado: pollutants[i] })),
      celdas_nd: POLLUTANTS.filter((_, i) => pollutants[i] === 'N/D'),
      texto_prohibido: sectionText.match(FORBIDDEN)?.[0] ?? null, errores_consola: errors,
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'escenario-B.json'), JSON.stringify(result, null, 2));

    expect.soft(aqi).toBe('42');
    expect.soft(category).toBe('Buena');
    expect.soft(pollutants).toEqual(expected);
    expect.soft(result.celdas_nd, 'N/D solo en SO₂').toEqual(['sulphur_dioxide']);
    expect.soft(result.texto_prohibido).toBeNull();
    expect(errors).toEqual([]);
  });

  test('Escenario C: hourly.us_aqi con 3 nulos dentro de las 24 h', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const errors = watchConsole(page);
    const nulledTimes: string[] = [];

    // Paso 4: escenario C
    const { section, captured } = await openAirQuality(page, (body) => {
      const currentHour = String(body.current.time).slice(0, 13);
      const start = body.hourly.time.findIndex((t: string) => t.slice(0, 13) === currentHour);
      for (const offset of NULL_OFFSETS) {
        body.hourly.us_aqi[start + offset] = null;
        nulledTimes.push(body.hourly.time[start + offset]);
      }
    });
    const hours = section.locator('.air-quality__hour');
    await expect(hours.first()).toBeVisible();
    const count = await hours.count();
    const trend: { time: string | null; aqi: string; categoria: string }[] = [];
    for (let i = 0; i < count; i += 1) {
      const h = hours.nth(i);
      trend.push({
        time: await h.locator('time').getAttribute('datetime'),
        aqi: (await h.locator('.air-quality__hour-aqi').innerText()).trim(),
        categoria: (await h.locator('p').nth(1).innerText()).trim(),
      });
    }
    const nullHours = trend.filter((t) => t.time && nulledTimes.includes(t.time));
    const otherHours = trend.filter((t) => !(t.time && nulledTimes.includes(t.time)));
    const sectionText = await section.innerText();
    await section.locator('.air-quality__trend').screenshot({ path: path.join(EVIDENCE_DIR, 'escenario-C-tendencia-con-nulos.png') });

    // Paso 5: consola
    const result = {
      escenario: 'C', horas_anuladas: nulledTimes, puntos_mostrados: count, horas_nulas_mostradas: nullHours,
      alguna_hora_nula_como_cero: nullHours.some((t) => /AQI: 0\b/.test(t.aqi)),
      horas_validas_con_nd: otherHours.filter((t) => t.aqi.includes('N/D')).length,
      tendencia: trend, texto_prohibido: sectionText.match(FORBIDDEN)?.[0] ?? null, errores_consola: errors,
      hourly_us_aqi_api: captured.body.hourly.us_aqi,
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'escenario-C.json'), JSON.stringify(result, null, 2));

    expect.soft(count, 'La tendencia sigue mostrando 24 puntos').toBe(24);
    expect.soft(nullHours).toHaveLength(3);
    for (const h of nullHours) {
      expect.soft(h.aqi, `${h.time}: AQI nulo`).toBe('AQI: N/D');
      expect.soft(h.categoria, `${h.time}: categoría`).toBe('Categoría N/D');
    }
    expect.soft(result.alguna_hora_nula_como_cero).toBe(false);
    expect.soft(result.horas_validas_con_nd).toBe(0);
    expect.soft(result.texto_prohibido).toBeNull();
    expect(errors).toEqual([]);
  });
});
