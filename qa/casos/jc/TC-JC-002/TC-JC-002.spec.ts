import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-002__2026-09-28__run01');

/**
 * CASO DE PRUEBA: TC-JC-002
 * Requerimiento: RF-01 (Configuración del rango de pronóstico 1-16 días y validación de límites)
 * Diseñado por: Juan Camilo La Rotta
 * Fecha: 2026-09-28
 */
test.describe('TC-JC-002: Configuración del rango de pronóstico (1–16 días) y validación de límites', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  test('debe permitir rangos de 1 a 16 días y ajustar adecuadamente valores fuera de límite', async ({ page }) => {
    // 1. Configurar Mocks de Open-Meteo

    // Mock de Geocodificación (/v1/search)
    await page.route(/\/v1\/search/, async (route) => {
      const jsonResponse = {
        results: [
          {
            id: 3674199,
            name: 'Neiva',
            latitude: 2.9273,
            longitude: -75.2819,
            elevation: 442,
            feature_code: 'PPLA',
            country_code: 'CO',
            admin1: 'Huila',
            country: 'Colombia',
            timezone: 'America/Bogota',
          },
        ],
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(jsonResponse),
      });
    });

    // Mock dinámico de Pronóstico (/v1/forecast) adaptado según forecast_days
    await page.route(/\/v1\/forecast/, async (route) => {
      const url = new URL(route.request().url());
      const forecastDaysParam = parseInt(url.searchParams.get('forecast_days') || '7', 10);
      const daysCount = Math.min(16, Math.max(1, forecastDaysParam));

      const dates: string[] = [];
      const tempMax: number[] = [];
      const tempMin: number[] = [];
      const precipSum: number[] = [];
      const precipProb: number[] = [];
      const windMax: number[] = [];
      const uvMax: number[] = [];
      const weatherCodes: number[] = [];
      const sunriseList: string[] = [];
      const sunsetList: string[] = [];
      const daylightDurations: number[] = [];

      const baseDate = new Date(2026, 8, 28); // 2026-09-28

      for (let i = 0; i < daysCount; i++) {
        const currentDate = new Date(baseDate);
        currentDate.setDate(baseDate.getDate() + i);
        const isoDate = currentDate.toISOString().split('T')[0]!;

        dates.push(isoDate);
        tempMax.push(32.0 + (i % 3));
        tempMin.push(22.0 + (i % 2));
        precipSum.push((i % 2) * 1.5);
        precipProb.push(20 + i * 5);
        windMax.push(12.0 + i * 0.5);
        uvMax.push(8.0);
        weatherCodes.push(0);
        sunriseList.push(`${isoDate}T05:55`);
        sunsetList.push(`${isoDate}T18:00`);
        daylightDurations.push(43500);
      }

      const mockForecastPayload = {
        latitude: 2.9273,
        longitude: -75.2819,
        generationtime_ms: 0.5,
        utc_offset_seconds: -18000,
        timezone: 'America/Bogota',
        timezone_abbreviation: '-05',
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
          time: dates,
          weather_code: weatherCodes,
          temperature_2m_max: tempMax,
          temperature_2m_min: tempMin,
          precipitation_sum: precipSum,
          precipitation_probability_max: precipProb,
          wind_speed_10m_max: windMax,
          uv_index_max: uvMax,
          sunrise: sunriseList,
          sunset: sunsetList,
          daylight_duration: daylightDurations,
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockForecastPayload),
      });
    });

    // 2. Navegar a la página principal
    await page.goto('/');

    // 3. Seleccionar Neiva
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');

    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    // 4. Paso 1: Verificar que por defecto forecast_days sea 7
    const daysInput = page.getByLabel('Días de pronóstico');
    await expect(daysInput).toBeVisible();
    await expect(daysInput).toHaveValue('7');

    const forecastPanel = page.locator('.forecast-panel');
    await expect(forecastPanel.locator('.forecast-panel__day')).toHaveCount(7);

    // Evidencia 1: Pronóstico por defecto 7 días
    await page.screenshot({
      path: path.join(evidenciasDir, '01_pronostico_7_dias_defecto.png'),
      fullPage: true,
    });

    // 5. Paso 2: Cambiar a 1 día
    await daysInput.fill('1');
    await expect(daysInput).toHaveValue('1');
    await expect(forecastPanel.locator('.forecast-panel__day')).toHaveCount(1);

    // Evidencia 2: Pronóstico de 1 día
    await page.screenshot({
      path: path.join(evidenciasDir, '02_pronostico_1_dia.png'),
      fullPage: true,
    });

    // 6. Paso 3: Cambiar a 16 días
    await daysInput.fill('16');
    await expect(daysInput).toHaveValue('16');
    await expect(forecastPanel.locator('.forecast-panel__day')).toHaveCount(16);

    // Evidencia 3: Pronóstico de 16 días
    await page.screenshot({
      path: path.join(evidenciasDir, '03_pronostico_16_dias.png'),
      fullPage: true,
    });

    // 7. Paso 4: Probar valor fuera de límite inferior (0)
    await daysInput.fill('0');
    
    // Verificar que el sistema muestra el mensaje de error de validación
    const rangeError = page.locator('#forecast-days-error');
    await expect(rangeError).toBeVisible();
    await expect(rangeError).toHaveText('El pronóstico admite entre 1 y 16 días.');

    // El sistema reajusta automáticamente al límite permitido (1 día)
    await expect(daysInput).toHaveValue('1');
    await expect(forecastPanel.locator('.forecast-panel__day')).toHaveCount(1);

    // Evidencia 4: Límite 0 genera advertencia y reajuste a 1
    await page.screenshot({
      path: path.join(evidenciasDir, '04_limite_inferior_0_mensaje_error.png'),
      fullPage: true,
    });

    // 8. Paso 5: Probar valor fuera de límite superior (17)
    await daysInput.fill('17');

    await expect(rangeError).toBeVisible();
    await expect(rangeError).toHaveText('El pronóstico admite entre 1 y 16 días.');

    // El sistema reajusta automáticamente al límite permitido (16 días)
    await expect(daysInput).toHaveValue('16');
    await expect(forecastPanel.locator('.forecast-panel__day')).toHaveCount(16);

    // Evidencia 5: Límite 17 genera advertencia y reajuste a 16
    await page.screenshot({
      path: path.join(evidenciasDir, '05_limite_superior_17_mensaje_error.png'),
      fullPage: true,
    });
  });
});
