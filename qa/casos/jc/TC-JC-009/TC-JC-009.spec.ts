import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-009__2026-09-28__run01');

/** Payload base de forecast; elevation se sobreescribe en cada escenario */
const baseForecast = (elevation: unknown) => ({
  latitude: 2.9273,
  longitude: -75.2819,
  timezone: 'America/Bogota',
  elevation,
  current: {
    time: '2026-09-28T14:00',
    temperature_2m: 32.5,
    apparent_temperature: 35.1,
    relative_humidity_2m: 65,
    precipitation: 0.0,
    weather_code: 0,
    wind_speed_10m: 12.3,
    wind_direction_10m: 180,
  },
  hourly: {
    time: ['2026-09-28T14:00'],
    temperature_2m: [32.5],
    apparent_temperature: [35.1],
    precipitation_probability: [10],
    precipitation: [0.0],
    wind_speed_10m: [12.3],
    uv_index: [7.0],
    weather_code: [0],
  },
  daily: {
    time: ['2026-09-28'],
    weather_code: [0],
    temperature_2m_max: [34.0],
    temperature_2m_min: [22.0],
    precipitation_sum: [0.0],
    precipitation_probability_max: [20],
    wind_speed_10m_max: [15.0],
    uv_index_max: [9.0],
    sunrise: ['2026-09-28T05:55'],
    sunset: ['2026-09-28T18:02'],
    daylight_duration: [43620],
  },
});

const mockSearch = {
  results: [
    {
      id: 3674199,
      name: 'Neiva',
      latitude: 2.9273,
      longitude: -75.2819,
      admin1: 'Huila',
      country: 'Colombia',
      timezone: 'America/Bogota',
    },
  ],
};

/**
 * CASO DE PRUEBA: TC-JC-009
 * Requerimiento: RF-08 (Visualización de la elevación)
 * Diseñado por: Juan Camilo La Rotta
 * Fecha: 2026-09-28
 */
test.describe('TC-JC-009: Elevación ausente o no numérica', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  // ── Helper: seleccionar ciudad ───────────────────────────────────────────
  async function selectNeiva(page: import('@playwright/test').Page) {
    await page.goto('/');
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');
    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
    await expect(page.locator('.current-weather__card')).toBeVisible();
  }

  // ── Escenario A-1: elevation ausente (campo omitido) ────────────────────
  test('Escenario A-1: elevation omitida → debe mostrar "no disponible"', async ({ page }) => {
    await page.route(/\/v1\/search/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSearch) })
    );

    await page.route(/\/v1\/forecast/, async (route) => {
      // Construir payload sin el campo elevation
      const payload = baseForecast(undefined);
      const { elevation: _removed, ...withoutElevation } = payload;
      void _removed;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(withoutElevation),
      });
    });

    await selectNeiva(page);

    const elevationEl = page.locator('.current-weather__elevation');
    await expect(elevationEl).toBeVisible();
    await expect(elevationEl).toContainText('no disponible');

    // El resto del panel debe seguir funcionando
    await expect(page.locator('.current-weather__temperature strong')).toHaveText(/32[,.]5\s*°C/);

    await page.screenshot({
      path: path.join(evidenciasDir, '01_elevation_ausente.png'),
      fullPage: true,
    });
  });

  // ── Escenario A-2: elevation = null ─────────────────────────────────────
  test('Escenario A-2: elevation = null → debe mostrar "no disponible"', async ({ page }) => {
    await page.route(/\/v1\/search/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSearch) })
    );

    await page.route(/\/v1\/forecast/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(baseForecast(null)),
      })
    );

    await selectNeiva(page);

    const elevationEl = page.locator('.current-weather__elevation');
    await expect(elevationEl).toBeVisible();
    await expect(elevationEl).toContainText('no disponible');

    // El resto del panel debe seguir funcionando
    await expect(page.locator('.current-weather__temperature strong')).toHaveText(/32[,.]5\s*°C/);

    await page.screenshot({
      path: path.join(evidenciasDir, '02_elevation_null.png'),
      fullPage: true,
    });
  });

  // ── Escenario B: elevation = 'abc' (valor no numérico) ──────────────────
  test('Escenario B: elevation = "abc" (no numérico) → debe mostrar "no disponible"', async ({ page }) => {
    await page.route(/\/v1\/search/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSearch) })
    );

    await page.route(/\/v1\/forecast/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(baseForecast('abc')),
      })
    );

    await selectNeiva(page);

    const elevationEl = page.locator('.current-weather__elevation');
    await expect(elevationEl).toBeVisible();
    await expect(elevationEl).toContainText('no disponible');

    // El resto del panel debe seguir funcionando
    await expect(page.locator('.current-weather__temperature strong')).toHaveText(/32[,.]5\s*°C/);

    await page.screenshot({
      path: path.join(evidenciasDir, '03_elevation_no_numerica_abc.png'),
      fullPage: true,
    });
  });
});
