import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-004
 * Nombre / Escenario: Consulta por rango de fechas: rango válido, límite de 31 días, rango invertido
 *                     y valores nulos en el periodo
 * Módulo / Endpoint: GET /v1/archive
 * Tipo de prueba: Funcional
 * Prioridad: Media
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que el sistema permita consultar un rango de hasta 31 días mostrando un dato por cada día,
 * rechace rangos de más de 31 días o con fecha inicial posterior a la final, y muestre "N/D" en los días
 * o variables que la API devuelva nulos sin romper la vista.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-004__2026-09-28__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-004', 'evidencias', RUN_ID);

const DAILY = [
  'temperature_2m_max',
  'temperature_2m_min',
  'temperature_2m_mean',
  'precipitation_sum',
  'wind_speed_10m_max',
  'relative_humidity_2m_mean',
];
const UNITS = ['°C', '°C', '°C', 'mm', 'km/h', '%'];

function formatValue(value: unknown, unit: string, fractionDigits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/D';
  return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: fractionDigits }).format(value)} ${unit}`;
}

function toDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function expectedRows(body: any): { date: string; cells: string[] }[] {
  return body.daily.time.map((date: string, i: number) => ({
    date: toDisplay(date),
    cells: DAILY.map((variable, v) => formatValue(body.daily[variable]?.[i], UNITS[v], v === 5 ? 0 : 1)),
  }));
}

test.describe('TC-SS-004: Consulta por rango de fechas (RF-05)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(120000);

  test('Neiva: rangos A (7 días), B (31), C (32), D (invertido) y E (nulos simulados)', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Interceptación de /v1/archive: registra cada llamada y, si el mock E está activo, inyecta nulos
    let mockNulls = false;
    const calls: { url: URL; status: number; body: any; mocked: boolean }[] = [];
    await page.route('**/archive-api.open-meteo.com/v1/archive**', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      if (mockNulls) {
        body.daily.precipitation_sum[2] = null;
        body.daily.relative_humidity_2m_mean = body.daily.time.map(() => null);
      }
      calls.push({ url: new URL(route.request().url()), status: response.status(), body, mocked: mockNulls });
      await route.fulfill({ response, json: body });
    });

    await page.goto('/');
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Neiva');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
    await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);

    await page.getByRole('button', { name: 'Históricos', exact: true }).click();
    const section = page.locator('section.historical-weather');
    await expect(section).toBeVisible();
    const heading = section.locator('.historical-weather__results h3');
    const validation = section.locator('#historical-date-error[role="alert"]');
    const rows = section.locator('.historical-weather__table tbody tr');

    async function query(start: string, end: string) {
      await page.locator('#historical-start-date').fill(start);
      await page.locator('#historical-end-date').fill(end);
      await page.getByRole('button', { name: 'Consultar histórico' }).click();
    }

    async function readTable() {
      const count = await rows.count();
      const out: { date: string; cells: string[] }[] = [];
      for (let i = 0; i < count; i += 1) {
        const row = rows.nth(i);
        out.push({
          date: (await row.locator('th').innerText()).trim(),
          cells: (await row.locator('td').allInnerTexts()).map((t) => t.trim()),
        });
      }
      return out;
    }

    async function validRange(slug: string, start: string, end: string, days: number) {
      const before = calls.length;
      await query(start, end);
      await expect(heading).toHaveText(`Histórico — ${toDisplay(start)} – ${toDisplay(end)}`, { timeout: 20000 });
      await expect(validation).toHaveCount(0);
      await expect(rows).toHaveCount(days);
      expect(calls.length).toBeGreaterThan(before);
      const call = calls[calls.length - 1];
      const shown = await readTable();
      const expected = expectedRows(call.body);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `${slug}.png`), fullPage: true });
      const resultsText = await section.locator('.historical-weather__results').innerText();

      expect.soft(call.url.searchParams.get('start_date')).toBe(start);
      expect.soft(call.url.searchParams.get('end_date')).toBe(end);
      expect.soft(call.url.searchParams.get('timezone')).toBe('auto');
      expect.soft(call.status).toBe(200);
      expect.soft(call.body.daily.time.length).toBe(days);
      expect.soft(shown, `${slug}: tabla vs API`).toEqual(expected);
      expect.soft(resultsText).not.toMatch(/\bnull\b|\bNaN\b|\bundefined\b/);
      return {
        solicitudes_archive: calls.length - before,
        url_enviada: call.url.toString(),
        http: call.status,
        dias_api: call.body.daily.time.length,
        filas_mostradas: shown.length,
        primera_fila: shown[0]?.date,
        ultima_fila: shown[shown.length - 1]?.date,
        coincide_con_api: JSON.stringify(shown) === JSON.stringify(expected),
        tabla_mostrada: shown,
        daily_api: call.body.daily,
      };
    }

    async function invalidRange(slug: string, start: string, end: string, message: string) {
      const before = calls.length;
      await query(start, end);
      await expect(validation).toBeVisible();
      const shownMessage = (await validation.innerText()).trim();
      await page.waitForTimeout(1500);
      const sent = calls.length - before;
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `${slug}.png`), fullPage: true });
      expect.soft(shownMessage, `${slug}: mensaje`).toBe(message);
      expect.soft(sent, `${slug}: no debe enviarse solicitud a /v1/archive`).toBe(0);
      return { mensaje_esperado: message, mensaje_mostrado: shownMessage, solicitudes_archive: sent };
    }

    const summary: Record<string, unknown> = {};

    // Paso 1: Escenario A — 7 días
    summary.A = await validRange('escenario-A-7-dias', '2026-08-01', '2026-08-07', 7);
    // Paso 2: Escenario B — 31 días
    summary.B = await validRange('escenario-B-31-dias', '2026-08-01', '2026-08-31', 31);
    // Paso 3: Escenario C — 32 días
    summary.C = await invalidRange('escenario-C-32-dias', '2026-08-01', '2026-09-01', 'El rango máximo permitido es de 31 días.');
    // Paso 4: Escenario D — invertido
    summary.D = await invalidRange('escenario-D-invertido', '2026-08-10', '2026-08-05', 'La fecha inicial no puede ser posterior a la final.');

    // Pasos 5 y 6: Escenario E — nulos simulados sobre el rango A
    mockNulls = true;
    const e = await validRange('escenario-E-nulos', '2026-08-01', '2026-08-07', 7);
    mockNulls = false;
    const table = e.tabla_mostrada as { date: string; cells: string[] }[];
    const precip0308 = table.find((r) => r.date === '03/08/2026')?.cells[3];
    const humidity = table.map((r) => r.cells[5]);
    const ndCells = table.flatMap((r, i) => r.cells.map((c, v) => (c === 'N/D' ? `${r.date}:${DAILY[v]}` : null)).filter(Boolean));
    const expectedNd = ['03/08/2026:precipitation_sum', ...table.map((r) => `${r.date}:relative_humidity_2m_mean`)].sort();
    expect.soft(precip0308, 'E: precipitación 03/08/2026').toBe('N/D');
    expect.soft(humidity, 'E: humedad de los 7 días').toEqual(Array(7).fill('N/D'));
    expect.soft([...ndCells].sort(), 'E: N/D solo en las celdas nulas').toEqual(expectedNd);
    summary.E = { ...e, precipitacion_03_08: precip0308, humedad_7_dias: humidity, celdas_nd: ndCells, nd_solo_en_nulos: JSON.stringify([...ndCells].sort()) === JSON.stringify(expectedNd) };

    fs.writeFileSync(path.join(EVIDENCE_DIR, 'resumen-rangos.json'), JSON.stringify(summary, null, 2));
    expect(pageErrors).toHaveLength(0);
  });
});
