import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-012__2026-09-28__run01');

const mockSearchLongyearbyen = {
  results: [
    {
      id: 2729907,
      name: 'Longyearbyen',
      latitude: 78.22,
      longitude: 15.64,
      country: 'Noruega',
      admin1: 'Svalbard',
      timezone: 'Arctic/Longyearbyen',
    },
  ],
};

const mockPolarForecastAllNull = {
  latitude: 78.22,
  longitude: 15.64,
  timezone: 'Arctic/Longyearbyen',
  elevation: 130,
  current: {
    time: '2026-11-15T12:00',
    temperature_2m: -5.2,
    apparent_temperature: -11.0,
    relative_humidity_2m: 85,
    precipitation: 0.5,
    weather_code: 71,
    wind_speed_10m: 25.4,
    wind_direction_10m: 45,
  },
  hourly: {
    time: ['2026-11-15T12:00'],
    temperature_2m: [-5.2],
    apparent_temperature: [-11.0],
    precipitation_probability: [60],
    precipitation: [0.5],
    wind_speed_10m: [25.4],
    uv_index: [0.0],
    weather_code: [71],
  },
  daily: {
    time: ['2026-11-15', '2026-11-16', '2026-11-17'],
    weather_code: [71, 73, 75],
    temperature_2m_max: [-3.0, -4.5, -5.0],
    temperature_2m_min: [-8.0, -9.2, -10.1],
    precipitation_sum: [2.5, 1.0, 0.0],
    precipitation_probability_max: [70, 50, 20],
    wind_speed_10m_max: [28.5, 22.0, 18.0],
    uv_index_max: [0.0, 0.0, 0.0],
    sunrise: [null, null, null],
    sunset: [null, null, null],
    daylight_duration: [null, null, null],
  },
};

const mockPolarForecastMixed = {
  latitude: 78.22,
  longitude: 15.64,
  timezone: 'Arctic/Longyearbyen',
  elevation: 130,
  current: {
    time: '2026-10-25T12:00',
    temperature_2m: -2.0,
    apparent_temperature: -6.5,
    relative_humidity_2m: 78,
    precipitation: 0.0,
    weather_code: 3,
    wind_speed_10m: 15.0,
    wind_direction_10m: 120,
  },
  hourly: {
    time: ['2026-10-25T12:00'],
    temperature_2m: [-2.0],
    apparent_temperature: [-6.5],
    precipitation_probability: [10],
    precipitation: [0.0],
    wind_speed_10m: [15.0],
    uv_index: [0.2],
    weather_code: [3],
  },
  daily: {
    time: ['2026-10-25', '2026-10-26', '2026-10-27'],
    weather_code: [3, 71, 71],
    temperature_2m_max: [-1.0, -3.0, -4.0],
    temperature_2m_min: [-5.0, -7.0, -8.0],
    precipitation_sum: [0.0, 1.5, 2.0],
    precipitation_probability_max: [10, 60, 80],
    wind_speed_10m_max: [15.0, 20.0, 25.0],
    uv_index_max: [0.2, 0.0, 0.0],
    sunrise: ['2026-10-25T08:15', null, null],
    sunset: ['2026-10-25T15:30', null, null],
    daylight_duration: [26100, null, null],
  },
};

/**
 * CASO DE PRUEBA: TC-JC-012
 * Requerimiento: Degradación elegante de amanecer/atardecer en latitud polar (noche/día polar)
 * Diseñado por: Juan Camilo La Rotta - 27/09/2026
 */
test.describe('TC-JC-012: Amanecer/atardecer no disponibles en latitud polar', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  test('Escenario A: Todos los días con sunrise/sunset nulos (Noche polar en Longyearbyen)', async ({ page }) => {
    await page.route(/\/v1\/search/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSearchLongyearbyen) })
    );

    await page.route(/\/v1\/forecast/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPolarForecastAllNull) })
    );

    await page.goto('/');

    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Longyearbyen');
    const option = page.locator('.city-search__option').filter({ hasText: 'Longyearbyen' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    // 1. Clima actual debe mostrar "No disponible" para datos solares sin romper la interfaz
    const currentSolar = page.locator('.current-weather__solar');
    await expect(currentSolar).toBeVisible();

    const currentSunrise = currentSolar.locator('div', { has: page.locator('dt', { hasText: 'Amanecer' }) }).locator('dd');
    const currentSunset = currentSolar.locator('div', { has: page.locator('dt', { hasText: 'Atardecer' }) }).locator('dd');
    const currentDuration = currentSolar.locator('div', { has: page.locator('dt', { hasText: 'Duración del día' }) }).locator('dd');

    await expect(currentSunrise).toHaveText('No disponible');
    await expect(currentSunset).toHaveText('No disponible');
    await expect(currentDuration).toHaveText('No disponible');

    // Confirmar que las demás métricas del clima actual se presentan normalmente
    await expect(page.locator('.current-weather__temperature strong')).toHaveText(/-5[,.]2\s*°C/);
    await expect(page.locator('.current-weather__location')).toContainText('Longyearbyen');

    // 2. Verificar en cada tarjeta del pronóstico diario
    const dayCards = page.locator('.forecast-panel__day');
    await expect(dayCards).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const card = dayCards.nth(i);
      const solarBlock = card.locator('.forecast-panel__solar');
      await expect(solarBlock).toBeVisible();

      const sunriseDd = solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Amanecer' }) }).locator('dd');
      const sunsetDd = solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Atardecer' }) }).locator('dd');
      const durationDd = solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Duración del día' }) }).locator('dd');

      await expect(sunriseDd).toHaveText('No disponible');
      await expect(sunsetDd).toHaveText('No disponible');
      await expect(durationDd).toHaveText('No disponible');

      // Las métricas climáticas (temperatura, precipitación, viento) deben seguir visibles
      await expect(card.locator('.forecast-panel__metrics')).toBeVisible();
    }

    await page.screenshot({
      path: path.join(evidenciasDir, '01_latitud_polar_null_solar.png'),
      fullPage: true,
    });
  });

  test('Escenario B: Transición mixta — Día 1 con datos solares, Días 2 y 3 con datos nulos', async ({ page }) => {
    await page.route(/\/v1\/search/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSearchLongyearbyen) })
    );

    await page.route(/\/v1\/forecast/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockPolarForecastMixed) })
    );

    await page.goto('/');

    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Longyearbyen');
    const option = page.locator('.city-search__option').filter({ hasText: 'Longyearbyen' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    const dayCards = page.locator('.forecast-panel__day');
    await expect(dayCards).toHaveCount(3);

    // Día 0: Datos válidos (08:15 / 15:30 / 7 h 15 min)
    const card0Solar = dayCards.nth(0).locator('.forecast-panel__solar');
    await expect(card0Solar.locator('div', { has: page.locator('dt', { hasText: 'Amanecer' }) }).locator('dd')).toHaveText('08:15');
    await expect(card0Solar.locator('div', { has: page.locator('dt', { hasText: 'Atardecer' }) }).locator('dd')).toHaveText('15:30');
    await expect(card0Solar.locator('div', { has: page.locator('dt', { hasText: 'Duración del día' }) }).locator('dd')).toHaveText('7 h 15 min');

    // Días 1 y 2: Datos nulos (No disponible)
    for (let i = 1; i <= 2; i++) {
      const solarBlock = dayCards.nth(i).locator('.forecast-panel__solar');
      await expect(solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Amanecer' }) }).locator('dd')).toHaveText('No disponible');
      await expect(solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Atardecer' }) }).locator('dd')).toHaveText('No disponible');
      await expect(solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Duración del día' }) }).locator('dd')).toHaveText('No disponible');
    }

    await page.screenshot({
      path: path.join(evidenciasDir, '02_latitud_polar_mixto.png'),
      fullPage: true,
    });
  });
});
