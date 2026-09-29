import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-005__2026-09-28__run01');

/**
 * CASO DE PRUEBA: TC-JC-005
 * Requerimiento: RF-07 (Selección del modelo de predicción: Automático, ICON, GFS, ECMWF)
 * Diseñado por: Juan Camilo La Rotta
 * Fecha: 2026-09-28
 */
test.describe('TC-JC-005: Selección del modelo de predicción (Automático, ICON, GFS, ECMWF)', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  test('debe permitir seleccionar cada uno de los 4 modelos y actualizar la solicitud y la interfaz', async ({ page }) => {
    const interceptedModels: string[] = [];

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

    // 2. Mock dinámico de Pronóstico (/v1/forecast) variando según el modelo seleccionado
    await page.route(/\/v1\/forecast/, async (route) => {
      const url = new URL(route.request().url());
      const modelParam = url.searchParams.get('models') || 'best_match';
      interceptedModels.push(modelParam);

      // Temperaturas distintas para validar que los datos corresponden al modelo elegido
      let temp = 32.5;
      if (modelParam === 'icon_seamless') temp = 28.5;
      if (modelParam === 'ncep_gfs_seamless') temp = 30.5;
      if (modelParam === 'ecmwf_ifs025') temp = 31.5;

      const mockPayload = {
        latitude: 2.9273,
        longitude: -75.2819,
        timezone: 'America/Bogota',
        elevation: 442,
        current: {
          time: '2026-09-28T14:00',
          temperature_2m: temp,
          apparent_temperature: temp + 2.0,
          relative_humidity_2m: 60,
          precipitation: 0.0,
          weather_code: 0,
          wind_speed_10m: 10.0,
          wind_direction_10m: 180,
        },
        hourly: {
          time: ['2026-09-28T14:00'],
          temperature_2m: [temp],
          apparent_temperature: [temp + 2.0],
          precipitation_probability: [0],
          precipitation: [0.0],
          wind_speed_10m: [10.0],
          uv_index: [6.0],
          weather_code: [0],
        },
        daily: {
          time: ['2026-09-28'],
          weather_code: [0],
          temperature_2m_max: [temp + 3.0],
          temperature_2m_min: [20.0],
          precipitation_sum: [0.0],
          precipitation_probability_max: [10],
          wind_speed_10m_max: [12.0],
          uv_index_max: [8.0],
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

    // 3. Navegar a la página principal y seleccionar Neiva
    await page.goto('/');
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');

    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard).toBeVisible();

    // 4. Paso 1: Confirmar modelo por defecto "Automático" (best_match)
    const modelLabel = page.locator('.current-weather__model-label');
    await expect(modelLabel).toHaveText('Modelo: Automático');
    await expect(currentWeatherCard.locator('.current-weather__temperature strong')).toHaveText(/32[,.]5 °C/);
    expect(interceptedModels[interceptedModels.length - 1]).toBe('best_match');

    await page.screenshot({
      path: path.join(evidenciasDir, '01_modelo_automatico_best_match.png'),
      fullPage: true,
    });

    // Desplegar menú de preferencias y Opciones Avanzadas
    const prefsSummary = page.locator('.current-weather__preferences summary').first();
    await prefsSummary.click();

    const advSummary = page.locator('.current-weather__advanced summary');
    await advSummary.click();

    const modelSelect = page.getByLabel('Modelo numérico');
    await expect(modelSelect).toBeVisible();

    // 5. Paso 2: Seleccionar ICON (icon_seamless)
    await modelSelect.selectOption('icon_seamless');
    await expect(modelLabel).toHaveText('Modelo: ICON');
    await expect(currentWeatherCard.locator('.current-weather__temperature strong')).toHaveText(/28[,.]5 °C/);
    expect(interceptedModels[interceptedModels.length - 1]).toBe('icon_seamless');

    await page.screenshot({
      path: path.join(evidenciasDir, '02_modelo_icon_seamless.png'),
      fullPage: true,
    });

    // 6. Paso 3: Seleccionar GFS (ncep_gfs_seamless)
    await modelSelect.selectOption('ncep_gfs_seamless');
    await expect(modelLabel).toHaveText('Modelo: GFS');
    await expect(currentWeatherCard.locator('.current-weather__temperature strong')).toHaveText(/30[,.]5 °C/);
    expect(interceptedModels[interceptedModels.length - 1]).toBe('ncep_gfs_seamless');

    await page.screenshot({
      path: path.join(evidenciasDir, '03_modelo_gfs_seamless.png'),
      fullPage: true,
    });

    // 7. Paso 4: Seleccionar ECMWF (ecmwf_ifs025)
    await modelSelect.selectOption('ecmwf_ifs025');
    await expect(modelLabel).toHaveText('Modelo: ECMWF');
    await expect(currentWeatherCard.locator('.current-weather__temperature strong')).toHaveText(/31[,.]5 °C/);
    expect(interceptedModels[interceptedModels.length - 1]).toBe('ecmwf_ifs025');

    await page.screenshot({
      path: path.join(evidenciasDir, '04_modelo_ecmwf_ifs025.png'),
      fullPage: true,
    });
  });
});
