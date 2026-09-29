import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-010__2026-09-28__run01');

// ── Factory de payload /v1/forecast ───────────────────────────────────────────
function makeForecastPayload(params: {
  latitude: number;
  longitude: number;
  timezone: string;
  elevation: number;
  temperature: number;
}) {
  return {
    latitude: params.latitude,
    longitude: params.longitude,
    timezone: params.timezone,
    elevation: params.elevation,
    current: {
      time: '2026-09-28T14:00',
      temperature_2m: params.temperature,
      apparent_temperature: params.temperature + 2,
      relative_humidity_2m: 65,
      precipitation: 0.0,
      weather_code: 0,
      wind_speed_10m: 12.3,
      wind_direction_10m: 180,
      uv_index: 5.0,
    },
    hourly: {
      time: ['2026-09-28T14:00'],
      temperature_2m: [params.temperature],
      apparent_temperature: [params.temperature + 2],
      precipitation_probability: [10],
      precipitation: [0.0],
      wind_speed_10m: [12.3],
      uv_index: [5.0],
      weather_code: [0],
    },
    daily: {
      time: ['2026-09-28'],
      weather_code: [0],
      temperature_2m_max: [params.temperature + 2],
      temperature_2m_min: [params.temperature - 5],
      precipitation_sum: [0.0],
      precipitation_probability_max: [20],
      wind_speed_10m_max: [15.0],
      uv_index_max: [6.0],
      sunrise: ['2026-09-28T05:55'],
      sunset: ['2026-09-28T18:02'],
      daylight_duration: [43620],
    },
  };
}

// ── Datos de ciudades ─────────────────────────────────────────────────────────

/** Bogota — elevation ~2640 m */
const BOGOTA = {
  id: 3688689,
  name: 'Bogota',
  latitude: 4.7110,
  longitude: -74.0721,
  admin1: 'Bogota D.C.',
  country: 'Colombia',
  timezone: 'America/Bogota',
  elevation: 2640,
  temperature: 14.5,
};

/** Neiva — elevation ~442 m.  Diferencia con Bogota ~2198 m (> 300 m) */
const NEIVA = {
  id: 3674199,
  name: 'Neiva',
  latitude: 2.9273,
  longitude: -75.2819,
  admin1: 'Huila',
  country: 'Colombia',
  timezone: 'America/Bogota',
  elevation: 442,
  temperature: 32.5,
};

/** Barranquilla — elevation ~18 m */
const BARRANQUILLA = {
  id: 3689147,
  name: 'Barranquilla',
  latitude: 10.9639,
  longitude: -74.7964,
  admin1: 'Atlantico',
  country: 'Colombia',
  timezone: 'America/Bogota',
  elevation: 18,
  temperature: 33.0,
};

/** Valledupar — elevation ~169 m.  Diferencia con Barranquilla ~151 m (<= 300 m) */
const VALLEDUPAR = {
  id: 3666314,
  name: 'Valledupar',
  latitude: 10.4631,
  longitude: -73.2532,
  admin1: 'Cesar',
  country: 'Colombia',
  timezone: 'America/Bogota',
  elevation: 169,
  temperature: 31.0,
};

/**
 * TC-JC-010 — Nota informativa por diferencia de elevacion > 300 m en comparacion de ciudades
 * RF relacionado : RF-08 + RF-04
 * Disenado por   : Juan Camilo La Rotta
 * Fecha           : 2026-09-28
 *
 * DEPENDENCIA: El modo comparacion (RF-04, boton "Comparar ciudades") debe estar
 * implementado. Si no lo esta, marcar como Bloqueado, no como Fallido.
 */
test.describe('TC-JC-010: Nota informativa por diferencia de elevacion > 300 m (modo comparacion)', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  // Helper: mock de /v1/search que devuelve UNA ciudad especifica
  function setupSearchMock(page: import('@playwright/test').Page, city: typeof BOGOTA) {
    return page.route(/\/v1\/search/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{
            id: city.id,
            name: city.name,
            latitude: city.latitude,
            longitude: city.longitude,
            admin1: city.admin1,
            country: city.country,
            timezone: city.timezone,
          }],
        }),
      })
    );
  }

  // Helper: mock de /v1/forecast discriminado por latitud para multiples ciudades
  function setupForecastMock(page: import('@playwright/test').Page, cities: typeof BOGOTA[]) {
    return page.route(/\/v1\/forecast/, (route) => {
      const url = new URL(route.request().url());
      const lat = parseFloat(url.searchParams.get('latitude') ?? '0');
      const matched = cities.find((c) => Math.abs(c.latitude - lat) < 0.01) ?? cities[0]!;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(makeForecastPayload({
          latitude: matched.latitude,
          longitude: matched.longitude,
          timezone: matched.timezone,
          elevation: matched.elevation,
          temperature: matched.temperature,
        })),
      });
    });
  }

  // Helper: navegar a la raiz y activar el modo comparacion
  async function enterComparisonMode(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.getByRole('button', { name: /comparar ciudades/i }).click();
    await expect(page.locator('.current-weather__comparison-setup')).toBeVisible({ timeout: 10_000 });
  }

  // Helper: buscar y seleccionar una ciudad dentro del panel de comparacion
  async function addCity(page: import('@playwright/test').Page, cityName: string) {
    const panel = page.locator('.current-weather__comparison-setup');
    const input = panel.getByLabel('Nombre de la ciudad');
    await input.fill(cityName);
    const option = page.locator('.city-search__option').filter({ hasText: cityName }).first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
  }

  // ── ESC-A: diferencia > 300 m → nota DEBE aparecer ───────────────────────
  test('ESC-A: Bogota (2640 m) vs Neiva (442 m) — nota de altitud visible', async ({ page }) => {
    const cities = [BOGOTA, NEIVA];

    // Forecast mock listo para ambas ciudades
    await setupForecastMock(page, cities);

    // Search mock -> Bogota primero
    await setupSearchMock(page, BOGOTA);
    await enterComparisonMode(page);
    await addCity(page, 'Bogota');

    // Reroute search -> Neiva
    await page.unroute(/\/v1\/search/);
    await setupSearchMock(page, NEIVA);
    await addCity(page, 'Neiva');

    // Tabla de comparacion debe cargarse
    const firstTable = page.locator('.city-comparison__table').first();
    await expect(firstTable).toBeVisible({ timeout: 15_000 });

    // Elevacion de cada ciudad visible en su columna (fila "Elevacion")
    await expect(firstTable).toContainText('2.640 m s. n. m.');
    await expect(firstTable).toContainText('442 m s. n. m.');

    // Nota informativa de altitud debe estar visible
    const note = page.locator('.city-comparison__elevation-note[role="note"]');
    await expect(note).toBeVisible({ timeout: 10_000 });
    await expect(note).toContainText('altitud');

    await page.screenshot({
      path: path.join(evidenciasDir, '01_bogota_vs_neiva_nota_visible.png'),
      fullPage: true,
    });
  });

  // ── ESC-B: diferencia <= 300 m → nota NO debe aparecer ───────────────────
  test('ESC-B (contraprueba): Barranquilla (18 m) vs Valledupar (169 m) — nota de altitud ausente', async ({ page }) => {
    const cities = [BARRANQUILLA, VALLEDUPAR];

    await setupForecastMock(page, cities);

    await setupSearchMock(page, BARRANQUILLA);
    await enterComparisonMode(page);
    await addCity(page, 'Barranquilla');

    await page.unroute(/\/v1\/search/);
    await setupSearchMock(page, VALLEDUPAR);
    await addCity(page, 'Valledupar');

    const firstTable = page.locator('.city-comparison__table').first();
    await expect(firstTable).toBeVisible({ timeout: 15_000 });

    // Elevacion de cada ciudad visible
    await expect(firstTable).toContainText('18 m s. n. m.');
    await expect(firstTable).toContainText('169 m s. n. m.');

    // Nota informativa NO debe ser visible
    const note = page.locator('.city-comparison__elevation-note[role="note"]');
    await expect(note).not.toBeVisible();

    await page.screenshot({
      path: path.join(evidenciasDir, '02_barranquilla_vs_valledupar_nota_ausente.png'),
      fullPage: true,
    });
  });
});
