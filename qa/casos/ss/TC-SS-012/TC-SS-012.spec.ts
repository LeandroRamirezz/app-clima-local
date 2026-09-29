import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-012
 * Nombre / Escenario: Propagación del cambio de unidades a todos los módulos sin perder la ubicación, y error al reconsultar
 * Módulo / Endpoint: Selector de unidades + /v1/forecast, /v1/archive, comparación (RF-04)
 * Tipo de prueba: Integración
 * Prioridad: Media
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que un cambio de unidad se aplique de inmediato a todos los módulos (clima actual, pronóstico,
 * comparación e histórico), conservando la ubicación y el contexto (fecha histórica, ciudades comparadas); y
 * que, si la reconsulta falla, se conserven los últimos datos con su unidad anterior claramente rotulada.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-012__2026-09-29__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-012', 'evidencias', RUN_ID);
const E05 = 'El servicio meteorológico no está disponible en este momento. Intente más tarde.';

type Req = { t: number; url: URL; status: number | null; body: any };

function fmt(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/D';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value);
}
const unitsOf = (u: URL) => `${u.searchParams.get('temperature_unit')}/${u.searchParams.get('wind_speed_unit')}/${u.searchParams.get('precipitation_unit')}`;

async function openPrefs(page: Page) {
  const prefs = page.locator('details.current-weather__preferences');
  await expect(prefs).toBeVisible({ timeout: 15000 });
  if (!(await prefs.evaluate((el) => (el as HTMLDetailsElement).open))) await prefs.locator('summary').first().click();
}

async function setUnits(page: Page, t: string, v: string, p: string) {
  await openPrefs(page);
  await page.locator('#temperature-unit').selectOption(t);
  await page.locator('#wind-unit').selectOption(v);
  await page.locator('#precipitation-unit').selectOption(p);
}

async function comparisonRow(page: Page, label: string) {
  return (await page.locator('.city-comparison__table').first().locator('tbody tr')
    .filter({ has: page.locator('th', { hasText: new RegExp(`^${label}$`) }) })
    .locator('td').allInnerTexts()).map((t) => t.trim());
}

test.describe('TC-SS-012: Propagación del cambio de unidades (RF-10, RF-04, RF-05)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(150000);

  test('Neiva: °C/km/h/mm → °F/mph/in en clima, pronóstico, comparación e histórico; error 500 al reconsultar', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Registro de solicitudes a /v1/forecast y /v1/archive (equivalente a DevTools > Network)
    const forecast: Req[] = [];
    const archive: Req[] = [];
    let fail500OnFahrenheit = false;
    await page.route('**/api.open-meteo.com/v1/forecast**', async (route) => {
      const entry: Req = { t: Date.now(), url: new URL(route.request().url()), status: null, body: null };
      forecast.push(entry);
      if (fail500OnFahrenheit && entry.url.searchParams.get('temperature_unit') === 'fahrenheit') {
        entry.status = 500;
        await route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' });
        return;
      }
      const response = await route.fetch();
      const text = await response.text();
      entry.status = response.status();
      entry.body = JSON.parse(text);
      await route.fulfill({ response, body: text });
    });
    await page.route('**/archive-api.open-meteo.com/v1/archive**', async (route) => {
      const entry: Req = { t: Date.now(), url: new URL(route.request().url()), status: null, body: null };
      archive.push(entry);
      const response = await route.fetch();
      const text = await response.text();
      entry.status = response.status();
      entry.body = JSON.parse(text);
      await route.fulfill({ response, body: text });
    });

    // ---- Precondiciones: Neiva con clima y pronóstico; histórico 15/09/2026; comparación Neiva + Bogotá (°C/km/h/mm)
    await page.goto('/');
    const mainSearch = page.locator('.location-options .city-search');
    await mainSearch.getByRole('combobox', { name: /Nombre de la ciudad/i }).fill('Neiva');
    await mainSearch.getByRole('listbox', { name: /Ubicaciones encontradas/i }).getByRole('option', { name: /Neiva.*Huila/i }).first().click();
    await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);
    await expect(page.locator('.current-weather__temperature strong')).toContainText('°C', { timeout: 15000 });
    await expect(page.locator('.forecast-panel__day').first()).toBeVisible();
    const climateBefore = (await page.locator('.current-weather__temperature strong').innerText()).trim();

    await page.getByRole('button', { name: 'Históricos', exact: true }).click();
    await page.locator('#historical-start-date').fill('2026-09-15');
    await page.locator('#historical-end-date').fill('2026-09-15');
    await page.getByRole('button', { name: 'Consultar histórico' }).click();
    await expect(page.locator('.historical-weather__results h3')).toHaveText('Histórico — 15/09/2026', { timeout: 20000 });
    const historyBefore = (await page.locator('.historical-weather__table tbody tr td').allInnerTexts()).map((t) => t.trim());

    await page.getByRole('button', { name: 'Comparar ciudades', exact: true }).click();
    const setup = page.locator('.current-weather__comparison-setup');
    await setup.getByRole('button', { name: /Agregar ubicación seleccionada/ }).click();
    await setup.getByRole('combobox', { name: /Nombre de la ciudad/i }).fill('Bogotá');
    await setup.getByRole('listbox', { name: /Ubicaciones encontradas/i }).getByRole('option', { name: /Bogotá.*Colombia/i }).first().click();
    await expect(page.locator('.city-comparison__table').first()).toBeVisible({ timeout: 20000 });
    await expect.poll(async () => (await comparisonRow(page, 'Temperatura')).every((v) => v.endsWith('°C')), { timeout: 20000 }).toBe(true);
    const comparisonCities = (await page.locator('.city-comparison__table').first().locator('thead th').allInnerTexts()).slice(1).map((t) => t.trim());
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'pre-comparacion-celsius.png'), fullPage: true });

    // ---- Paso 1: cambiar a °F / mph / in (desde la pestaña visible: Comparar ciudades)
    const changeAt = Date.now();
    await setUnits(page, 'fahrenheit', 'mph', 'inch');
    await expect.poll(async () => {
      const t = await comparisonRow(page, 'Temperatura');
      return t.length === 2 && t.every((v) => v.endsWith('°F'));
    }, { timeout: 15000 }).toBe(true);
    const comparisonUpdateMs = Date.now() - changeAt;
    const cmp = {
      ciudades: (await page.locator('.city-comparison__table').first().locator('thead th').allInnerTexts()).slice(1).map((t) => t.trim()),
      temperatura: await comparisonRow(page, 'Temperatura'),
      sensacion: await comparisonRow(page, 'Sensación térmica'),
      precipitacion: await comparisonRow(page, 'Precipitación'),
      viento: await comparisonRow(page, 'Viento'),
    };
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso1-3-comparacion-fahrenheit.png'), fullPage: true });
    const cmpRequests = forecast.filter((r) => r.t >= changeAt && unitsOf(r.url) === 'fahrenheit/mph/inch');
    const cmpExpected = cmpRequests.slice(-2).map((r) => ({
      lat: r.url.searchParams.get('latitude'),
      temperatura: `${fmt(r.body?.current?.temperature_2m)} °F`,
      viento: `${fmt(r.body?.current?.wind_speed_10m)} mph`,
      precipitacion: `${fmt(r.body?.current?.precipitation)} in`,
    }));

    // ---- Clima actual y pronóstico (al volver a la pestaña Clima)
    const climaAt = Date.now();
    await page.getByRole('button', { name: 'Clima', exact: true }).click();
    await expect(page.locator('.current-weather__temperature strong')).toContainText('°F', { timeout: 15000 });
    const climaUpdateMs = Date.now() - climaAt;
    const climaReq = forecast.filter((r) => r.t >= climaAt && unitsOf(r.url) === 'fahrenheit/mph/inch').at(-1);
    const clima = {
      ubicacion: (await page.locator('section.active-location').innerText()).replace(/\s+/g, ' ').trim(),
      temperatura: (await page.locator('.current-weather__temperature strong').innerText()).trim(),
      esperado_temperatura: climaReq ? `${fmt(climaReq.body.current.temperature_2m)} °F` : null,
      pronostico_max: (await page.locator('.forecast-panel__day').first().locator('.forecast-panel__metrics div').first().locator('dd').innerText()).trim(),
      esperado_pronostico_max: climaReq ? `${fmt(climaReq.body.daily.temperature_2m_max[0])} °F` : null,
      texto_panel: await page.locator('.current-weather__card').innerText() + '\n' + await page.locator('.forecast-panel__days').innerText(),
    };
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso1-3-clima-y-pronostico-fahrenheit.png'), fullPage: true });

    // ---- Histórico (al volver a la pestaña Históricos)
    const histAt = Date.now();
    await page.getByRole('button', { name: 'Históricos', exact: true }).click();
    await expect(page.locator('section.historical-weather')).toBeVisible();
    await page.waitForTimeout(2000);
    const hist = {
      fecha_inicial: await page.locator('#historical-start-date').inputValue(),
      fecha_final: await page.locator('#historical-end-date').inputValue(),
      resultados_visibles: (await page.locator('.historical-weather__results').count()) > 0,
      encabezado: (await page.locator('.historical-weather__results h3').count()) > 0 ? (await page.locator('.historical-weather__results h3').innerText()).trim() : null,
      valores: (await page.locator('.historical-weather__table tbody tr td').allInnerTexts()).map((t) => t.trim()),
      solicitudes_archive_tras_cambio: archive.filter((r) => r.t >= changeAt).map((r) => ({ start_date: r.url.searchParams.get('start_date'), unidades: unitsOf(r.url), http: r.status })),
      tiempo_desde_apertura_ms: Date.now() - histAt,
    };
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso4-historico-tras-cambio.png'), fullPage: true });

    // ---- Pasos 5 y 6: volver a °C/km/h/mm, HTTP 500 en la reconsulta y cambiar a °F
    await page.getByRole('button', { name: 'Clima', exact: true }).click();
    await setUnits(page, 'celsius', 'kmh', 'mm');
    await expect(page.locator('.current-weather__temperature strong')).toContainText('°C', { timeout: 15000 });
    const celsiusShown = (await page.locator('.current-weather__temperature strong').innerText()).trim();
    fail500OnFahrenheit = true;
    const errorAt = Date.now();
    await page.locator('#temperature-unit').selectOption('fahrenheit');
    const alert = page.locator('.current-weather__error[role="alert"]');
    await expect(alert).toBeVisible({ timeout: 15000 });
    const err = {
      tiempo_hasta_error_ms: Date.now() - errorAt,
      solicitud_fallida: forecast.filter((r) => r.t >= errorAt).map((r) => ({ unidades: unitsOf(r.url), http: r.status })),
      mensaje: (await alert.locator('span').innerText()).trim(),
      boton_reintentar: await alert.getByRole('button', { name: 'Reintentar' }).isVisible(),
      tarjeta_clima_visible: await page.locator('.current-weather__card').isVisible(),
      pronostico_visible: (await page.locator('.forecast-panel__day').count()) > 0,
      temperatura_visible: (await page.locator('.current-weather__temperature strong').count()) > 0 ? (await page.locator('.current-weather__temperature strong').innerText()).trim() : null,
      ultima_temperatura_en_celsius: celsiusShown,
      selector_temperatura: await page.locator('#temperature-unit').inputValue(),
    };
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso5-6-error-500-reconsulta.png'), fullPage: true });
    fail500OnFahrenheit = false;

    const summary = {
      precondiciones: { clima_celsius: climateBefore, historico_celsius: historyBefore, ciudades_comparadas: comparisonCities },
      comparacion: { ...cmp, esperado_por_solicitud: cmpExpected, solicitudes_fahrenheit: cmpRequests.map((r) => r.url.searchParams.get('latitude')), tiempo_actualizacion_ms: comparisonUpdateMs },
      clima: { ...clima, texto_panel: undefined, unidades_celsius_visibles: /°C/.test(clima.texto_panel), tiempo_actualizacion_ms: climaUpdateMs, solicitud: climaReq?.url.toString() ?? null },
      historico: hist,
      error_reconsulta: err,
      errores_consola: pageErrors,
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'resumen-propagacion-unidades.json'), JSON.stringify(summary, null, 2));

    // Comparación
    expect.soft(cmp.ciudades, 'Comparación conserva sus ciudades').toEqual(comparisonCities);
    expect.soft(cmpRequests.length, 'Reconsulta de cada ciudad con °F/mph/in').toBeGreaterThanOrEqual(2);
    expect.soft(cmp.temperatura, 'Comparación = API').toEqual(cmpExpected.map((e) => e.temperatura));
    expect.soft(cmp.viento.every((v) => v.endsWith('mph'))).toBe(true);
    expect.soft(cmp.precipitacion.every((v) => v.endsWith('in'))).toBe(true);
    expect.soft(comparisonUpdateMs, 'Comparación actualizada < 2 s').toBeLessThan(2000);
    // Clima y pronóstico
    expect.soft(clima.ubicacion).toContain('Neiva, Huila');
    expect.soft(clima.temperatura).toBe(clima.esperado_temperatura);
    expect.soft(clima.pronostico_max).toBe(clima.esperado_pronostico_max);
    expect.soft(summary.clima.unidades_celsius_visibles, 'Sin °C en clima').toBe(false);
    expect.soft(climaUpdateMs, 'Clima actualizado < 2 s').toBeLessThan(2000);
    // Histórico
    expect.soft(`${hist.fecha_inicial}|${hist.fecha_final}`, 'Histórico conserva la fecha 15/09/2026').toBe('2026-09-15|2026-09-15');
    expect.soft(hist.solicitudes_archive_tras_cambio.some((r) => r.start_date === '2026-09-15' && r.unidades === 'fahrenheit/mph/inch'), 'Reconsulta de /v1/archive con °F/mph/in').toBe(true);
    expect.soft(hist.encabezado, 'Histórico visible para 15/09/2026').toBe('Histórico — 15/09/2026');
    // Error al reconsultar
    expect.soft(err.mensaje).toBe(E05);
    expect.soft(err.boton_reintentar).toBe(true);
    expect.soft(err.tarjeta_clima_visible, 'Se conservan los últimos datos').toBe(true);
    expect.soft(err.temperatura_visible, 'Últimos datos rotulados en °C').toBe(celsiusShown);
    expect(pageErrors).toHaveLength(0);
  });
});
