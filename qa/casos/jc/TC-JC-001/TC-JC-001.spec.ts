import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-001__2026-09-28__run01');

/**
 * CASO DE PRUEBA: TC-JC-001
 * Requerimiento: RF-01 (Consulta de clima actual y pronóstico - Camino Feliz)
 * Diseñado por: Juan Camilo La Rotta
 * Fecha: 2026-09-28
 */
test.describe('TC-JC-001: Consulta exitosa de clima actual y pronóstico (camino feliz)', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  test('debe mostrar estado de carga y posteriormente datos 100% coincidentes con la API', async ({ page }) => {
    // 1. Configurar Mocks de Open-Meteo

    // Mock de Geocodificación (/v1/search) para cualquier búsqueda de ciudad
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
            admin1_id: 3674198,
            admin1: 'Huila',
            country: 'Colombia',
            country_id: 3686110,
            timezone: 'America/Bogota',
          },
        ],
        generationtime_ms: 0.5,
      };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(jsonResponse),
      });
    });

    // Mock de Pronóstico (/v1/forecast) con retraso artificial de 2500ms
    await page.route(/\/v1\/forecast/, async (route) => {
      // Simular el retraso artificial de 2.5 segundos para observar el indicador de carga
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const mockForecastPayload = {
        latitude: 2.9273,
        longitude: -75.2819,
        generationtime_ms: 0.8,
        utc_offset_seconds: -18000,
        timezone: 'America/Bogota',
        timezone_abbreviation: '-05',
        elevation: 442,
        current_units: {
          time: 'iso8601',
          interval: 'seconds',
          temperature_2m: '°C',
          apparent_temperature: '°C',
          relative_humidity_2m: '%',
          precipitation: 'mm',
          weather_code: 'wmo code',
          wind_speed_10m: 'km/h',
          wind_direction_10m: '°',
        },
        current: {
          time: '2026-09-28T14:00',
          interval: 900,
          temperature_2m: 32.5,
          apparent_temperature: 35.1,
          relative_humidity_2m: 65,
          precipitation: 0.0,
          weather_code: 0, // Despejado
          wind_speed_10m: 12.3,
          wind_direction_10m: 180,
        },
        hourly_units: {
          time: 'iso8601',
          temperature_2m: '°C',
          apparent_temperature: '°C',
          precipitation_probability: '%',
          precipitation: 'mm',
          wind_speed_10m: 'km/h',
          uv_index: '',
          weather_code: 'wmo code',
        },
        hourly: {
          time: [
            '2026-09-28T14:00', '2026-09-28T15:00', '2026-09-28T16:00',
            '2026-09-28T17:00', '2026-09-28T18:00', '2026-09-28T19:00',
          ],
          temperature_2m: [32.5, 33.0, 32.8, 31.5, 29.8, 28.0],
          apparent_temperature: [35.1, 35.8, 35.2, 33.9, 31.5, 29.2],
          precipitation_probability: [10, 15, 20, 10, 5, 0],
          precipitation: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
          wind_speed_10m: [12.3, 13.0, 11.8, 10.5, 9.2, 8.0],
          uv_index: [7.0, 6.5, 4.2, 1.8, 0.0, 0.0], // UV 7.0 = Categoría 'Alto'
          weather_code: [0, 0, 1, 0, 0, 0],
        },
        daily_units: {
          time: 'iso8601',
          weather_code: 'wmo code',
          temperature_2m_max: '°C',
          temperature_2m_min: '°C',
          precipitation_sum: 'mm',
          precipitation_probability_max: '%',
          wind_speed_10m_max: 'km/h',
          uv_index_max: '',
          sunrise: 'iso8601',
          sunset: 'iso8601',
          daylight_duration: 's',
        },
        daily: {
          time: [
            '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01',
            '2026-10-02', '2026-10-03', '2026-10-04',
          ],
          weather_code: [0, 1, 2, 3, 0, 1, 0],
          temperature_2m_max: [34.0, 33.5, 32.0, 31.0, 33.8, 34.2, 35.0],
          temperature_2m_min: [22.0, 21.5, 22.5, 21.0, 22.0, 23.0, 22.8],
          precipitation_sum: [0.0, 1.2, 4.5, 8.0, 0.0, 0.5, 0.0],
          precipitation_probability_max: [20, 45, 60, 75, 15, 30, 10],
          wind_speed_10m_max: [15.0, 14.2, 16.5, 12.0, 13.5, 14.0, 15.2],
          uv_index_max: [9.0, 8.5, 7.8, 6.5, 8.8, 9.2, 9.5],
          sunrise: [
            '2026-09-28T05:55', '2026-09-29T05:55', '2026-09-30T05:55', '2026-10-01T05:55',
            '2026-10-02T05:55', '2026-10-03T05:55', '2026-10-04T05:55',
          ],
          sunset: [
            '2026-09-28T18:02', '2026-09-29T18:01', '2026-09-30T18:01', '2026-10-01T18:00',
            '2026-10-02T18:00', '2026-10-03T17:59', '2026-10-04T17:59',
          ],
          daylight_duration: [43620, 43560, 43560, 43500, 43500, 43440, 43440],
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockForecastPayload),
      });
    });

    // 2. Paso 1: Navegar a la aplicación
    await page.goto('/');

    // 3. Paso 2: Buscar Neiva en el campo de búsqueda
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Neiva');

    // Esperar al debounce (300ms) y a que se muestre el resultado en la lista
    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });

    // Seleccionar Neiva
    await option.click();

    // 4. Paso 3: Verificar estado de carga intermedio durante la petición a /v1/forecast
    const loadingStatus = page.getByRole('status').filter({ hasText: 'Consultando clima…' });
    await expect(loadingStatus).toBeVisible();

    // 5. Paso 4: Esperar a que el indicador de carga desaparezca al resolverse la respuesta
    await expect(loadingStatus).toBeHidden({ timeout: 10000 });

    // Guardar evidencia 1: Pantalla principal con Clima Actual
    await page.screenshot({
      path: path.join(evidenciasDir, '01_clima_actual_neiva.png'),
      fullPage: true,
    });

    // 6. Paso 5: Verificar datos en la tarjeta 'Clima actual'
    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard).toBeVisible();

    // Ubicación y Elevación
    await expect(currentWeatherCard.locator('.current-weather__location')).toContainText('Neiva, Huila, Colombia');
    await expect(currentWeatherCard.locator('.current-weather__elevation')).toContainText('Elevación: 442 m s. n. m.');

    // Condición según weather_code 0 -> Despejado
    await expect(currentWeatherCard.locator('.current-weather__condition')).toContainText('Despejado');

    // Temperatura: 32,5 °C (formato regional en español)
    await expect(currentWeatherCard.locator('.current-weather__temperature strong')).toHaveText(/32[,.]5 °C/);

    // Métricas del clima actual
    const metrics = currentWeatherCard.locator('.current-weather__metrics');
    await expect(metrics).toContainText('Sensación térmica');
    await expect(metrics).toContainText('35,1 °C');
    await expect(metrics).toContainText('Humedad');
    await expect(metrics).toContainText('65 %');
    await expect(metrics).toContainText('Precipitación');
    await expect(metrics).toContainText('0 mm');
    await expect(metrics).toContainText('Viento');
    await expect(metrics).toContainText('12,3 km/h');
    await expect(metrics).toContainText('Dirección');
    await expect(metrics).toContainText('180°');

    // 7. Paso 6: Verificar el Índice UV y categoría 'Alto' (UV = 7.0)
    await expect(metrics).toContainText('Índice UV');
    await expect(metrics).toContainText('7 — Alto');

    // 8. Paso 7: Verificar Pronóstico Diario (7 días por defecto)
    const forecastPanel = page.locator('.forecast-panel');
    await expect(forecastPanel).toBeVisible();

    const dailyItems = forecastPanel.locator('.forecast-panel__day');
    await expect(dailyItems).toHaveCount(7);

    // 9. Paso 8: Alternar a la vista horaria
    const hourlyButton = page.getByRole('button', { name: 'Horario', exact: true });
    await hourlyButton.click();

    const hourlyHours = forecastPanel.locator('.forecast-panel__hour');
    await expect(hourlyHours.first()).toBeVisible();

    // Guardar evidencia 2: Vista horaria
    await page.screenshot({
      path: path.join(evidenciasDir, '02_vista_horaria_neiva.png'),
      fullPage: true,
    });
  });
});
