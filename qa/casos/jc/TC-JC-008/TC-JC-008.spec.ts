import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-008__2026-09-28__run01');

/**
 * CASO DE PRUEBA: TC-JC-008
 * Requerimiento: RF-08 (Visualización de la elevación de la ubicación)
 * Diseñado por: Juan Camilo La Rotta
 * Fecha: 2026-09-28
 */
test.describe('TC-JC-008: Visualización de la elevación de la ubicación', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  // ── Escenario A: Valor de elevación presente (442 m) ───────────────────────
  test('Escenario A: Debe mostrar la elevación devuelta por la API en metros s. n. m.', async ({ page }) => {
    const ELEVATION_VALUE = 442;

    await page.route(/\/v1\/search/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              id: 3674199,
              name: 'Neiva',
              latitude: 2.9273,
              longitude: -75.2819,
              elevation: ELEVATION_VALUE,
              admin1: 'Huila',
              country: 'Colombia',
              timezone: 'America/Bogota',
            },
          ],
        }),
      });
    });

    await page.route(/\/v1\/forecast/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          latitude: 2.9273,
          longitude: -75.2819,
          timezone: 'America/Bogota',
          elevation: ELEVATION_VALUE, // Valor exacto a validar
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
        }),
      });
    });

    await page.goto('/');
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');

    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard).toBeVisible();

    // Verificar elevación en la tarjeta con el valor exacto de la API (442 m)
    const elevationElement = currentWeatherCard.locator('.current-weather__elevation');
    await expect(elevationElement).toBeVisible();
    await expect(elevationElement).toContainText(`${ELEVATION_VALUE} m s. n. m.`);

    await page.screenshot({
      path: path.join(evidenciasDir, '01_elevacion_442m_neiva.png'),
      fullPage: true,
    });
  });

  // ── Escenario B: Elevación ausente (null) ──────────────────────────────────
  test('Escenario B: Debe mostrar "no disponible" si elevation no está presente en la respuesta', async ({ page }) => {
    await page.route(/\/v1\/search/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
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
        }),
      });
    });

    await page.route(/\/v1\/forecast/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          latitude: 2.9273,
          longitude: -75.2819,
          timezone: 'America/Bogota',
          elevation: null, // Elevación ausente
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
        }),
      });
    });

    await page.goto('/');
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');

    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard).toBeVisible();

    // Con elevation: null debe mostrar "no disponible"
    const elevationElement = currentWeatherCard.locator('.current-weather__elevation');
    await expect(elevationElement).toBeVisible();
    await expect(elevationElement).toContainText('no disponible');

    // Verificar que el resto del panel no se rompe
    await expect(currentWeatherCard.locator('.current-weather__temperature strong')).toHaveText(/32[,.]5 °C/);

    await page.screenshot({
      path: path.join(evidenciasDir, '02_elevacion_nula_no_disponible.png'),
      fullPage: true,
    });
  });
});
