import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-011__2026-09-28__run01');

const mockSearchNeiva = {
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

const mockForecast3Days = {
  latitude: 2.9273,
  longitude: -75.2819,
  timezone: 'America/Bogota',
  elevation: 442,
  current: {
    time: '2026-09-27T14:00',
    temperature_2m: 32.5,
    apparent_temperature: 35.1,
    relative_humidity_2m: 65,
    precipitation: 0.0,
    weather_code: 0,
    wind_speed_10m: 12.3,
    wind_direction_10m: 180,
  },
  hourly: {
    time: ['2026-09-27T14:00'],
    temperature_2m: [32.5],
    apparent_temperature: [35.1],
    precipitation_probability: [10],
    precipitation: [0.0],
    wind_speed_10m: [12.3],
    uv_index: [7.0],
    weather_code: [0],
  },
  daily: {
    time: ['2026-09-27', '2026-09-28', '2026-09-29'],
    weather_code: [0, 1, 2],
    temperature_2m_max: [34.0, 33.5, 32.0],
    temperature_2m_min: [22.0, 21.5, 22.5],
    precipitation_sum: [0.0, 1.2, 0.5],
    precipitation_probability_max: [20, 40, 30],
    wind_speed_10m_max: [15.0, 14.0, 16.0],
    uv_index_max: [9.0, 8.5, 8.0],
    sunrise: ['2026-09-27T05:47', '2026-09-28T05:48', '2026-09-29T05:48'],
    sunset: ['2026-09-27T18:02', '2026-09-28T18:01', '2026-09-29T18:00'],
    daylight_duration: [44100, 43980, 43200],
  },
};

/**
 * CASO DE PRUEBA: TC-JC-011
 * Objetivo: Verificar amanecer, atardecer y duración del día (valores válidos) en la vista diaria
 * Diseñado por: Juan Camilo La Rotta - 27/09/2026
 */
test.describe('TC-JC-011: Amanecer, atardecer y duración del día (valores válidos)', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  test('Escenario A: Datos controlados (Mock) — Neiva 3 días', async ({ page }) => {
    await page.route(/\/v1\/search/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSearchNeiva) })
    );

    await page.route(/\/v1\/forecast/, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockForecast3Days) })
    );

    await page.goto('/');

    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');
    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    // 1. Tarjeta de clima actual (Hoy)
    const currentSolar = page.locator('.current-weather__solar');
    await expect(currentSolar).toBeVisible();

    // Etiquetas textuales presentes
    await expect(currentSolar.locator('dt', { hasText: 'Amanecer' })).toBeVisible();
    await expect(currentSolar.locator('dt', { hasText: 'Atardecer' })).toBeVisible();
    await expect(currentSolar.locator('dt', { hasText: 'Duración del día' })).toBeVisible();

    // Valores correspondientes al día 0
    const currentSunrise = currentSolar.locator('div', { has: page.locator('dt', { hasText: 'Amanecer' }) }).locator('dd');
    const currentSunset = currentSolar.locator('div', { has: page.locator('dt', { hasText: 'Atardecer' }) }).locator('dd');
    const currentDuration = currentSolar.locator('div', { has: page.locator('dt', { hasText: 'Duración del día' }) }).locator('dd');

    await expect(currentSunrise).toHaveText('05:47');
    await expect(currentSunset).toHaveText('18:02');
    await expect(currentDuration).toHaveText('12 h 15 min');

    // 2. Pronóstico diario (3 días)
    const dayCards = page.locator('.forecast-panel__day');
    await expect(dayCards).toHaveCount(3);

    const expectedData = [
      { sunrise: '05:47', sunset: '18:02', duration: '12 h 15 min' },
      { sunrise: '05:48', sunset: '18:01', duration: '12 h 13 min' },
      { sunrise: '05:48', sunset: '18:00', duration: '12 h' },
    ];

    for (let i = 0; i < expectedData.length; i++) {
      const card = dayCards.nth(i);
      const solarBlock = card.locator('.forecast-panel__solar');
      await expect(solarBlock).toBeVisible();

      // Etiquetas textuales
      await expect(solarBlock.locator('dt', { hasText: 'Amanecer' })).toBeVisible();
      await expect(solarBlock.locator('dt', { hasText: 'Atardecer' })).toBeVisible();
      await expect(solarBlock.locator('dt', { hasText: 'Duración del día' })).toBeVisible();

      // Valores en HH:mm y X h Y min
      const sunriseVal = solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Amanecer' }) }).locator('dd');
      const sunsetVal = solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Atardecer' }) }).locator('dd');
      const durationVal = solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Duración del día' }) }).locator('dd');

      await expect(sunriseVal).toHaveText(expectedData[i].sunrise);
      await expect(sunsetVal).toHaveText(expectedData[i].sunset);
      await expect(durationVal).toHaveText(expectedData[i].duration);
    }

    await page.screenshot({
      path: path.join(evidenciasDir, '01_valores_validos_mock.png'),
      fullPage: true,
    });
  });

  test('Escenario B: API Real — Neiva (Validación de formato 24h y duración)', async ({ page }) => {
    await page.goto('/');

    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');
    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();

    await expect(page.locator('.current-weather__card')).toBeVisible();

    const dayCards = page.locator('.forecast-panel__day');
    const count = await dayCards.count();
    expect(count).toBeGreaterThan(0);

    const timeRegex = /^\d{2}:\d{2}$/;
    const durationRegex = /^\d+\s*h(\s+\d+\s*min)?$/;

    for (let i = 0; i < count; i++) {
      const card = dayCards.nth(i);
      const solarBlock = card.locator('.forecast-panel__solar');
      await expect(solarBlock).toBeVisible();

      // Verificar etiquetas de texto explícitas
      await expect(solarBlock.locator('dt', { hasText: 'Amanecer' })).toBeVisible();
      await expect(solarBlock.locator('dt', { hasText: 'Atardecer' })).toBeVisible();
      await expect(solarBlock.locator('dt', { hasText: 'Duración del día' })).toBeVisible();

      const sunriseText = await solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Amanecer' }) }).locator('dd').innerText();
      const sunsetText = await solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Atardecer' }) }).locator('dd').innerText();
      const durationText = await solarBlock.locator('div', { has: page.locator('dt', { hasText: 'Duración del día' }) }).locator('dd').innerText();

      expect(sunriseText).toMatch(timeRegex);
      expect(sunsetText).toMatch(timeRegex);
      expect(durationText).toMatch(durationRegex);
    }

    await page.screenshot({
      path: path.join(evidenciasDir, '02_valores_validos_api_real.png'),
      fullPage: true,
    });
  });
});
