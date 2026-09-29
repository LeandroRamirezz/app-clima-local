import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-003__2026-09-28__run01');

/**
 * CASO DE PRUEBA: TC-JC-003
 * Requerimiento: RF-01 (Manejo de valor nulo en una variable y de weather_code desconocido)
 * Diseñado por: Juan Camilo La Rotta
 * Fecha: 2026-09-28
 */
test.describe('TC-JC-003: Manejo de valor nulo en una variable y de weather_code desconocido', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  test('Escenario A: Debe mostrar N/D si temperature_2m es null sin romper el resto del panel', async ({ page }) => {
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

    // 2. Mock de Pronóstico con temperature_2m: null en current
    await page.route(/\/v1\/forecast/, async (route) => {
      const mockPayload = {
        latitude: 2.9273,
        longitude: -75.2819,
        generationtime_ms: 0.5,
        utc_offset_seconds: -18000,
        timezone: 'America/Bogota',
        elevation: 442,
        current: {
          time: '2026-09-28T14:00',
          temperature_2m: null, // Escenario A: Nulo
          apparent_temperature: 35.1,
          relative_humidity_2m: 65,
          precipitation: 0.0,
          weather_code: 0,
          wind_speed_10m: 12.3,
          wind_direction_10m: 180,
        },
        hourly: {
          time: ['2026-09-28T14:00'],
          temperature_2m: [null],
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

    await page.goto('/');

    // Buscar y seleccionar Neiva
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');

    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard).toBeVisible();

    // Verificar que el campo principal de Temperatura muestra "N/D"
    const tempElement = currentWeatherCard.locator('.current-weather__temperature strong');
    await expect(tempElement).toHaveText('N/D');

    // Verificar que NO muestra 'null' ni 'NaN' ni rompe la interfaz
    await expect(currentWeatherCard).not.toContainText('null');
    await expect(currentWeatherCard).not.toContainText('NaN');

    // Verificar que el resto de las métricas se muestran correctamente
    const metrics = currentWeatherCard.locator('.current-weather__metrics');
    await expect(metrics).toContainText('Sensación térmica');
    await expect(metrics).toContainText('35,1 °C');
    await expect(metrics).toContainText('Humedad');
    await expect(metrics).toContainText('65 %');

    // Evidencia Escenario A
    await page.screenshot({
      path: path.join(evidenciasDir, '01_escenario_A_temperatura_nula.png'),
      fullPage: true,
    });
  });

  test('Escenario B: Debe mostrar Condición no disponible con ícono neutro ante weather_code desconocido (999)', async ({ page }) => {
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

    // 2. Mock de Pronóstico con weather_code: 999 en current
    await page.route(/\/v1\/forecast/, async (route) => {
      const mockPayload = {
        latitude: 2.9273,
        longitude: -75.2819,
        generationtime_ms: 0.5,
        utc_offset_seconds: -18000,
        timezone: 'America/Bogota',
        elevation: 442,
        current: {
          time: '2026-09-28T14:00',
          temperature_2m: 32.5,
          apparent_temperature: 35.1,
          relative_humidity_2m: 65,
          precipitation: 0.0,
          weather_code: 999, // Escenario B: Código desconocido
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
          weather_code: [999],
        },
        daily: {
          time: ['2026-09-28'],
          weather_code: [999],
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

    await page.goto('/');

    // Buscar y seleccionar Neiva
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');

    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard).toBeVisible();

    // Verificar la condición del clima
    const conditionContainer = currentWeatherCard.locator('.current-weather__condition');
    await expect(conditionContainer).toContainText('Condición no disponible');

    // Verificar presencia del ícono neutro con data-icon-key="unavailable"
    const icon = conditionContainer.locator('.current-weather__icon');
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute('data-icon-key', 'unavailable');

    // Evidencia Escenario B
    await page.screenshot({
      path: path.join(evidenciasDir, '02_escenario_B_weather_code_desconocido.png'),
      fullPage: true,
    });
  });
});
