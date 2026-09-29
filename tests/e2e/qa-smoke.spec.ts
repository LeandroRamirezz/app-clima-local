import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const places = [
  { id: 1, name: 'Neiva', admin1: 'Huila', country: 'Colombia', latitude: 2.93, longitude: -75.28, timezone: 'America/Bogota', elevation: 442 },
  { id: 2, name: 'Bogotá', admin1: 'Bogotá D.C.', country: 'Colombia', latitude: 4.71, longitude: -74.07, timezone: 'America/Bogota', elevation: 2640 },
];

function forecastPayload(url: URL) {
  const isBogota = Number(url.searchParams.get('latitude')) > 4;
  const fahrenheit = url.searchParams.get('temperature_unit') === 'fahrenheit';
  const degrees = fahrenheit ? (isBogota ? 64 : 82) : (isBogota ? 18 : 28);
  const days = Number(url.searchParams.get('forecast_days') ?? 7);
  const dates = Array.from({ length: days }, (_, index) => `2026-09-${String(24 + index).padStart(2, '0')}`);
  return {
    latitude: isBogota ? 4.71 : 2.93, longitude: isBogota ? -74.07 : -75.28,
    elevation: isBogota ? 2640 : 442, timezone: 'America/Bogota', timezone_abbreviation: '-05',
    current: { time: '2026-09-24T10:00', temperature_2m: degrees, apparent_temperature: degrees + 1,
      relative_humidity_2m: 68, precipitation: 0.2, weather_code: 2, wind_speed_10m: 10.8, wind_direction_10m: 135 },
    hourly: { time: ['2026-09-24T10:00', '2026-09-24T11:00'], temperature_2m: [degrees, degrees + 1],
      apparent_temperature: [degrees + 1, degrees + 2], precipitation_probability: [10, 20], precipitation: [0.2, 0],
      wind_speed_10m: [10.8, 12], uv_index: [4.2, 6.1], weather_code: [2, 3] },
    daily: { time: dates, weather_code: dates.map(() => 2), temperature_2m_max: dates.map(() => degrees + 2),
      temperature_2m_min: dates.map(() => degrees - 7), precipitation_sum: dates.map(() => 1.4),
      precipitation_probability_max: dates.map(() => 30), wind_speed_10m_max: dates.map(() => 18),
      uv_index_max: dates.map(() => 9.2), sunrise: dates.map((date) => `${date}T05:52`),
      sunset: dates.map((date) => `${date}T17:58`), daylight_duration: dates.map(() => 43500) },
  };
}

async function mockApis(page: Page) {
  const forecastRequests: URL[] = [];
  await page.route(/https:\/\/.*open-meteo\.com\/v1\//, async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'geocoding-api.open-meteo.com') {
      const name = url.searchParams.get('name')?.toLowerCase() ?? '';
      await route.fulfill({ json: { results: places.filter((place) => place.name.toLowerCase().includes(name)) } });
    } else if (url.hostname === 'api.open-meteo.com') {
      forecastRequests.push(url);
      await route.fulfill({ json: forecastPayload(url) });
    } else if (url.hostname === 'archive-api.open-meteo.com') {
      const date = url.searchParams.get('start_date') ?? '2026-08-10';
      await route.fulfill({ json: {
        latitude: 2.93, longitude: -75.28, timezone: 'America/Bogota',
        daily: { time: [date], temperature_2m_max: [31], temperature_2m_min: [21], temperature_2m_mean: [26],
          precipitation_sum: [2], wind_speed_10m_max: [12], relative_humidity_2m_mean: [64] },
      } });
    } else if (url.hostname === 'air-quality-api.open-meteo.com') {
      await route.fulfill({ json: {
        latitude: 2.93, longitude: -75.28, timezone: 'America/Bogota',
        current_units: { us_aqi: 'USAQI', pm2_5: 'μg/m³', pm10: 'μg/m³', ozone: 'μg/m³', nitrogen_dioxide: 'μg/m³', sulphur_dioxide: 'μg/m³', carbon_monoxide: 'μg/m³' },
        current: { time: '2026-09-25T10:00', us_aqi: 42, pm2_5: 8, pm10: 15, ozone: 32, nitrogen_dioxide: 4, sulphur_dioxide: 1, carbon_monoxide: 180 },
        hourly: { time: ['2026-09-25T10:00', '2026-09-25T11:00'], us_aqi: [42, 43], pm2_5: [8, 9], pm10: [15, 16], ozone: [32, 33], nitrogen_dioxide: [4, 5], sulphur_dioxide: [1, 2], carbon_monoxide: [180, 181] },
        hourly_units: { us_aqi: 'USAQI', pm2_5: 'μg/m³', pm10: 'μg/m³', ozone: 'μg/m³', nitrogen_dioxide: 'μg/m³', sulphur_dioxide: 'μg/m³', carbon_monoxide: 'μg/m³' },
      } });
    } else await route.abort();
  });
  return forecastRequests;
}

async function selectCity(page: Page, city: string, searchIndex = 0) {
  await page.getByRole('combobox', { name: 'Nombre de la ciudad' }).nth(searchIndex).fill(city);
  await page.getByRole('option', { name: new RegExp(city) }).first().click();
}

test('smoke funcional: clima, comparación, histórico, aire, unidades y modelo', async ({ page }) => {
  const forecasts = await mockApis(page);
  await page.goto('/');
  await selectCity(page, 'Neiva');
  await expect(page.getByRole('heading', { name: 'Clima actual' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pronóstico diario' })).toBeVisible();
  await page.getByRole('button', { name: 'Horario' }).click();
  await expect(page.getByRole('heading', { name: 'Pronóstico horario' })).toBeVisible();
  await page.getByRole('button', { name: 'Comparar ciudades' }).click();
  await page.getByRole('button', { name: /Agregar ubicación seleccionada/ }).click();
  await selectCity(page, 'Bogotá', 1);
  await expect(page.getByRole('heading', { name: 'Comparación actual' })).toBeVisible();
  await expect(page.getByRole('table', { name: /Clima actual por ciudad/ }).getByRole('columnheader', { name: 'Bogotá' })).toBeVisible();
  await page.getByRole('button', { name: 'Históricos' }).click();
  await page.getByLabel('Fecha inicial').fill('2026-08-10');
  await page.getByLabel('Fecha final').fill('2026-08-10');
  await page.getByRole('button', { name: 'Consultar histórico' }).click();
  await expect(page.getByRole('heading', { name: 'Histórico — 10/08/2026' })).toBeVisible();
  await page.getByLabel('Fecha para comparar').fill('2026-08-09');
  await page.getByRole('button', { name: 'Comparar fechas' }).click();
  await expect(page.getByRole('table', { name: /Comparación de dos fechas históricas/ })).toBeVisible();
  await page.getByRole('button', { name: 'Calidad del aire' }).click();
  await expect(page.getByText('Índice de calidad del aire · US AQI')).toBeVisible();
  await expect(page.getByText('PM2.5').first()).toBeVisible();
  await page.getByRole('button', { name: 'Clima', exact: true }).click();
  await page.locator('.current-weather__preferences > summary').click();
  await page.getByLabel('Temperatura').selectOption('fahrenheit');
  await expect(page.locator('.current-weather__temperature strong')).toContainText('°F');
  await page.getByText('Opciones avanzadas').click();
  await page.getByLabel('Modelo numérico').selectOption('ncep_gfs_seamless');
  await expect(page.getByText('Modelo: GFS')).toBeVisible();
  await expect.poll(() => forecasts.at(-1)?.searchParams.get('models')).toBe('ncep_gfs_seamless');
});

test('accesibilidad automática y layout a 320 px', async ({ page }) => {
  await mockApis(page);
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/');
  await selectCity(page, 'Neiva');
  await expect(page.getByRole('heading', { name: 'Clima actual' })).toBeVisible();
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations, JSON.stringify(audit.violations, null, 2)).toEqual([]);
});

test('BUG-002: Forecast HTTP 429 muestra E-03 sin botón Reintentar', async ({ page }) => {
  await mockApis(page);
  let forecastRequests = 0;
  await page.route(/https:\/\/api\.open-meteo\.com\/v1\/forecast/, async (route) => {
    forecastRequests += 1;
    await route.fulfill({ status: 429, json: { error: true, reason: 'detalle técnico' } });
  });
  await page.goto('/');
  await selectCity(page, 'Neiva');
  await expect(page.getByRole('alert')).toHaveText('Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo.');
  await expect(page.locator('.current-weather__retry')).toHaveCount(0);
  expect(forecastRequests).toBe(1);
});

test('BUG-003: ICON con datos nulos informa cobertura y permite volver a Automático', async ({ page }) => {
  await mockApis(page);
  const models: string[] = [];
  await page.route(/https:\/\/api\.open-meteo\.com\/v1\/forecast/, async (route) => {
    const url = new URL(route.request().url());
    const model = url.searchParams.get('models') ?? '';
    models.push(model);
    const payload = forecastPayload(url);
    await route.fulfill({ json: model === 'icon_seamless'
      ? { ...payload, current: { ...payload.current, temperature_2m: null, weather_code: null } }
      : payload });
  });
  await page.goto('/');
  await selectCity(page, 'Neiva');
  await expect(page.getByRole('heading', { name: 'Clima actual' })).toBeVisible();
  await page.locator('.current-weather__preferences > summary').click();
  await page.getByText('Opciones avanzadas').click();
  await page.getByLabel('Modelo numérico').selectOption('icon_seamless');
  await expect(page.getByText('El modelo ICON no tiene datos para esta ubicación. Se muestran los datos disponibles o puede volver a Automático.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Volver a Automático' })).toBeVisible();
  await expect(page.getByText('Condición no disponible')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 720 });
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
  await page.getByRole('button', { name: 'Volver a Automático' }).click();
  await expect(page.getByText('Modelo: Automático')).toBeVisible();
  await expect(page.getByText(/El modelo ICON no tiene datos/)).toHaveCount(0);
  expect(models).toEqual(['best_match', 'icon_seamless', 'best_match']);
});
