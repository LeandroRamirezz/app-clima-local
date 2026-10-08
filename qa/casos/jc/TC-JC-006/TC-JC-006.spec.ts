import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-006__2026-10-08__run02');

/**
 * CASO DE PRUEBA: TC-JC-006
 * Requerimiento: RF-07 (Modelo sin cobertura en la ubicación consultada y opción Volver a Automático)
 * Diseñado por: Juan Camilo La Rotta
 * Fecha: 2026-09-28
 */
test.describe('TC-JC-006: Modelo sin cobertura en la ubicación consultada', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  test('Debe informar cuando un modelo no tiene datos para la ubicación y ofrecer el botón Volver a Automático', async ({ page }) => {
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

    // 2. Mock de Pronóstico (/v1/forecast): responde normal para best_match y nulo para icon_seamless
    await page.route(/\/v1\/forecast/, async (route) => {
      const url = new URL(route.request().url());
      const modelParam = url.searchParams.get('models') || 'best_match';

      if (modelParam === 'icon_seamless') {
        // Modelo ICON sin datos / variables nulas
        const mockNullPayload = {
          latitude: 2.9273,
          longitude: -75.2819,
          timezone: 'America/Bogota',
          elevation: 442,
          current: {
            time: '2026-09-28T14:00',
            temperature_2m: null,
            apparent_temperature: null,
            relative_humidity_2m: null,
            precipitation: null,
            weather_code: null,
            wind_speed_10m: null,
            wind_direction_10m: null,
          },
          hourly: {
            time: ['2026-09-28T14:00'],
            temperature_2m: [null],
            apparent_temperature: [null],
            precipitation_probability: [null],
            precipitation: [null],
            wind_speed_10m: [null],
            uv_index: [null],
            weather_code: [null],
          },
          daily: {
            time: ['2026-09-28'],
            weather_code: [null],
            temperature_2m_max: [null],
            temperature_2m_min: [null],
            precipitation_sum: [null],
            precipitation_probability_max: [null],
            wind_speed_10m_max: [null],
            uv_index_max: [null],
            sunrise: ['2026-09-28T05:55'],
            sunset: ['2026-09-28T18:02'],
            daylight_duration: [43620],
          },
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockNullPayload),
        });
        return;
      }

      // Respuesta por defecto para best_match (Automático)
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

    // Abrir Opciones Avanzadas
    const prefsSummary = page.locator('.current-weather__preferences summary').first();
    await prefsSummary.click();

    const advSummary = page.locator('.current-weather__advanced summary');
    await advSummary.click();

    // 4. Seleccionar modelo ICON
    const modelSelect = page.getByLabel('Modelo numérico');
    await modelSelect.selectOption('icon_seamless');

    // Captura de pantalla de evidencia al seleccionar ICON con variables nulas
    await page.screenshot({
      path: path.join(evidenciasDir, '01_modelo_icon_variables_nulas_sin_mensaje_ni_boton.png'),
      fullPage: true,
    });

    // 5. Verificar mensaje de advertencia del modelo
    const modelWarning = page.locator('text=/El modelo ICON no tiene datos para esta ubicación|no tiene datos/i');
    await expect(modelWarning).toBeVisible();

    // 6. Verificar presencia de la opción/botón "Volver a Automático"
    const returnToAutoButton = page.getByRole('button', { name: /Volver a Automático/i });
    await expect(returnToAutoButton).toBeVisible();

    // 7. Activar "Volver a Automático" y confirmar restauración
    await returnToAutoButton.click();
    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard.locator('.current-weather__temperature strong')).toHaveText(/32[,.]5 °C/);
  });
});
