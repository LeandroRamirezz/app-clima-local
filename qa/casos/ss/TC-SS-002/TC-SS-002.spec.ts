import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-002
 * Nombre / Escenario: Exactitud de la fecha sin desfase por zona horaria (distintos husos y fechas límite de día)
 * Módulo / Endpoint: GET /v1/archive (Historical Weather API Open-Meteo)
 * Tipo de prueba: Integración
 * Prioridad: Alta
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que los datos mostrados correspondan exactamente a la fecha solicitada, sin correr un día
 * hacia atrás o adelante, cuando la ubicación está en husos horarios distintos, cuando el navegador tiene
 * una zona horaria diferente a la de la ubicación y en fechas límite (fin de año, 29 de febrero).
 *
 * Matriz: 4 ubicaciones × 3 fechas × 2 zonas del navegador = 24 combinaciones.
 * La "consulta directa" (Postman en el diseño) se hace con el cliente HTTP de Playwright,
 * construyendo la URL de forma independiente a la app con la fecha solicitada.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-002__2026-09-28__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-002', 'evidencias', RUN_ID);

const BROWSER_TIMEZONES = ['Pacific/Kiritimati', 'Pacific/Pago_Pago'];

const LOCATIONS = [
  { slug: 'tokio', query: 'Tokio', option: /Tokio.*Jap/i, lat: 35.6895, lon: 139.6917 },
  { slug: 'honolulu', query: 'Honolulu', option: /Honolulu/i, lat: 21.3069, lon: -157.8583 },
  { slug: 'auckland', query: 'Auckland', option: /Auckland.*Nueva Zelanda/i, lat: -36.8485, lon: 174.7633 },
  { slug: 'neiva', query: 'Neiva', option: /Neiva.*Huila/i, lat: 2.9273, lon: -75.2819 },
];

const DATES = [
  { iso: '2024-02-29', display: '29/02/2024' },
  { iso: '2023-12-31', display: '31/12/2023' },
  { iso: '2024-01-01', display: '01/01/2024' },
];

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

async function selectLocation(page: Page, location: (typeof LOCATIONS)[number]) {
  const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  await searchInput.fill(location.query);
  const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  await expect(listbox).toBeVisible({ timeout: 10000 });
  await listbox.getByRole('option', { name: location.option }).first().click();
  await expect(page.locator('section.active-location')).toContainText(new RegExp(location.query, 'i'));
}

for (const timezoneId of BROWSER_TIMEZONES) {
  test.describe(`TC-SS-002: navegador en ${timezoneId}`, () => {
    test.use({ timezoneId });
    test.setTimeout(120000);

    for (const location of LOCATIONS) {
      test(`${location.query}: 29/02/2024, 31/12/2023 y 01/01/2024 sin desfase de día`, async ({ page, request }) => {
        fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
        const tzSlug = timezoneId.split('/')[1].toLowerCase();

        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        // Captura de cada petición/respuesta de /v1/archive hecha por la app
        const archiveCalls: { url: URL; status: number; body: any }[] = [];
        await page.route('**/archive-api.open-meteo.com/v1/archive**', async (route) => {
          const response = await route.fetch();
          const text = await response.text();
          archiveCalls.push({ url: new URL(route.request().url()), status: response.status(), body: JSON.parse(text) });
          await route.fulfill({ response, body: text });
        });

        await page.goto('/');
        // Paso 1: verificar que el navegador realmente corre en la zona horaria configurada
        expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(timezoneId);

        await selectLocation(page, location);
        await page.getByRole('button', { name: 'Históricos', exact: true }).click();
        const section = page.locator('section.historical-weather');
        await expect(section).toBeVisible();

        const combos: Record<string, unknown>[] = [];

        for (const date of DATES) {
          const callsBefore = archiveCalls.length;

          // Paso 2 / 5: consultar la fecha
          await page.locator('#historical-start-date').fill(date.iso);
          await page.locator('#historical-end-date').fill(date.iso);
          await page.getByRole('button', { name: 'Consultar histórico' }).click();

          const heading = section.locator('.historical-weather__results h3');
          await expect(heading).toHaveText(`Histórico — ${date.display}`, { timeout: 20000 });
          expect(archiveCalls.length).toBeGreaterThan(callsBefore);
          const call = archiveCalls[archiveCalls.length - 1];

          // Paso 3: fecha enviada sin conversión
          const sentStart = call.url.searchParams.get('start_date');
          const sentEnd = call.url.searchParams.get('end_date');
          const lat = Number(call.url.searchParams.get('latitude'));
          const lon = Number(call.url.searchParams.get('longitude'));

          // Paso 4: daily.time[0] y fecha mostrada
          const row = section.locator('.historical-weather__table tbody tr');
          await expect(row).toHaveCount(1);
          const shownDate = (await row.locator('th').innerText()).trim();
          const shownCells = (await row.locator('td').allInnerTexts()).map((text) => text.trim());

          // Paso 7: consulta directa independiente con la fecha solicitada (mismas coordenadas de la app)
          const direct = new URL('https://archive-api.open-meteo.com/v1/archive');
          direct.search = new URLSearchParams({
            latitude: String(lat),
            longitude: String(lon),
            start_date: date.iso,
            end_date: date.iso,
            daily: DAILY.join(','),
            timezone: 'auto',
          }).toString();
          const directResponse = await request.get(direct.toString());
          const directBody = await directResponse.json();
          const directCells = DAILY.map((variable, i) => formatValue(directBody.daily?.[variable]?.[0], UNITS[i], i === 5 ? 0 : 1));

          const combo = {
            zona_navegador: timezoneId,
            ubicacion: location.query,
            zona_ubicacion_api: call.body.timezone,
            fecha_solicitada: date.iso,
            latitud_enviada: lat,
            longitud_enviada: lon,
            start_date_enviado: sentStart,
            end_date_enviado: sentEnd,
            timezone_enviado: call.url.searchParams.get('timezone'),
            http_app: call.status,
            daily_time_app: call.body.daily?.time,
            fecha_mostrada: shownDate,
            valores_ui: shownCells,
            http_directa: directResponse.status(),
            daily_time_directa: directBody.daily?.time,
            valores_directa: directCells,
            valores_api_crudos: DAILY.map((variable) => call.body.daily?.[variable]?.[0] ?? null),
          };
          const ok = sentStart === date.iso && sentEnd === date.iso
            && JSON.stringify(call.body.daily?.time) === JSON.stringify([date.iso])
            && JSON.stringify(directBody.daily?.time) === JSON.stringify([date.iso])
            && shownDate === date.display
            && JSON.stringify(shownCells) === JSON.stringify(directCells);
          combos.push({ ...combo, sin_desfase: ok });

          await page.screenshot({
            path: path.join(EVIDENCE_DIR, `${tzSlug}__${location.slug}__${date.iso}.png`),
            fullPage: true,
          });

          expect.soft(sentStart, `${location.query} ${date.iso}: start_date enviado`).toBe(date.iso);
          expect.soft(sentEnd, `${location.query} ${date.iso}: end_date enviado`).toBe(date.iso);
          expect.soft(call.url.searchParams.get('timezone')).toBe('auto');
          expect.soft(call.status).toBe(200);
          expect.soft(call.body.daily?.time, `${location.query} ${date.iso}: daily.time app`).toEqual([date.iso]);
          expect.soft(shownDate, `${location.query} ${date.iso}: fecha mostrada`).toBe(date.display);
          expect.soft(directResponse.status()).toBe(200);
          expect.soft(shownCells, `${location.query} ${date.iso}: valores UI vs consulta directa`).toEqual(directCells);
          expect.soft(Math.abs(lat - location.lat), `${location.query}: latitud`).toBeLessThan(0.1);
          expect.soft(Math.abs(lon - location.lon), `${location.query}: longitud`).toBeLessThan(0.1);
        }

        fs.writeFileSync(
          path.join(EVIDENCE_DIR, `resultado__${tzSlug}__${location.slug}.json`),
          JSON.stringify(combos, null, 2),
        );
        expect(pageErrors).toHaveLength(0);
      });
    }
  });
}
