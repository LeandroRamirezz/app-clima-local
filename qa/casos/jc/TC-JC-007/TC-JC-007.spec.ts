import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-007__2026-10-08__run02');

/**
 * CASO DE PRUEBA: TC-JC-007
 * Requerimiento: RF-07 (Error de API por modelo no soportado E-04 y restablecimiento a best_match)
 * Diseñado por: Juan Camilo La Rotta
 * Fecha: 2026-09-28
 */
test.describe('TC-JC-007: Error de API por modelo no soportado (E-04) y restablecimiento a best_match', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  test('Debe mostrar el mensaje E-04 y restablecer automáticamente el modelo a Automático (best_match) ante un HTTP 400', async ({ page }) => {
    // 1. Mock de Geocodificación para Neiva
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
              elevation: 442,
              admin1: 'Huila',
              country: 'Colombia',
              timezone: 'America/Bogota',
            },
          ],
        }),
      });
    });

    // 2. Mock de Pronóstico (/v1/forecast): HTTP 400 para icon_seamless y 200 OK para best_match
    await page.route(/\/v1\/forecast/, async (route) => {
      const url = new URL(route.request().url());
      const modelParam = url.searchParams.get('models') || 'best_match';

      if (modelParam === 'icon_seamless') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: true, reason: 'Model icon_seamless is not supported for these coordinates' }),
        });
        return;
      }

      const mockPayload = {
        latitude: 2.9273,
        longitude: -75.2819,
        timezone: 'America/Bogota',
        elevation: 442,
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
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPayload),
      });
    });

    // 3. Navegar y seleccionar Neiva
    await page.goto('/');
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');

    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard).toBeVisible();

    await page.screenshot({
      path: path.join(evidenciasDir, '01_modelo_automatico_inicial.png'),
      fullPage: true,
    });

    // 4. Abrir Opciones Avanzadas
    const prefsSummary = page.locator('.current-weather__preferences summary').first();
    await prefsSummary.click();

    const advSummary = page.locator('.current-weather__advanced summary');
    await advSummary.click();

    // 5. Seleccionar modelo ICON (icon_seamless) que devolverá HTTP 400
    const modelSelect = page.getByLabel('Modelo numérico');
    await modelSelect.selectOption('icon_seamless');

    // Capturar evidencia tras el reintento/fallback
    await page.screenshot({
      path: path.join(evidenciasDir, '02_e04_borrado_instantaneo_tras_fallback.png'),
      fullPage: true,
    });

    // 6. Verificar que la notificación de error E-04 permanezca visible en la interfaz
    const fallbackMessage = page.locator('.current-weather__model-fallback[role="alert"]');
    await expect(fallbackMessage).toBeVisible();
    await expect(fallbackMessage).toHaveText('No fue posible procesar la consulta. Verifique los datos ingresados.');
  });
});
