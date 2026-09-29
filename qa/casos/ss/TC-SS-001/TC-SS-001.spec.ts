import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-001
 * Nombre / Escenario: Consulta histórica de un día válido (camino feliz) y coincidencia con la API
 * Módulo / Endpoint: GET /v1/archive (Historical Weather API Open-Meteo)
 * Tipo de prueba: Funcional
 * Prioridad: Alta
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que, para una fecha pasada válida, el sistema consulte /v1/archive con los parámetros
 * correctos y muestre temperatura máxima/mínima/media, precipitación acumulada, viento máximo y
 * humedad con valores 100 % iguales a los de la respuesta de la API (RF-05, RNF-11), la fecha en
 * formato DD/MM/AAAA y un indicador de carga mientras la respuesta está pendiente.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-001__2026-09-28__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-001', 'evidencias', RUN_ID);

const QUERY_DATE = '2026-09-15';
const QUERY_DATE_DISPLAY = '15/09/2026';
const ARTIFICIAL_DELAY_MS = 2000;

const EXPECTED_DAILY = [
  'temperature_2m_max',
  'temperature_2m_min',
  'temperature_2m_mean',
  'precipitation_sum',
  'wind_speed_10m_max',
  'relative_humidity_2m_mean',
];

// Misma regla de presentación de la app: es-CO, máximo 1 decimal (humedad: 0 decimales).
function formatValue(value: unknown, unit: string, fractionDigits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/D';
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: fractionDigits }).format(value)} ${unit}`;
}

test.describe('TC-SS-001: Consulta histórica de un día válido (RF-05, RNF-11)', () => {
  test.setTimeout(60000);

  test('Neiva 15/09/2026: parámetros correctos, indicador de carga y valores idénticos a la API', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Captura de la respuesta cruda de /v1/archive (equivalente a DevTools > Network) + retraso artificial
    let archiveUrl: URL | null = null;
    let archiveStatus: number | null = null;
    let archiveBody: Record<string, any> | null = null;
    let archiveResponseMs: number | null = null;
    await page.route('**/archive-api.open-meteo.com/v1/archive**', async (route) => {
      archiveUrl = new URL(route.request().url());
      const started = Date.now();
      const response = await route.fetch();
      archiveResponseMs = Date.now() - started;
      archiveStatus = response.status();
      const text = await response.text();
      archiveBody = JSON.parse(text);
      await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_DELAY_MS));
      await route.fulfill({ response, body: text });
    });

    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    // Precondición: ubicación activa Neiva, Huila (vía RF-02)
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Neiva');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
    await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);

    // Paso 1: abrir la sección de históricos
    await page.getByRole('button', { name: 'Históricos', exact: true }).click();
    const section = page.locator('section.historical-weather');
    await expect(section).toBeVisible();

    // Paso 2: seleccionar 15/09/2026 y consultar
    await page.locator('#historical-start-date').fill(QUERY_DATE);
    await page.locator('#historical-end-date').fill(QUERY_DATE);
    await page.getByRole('button', { name: 'Consultar histórico' }).click();

    // Paso 3: indicador de carga visible y sin datos vacíos ni de consultas anteriores
    const loading = section.locator('.historical-weather__status[role="status"]');
    await expect(loading).toBeVisible();
    await expect(loading).toHaveText('Consultando datos históricos…');
    await expect(section.locator('.historical-weather__table')).toHaveCount(0);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso3-indicador-carga.png'), fullPage: true });

    // Esperar el resultado
    const table = section.locator('.historical-weather__table');
    await expect(table).toBeVisible({ timeout: 20000 });
    await expect(loading).toHaveCount(0);

    // Paso 4: parámetros de la petición y respuesta HTTP
    expect(archiveUrl, 'La app no realizó la petición a /v1/archive').not.toBeNull();
    const params = archiveUrl!.searchParams;
    expect(params.get('start_date')).toBe(QUERY_DATE);
    expect(params.get('end_date')).toBe(QUERY_DATE);
    expect(params.get('timezone')).toBe('auto');
    expect(Number(params.get('latitude'))).toBeCloseTo(2.9273, 2);
    expect(Number(params.get('longitude'))).toBeCloseTo(-75.2819, 2);
    expect(params.get('daily')?.split(',').sort()).toEqual([...EXPECTED_DAILY].sort());
    expect(params.get('temperature_unit')).toBe('celsius');
    expect(params.get('wind_speed_unit')).toBe('kmh');
    expect(params.get('precipitation_unit')).toBe('mm');
    expect(archiveStatus).toBe(200);
    expect(archiveBody!.daily.time).toEqual([QUERY_DATE]);

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'respuesta-cruda-archive.json'),
      JSON.stringify({ url: archiveUrl!.toString(), status: archiveStatus, tiempo_respuesta_ms: archiveResponseMs, body: archiveBody }, null, 2),
    );

    // Paso 5: fecha mostrada en DD/MM/AAAA
    await expect(section.locator('.historical-weather__results h3')).toHaveText(`Histórico — ${QUERY_DATE_DISPLAY}`);
    const row = table.locator('tbody tr');
    await expect(row).toHaveCount(1);
    await expect(row.locator('th')).toHaveText(QUERY_DATE_DISPLAY);

    // Pasos 6 y 7: comparación exacta contra daily.*[0] con unidad visible
    const daily = archiveBody!.daily;
    const expectedCells = [
      formatValue(daily.temperature_2m_max?.[0], '°C'),
      formatValue(daily.temperature_2m_min?.[0], '°C'),
      formatValue(daily.temperature_2m_mean?.[0], '°C'),
      formatValue(daily.precipitation_sum?.[0], 'mm'),
      formatValue(daily.wind_speed_10m_max?.[0], 'km/h'),
      formatValue(daily.relative_humidity_2m_mean?.[0], '%', 0),
    ];
    const shownCells = (await row.locator('td').allInnerTexts()).map((text) => text.trim());

    const comparison = EXPECTED_DAILY.map((variable, index) => ({
      variable,
      api: daily[variable]?.[0] ?? null,
      esperado_en_ui: expectedCells[index],
      mostrado_en_ui: shownCells[index],
      coincide: expectedCells[index] === shownCells[index],
    }));
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'comparacion-ui-vs-api.json'), JSON.stringify(comparison, null, 2));
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso5-7-resultado-historico.png'), fullPage: true });

    expect.soft(shownCells).toEqual(expectedCells);
    for (const text of shownCells) {
      expect.soft(text).toMatch(/(°C|mm|km\/h|%)$/);
    }
    const resultsText = await section.locator('.historical-weather__results').innerText();
    expect.soft(resultsText).not.toMatch(/\bnull\b|\bNaN\b|\bundefined\b/);
    expect(pageErrors).toHaveLength(0);
  });
});
