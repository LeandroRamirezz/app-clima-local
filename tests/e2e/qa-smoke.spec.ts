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

async function mockApis(page: Page, airAqi: number | string = 42) {
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
        current: { time: '2026-09-25T10:00', us_aqi: airAqi, pm2_5: 8, pm10: 15, ozone: 32, nitrogen_dioxide: 4, sulphur_dioxide: 1, carbon_monoxide: 180 },
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

test('BUG-007: Bogotá con AQI 58 muestra categoría Moderada con icono y texto', async ({ page }) => {
  await mockApis(page, 58);
  await page.goto('/');
  await selectCity(page, 'Bogotá');
  await page.getByRole('button', { name: 'Calidad del aire' }).click();
  const indicator = page.getByRole('group', { name: 'Índice de calidad del aire: 58, categoría Moderada.' });
  await expect(indicator).toBeVisible();
  await expect(indicator.locator('.air-quality__category')).toContainText('Moderada');
  const icon = indicator.locator('.air-quality__category svg');
  await expect(icon).toBeVisible();
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
  await expect(icon).toHaveAttribute('focusable', 'false');
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(indicator).toBeVisible();
  await expect(icon).toBeVisible();
  const pageWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);
});

test('BUG-008: AQI no numérico muestra N/D sin categoría y conserva los contaminantes', async ({ page }) => {
  await mockApis(page, 'abc');
  await page.goto('/');
  await selectCity(page, 'Neiva');
  await page.getByRole('button', { name: 'Calidad del aire' }).click();
  const indicator = page.getByRole('group', { name: 'Índice de calidad del aire: N/D.' });
  await expect(indicator).toBeVisible();
  await expect(indicator.locator('strong')).toHaveText('N/D');
  await expect(indicator.locator('.air-quality__category')).toHaveCount(0);
  await expect(page.getByText('La calidad del aire no está disponible para esta ubicación.')).toHaveCount(0);
  await expect(page.getByText('Partículas finas')).toBeVisible();
});

test('BUG-009: conserva la fecha y reconsulta Archive al cambiar unidades entre áreas', async ({ page }) => {
  await mockApis(page);
  const archiveRequests: URL[] = [];
  await page.route(/https:\/\/archive-api\.open-meteo\.com\/v1\/archive/, async (route) => {
    const url = new URL(route.request().url());
    archiveRequests.push(url);
    const date = url.searchParams.get('start_date') ?? '';
    const fahrenheit = url.searchParams.get('temperature_unit') === 'fahrenheit';
    await route.fulfill({ json: {
      latitude: 2.93, longitude: -75.28, timezone: 'America/Bogota',
      daily: { time: [date], temperature_2m_max: [fahrenheit ? 88 : 31], temperature_2m_min: [fahrenheit ? 70 : 21],
        temperature_2m_mean: [fahrenheit ? 79 : 26], precipitation_sum: [fahrenheit ? 0.08 : 2],
        wind_speed_10m_max: [fahrenheit ? 7.5 : 12], relative_humidity_2m_mean: [64] },
    } });
  });

  await page.goto('/');
  await selectCity(page, 'Neiva');
  await page.getByRole('button', { name: 'Históricos' }).click();
  await page.getByLabel('Fecha inicial').fill('2026-09-15');
  await page.getByLabel('Fecha final').fill('2026-09-15');
  await page.getByRole('button', { name: 'Consultar histórico' }).click();
  await expect(page.getByRole('heading', { name: 'Histórico — 15/09/2026' })).toBeVisible();
  await expect(page.getByRole('table', { name: /Datos meteorológicos diarios/ })).toContainText('31 °C');
  expect(archiveRequests).toHaveLength(1);

  await page.getByRole('button', { name: 'Clima', exact: true }).click();
  await page.locator('.current-weather__preferences > summary').click();
  await page.getByLabel('Temperatura').selectOption('fahrenheit');
  await page.getByLabel('Viento').selectOption('mph');
  await page.getByLabel('Precipitación').selectOption('inch');
  await expect.poll(() => archiveRequests.at(-1)?.searchParams.get('precipitation_unit')).toBe('inch');
  await page.getByRole('button', { name: 'Históricos' }).click();
  await expect(page.getByLabel('Fecha inicial')).toHaveValue('2026-09-15');
  await expect(page.getByLabel('Fecha final')).toHaveValue('2026-09-15');
  await expect(page.getByRole('heading', { name: 'Histórico — 15/09/2026' })).toBeVisible();
  await expect(page.getByRole('table', { name: /Datos meteorológicos diarios/ })).toContainText('88 °F');
  const latest = archiveRequests.at(-1)?.searchParams;
  expect(latest?.get('start_date')).toBe('2026-09-15');
  expect(latest?.get('end_date')).toBe('2026-09-15');
  expect(latest?.get('temperature_unit')).toBe('fahrenheit');
  expect(latest?.get('wind_speed_unit')).toBe('mph');
  expect(latest?.get('precipitation_unit')).toBe('inch');

  await expect(page.getByLabel('Temperatura')).toHaveValue('fahrenheit');
  await page.getByLabel('Temperatura').selectOption('celsius');
  await expect(page.getByRole('table', { name: /Datos meteorológicos diarios/ })).toContainText('31 °C');
  await expect(page.getByLabel('Fecha inicial')).toHaveValue('2026-09-15');
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(page.getByRole('heading', { name: 'Histórico — 15/09/2026' })).toBeVisible();
  const pageWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);
});

test('BUG-006: compara una fecha con otra histórica y con el clima actual', async ({ page }) => {
  const forecasts = await mockApis(page);
  const archiveRequests: URL[] = [];
  await page.route(/https:\/\/archive-api\.open-meteo\.com\/v1\/archive/, async (route) => {
    const url = new URL(route.request().url());
    archiveRequests.push(url);
    const date = url.searchParams.get('start_date') ?? '';
    const isBase = date === '2026-09-15';
    await route.fulfill({ json: {
      latitude: 2.93, longitude: -75.28, timezone: 'America/Bogota',
      daily: { time: [date], temperature_2m_max: [isBase ? 31 : 29], temperature_2m_min: [21],
        temperature_2m_mean: [isBase ? 26 : 24], precipitation_sum: [2], wind_speed_10m_max: [12],
        relative_humidity_2m_mean: [64] },
    } });
  });
  await page.goto('/');
  await selectCity(page, 'Neiva');
  await page.getByRole('button', { name: 'Históricos' }).click();
  await page.getByLabel('Fecha inicial').fill('2026-09-15');
  await page.getByLabel('Fecha final').fill('2026-09-15');
  await page.getByRole('button', { name: 'Consultar histórico' }).click();
  await expect(page.getByRole('heading', { name: 'Histórico — 15/09/2026' })).toBeVisible();
  await page.getByLabel('Fecha para comparar').fill('2025-09-15');
  await page.getByRole('button', { name: 'Comparar fechas' }).click();
  const historicalTable = page.getByRole('table', { name: /Comparación de dos fechas históricas/ });
  await expect(historicalTable).toContainText('15/09/2025');
  await expect(historicalTable).toContainText('+2 °C');
  expect(archiveRequests.map((url) => url.searchParams.get('start_date'))).toEqual(['2026-09-15', '2025-09-15']);

  await page.getByLabel('Comparar con').selectOption('current');
  const forecastCount = forecasts.length;
  await page.getByRole('button', { name: 'Comparar con clima actual' }).click();
  const currentTable = page.getByRole('table', { name: /Comparación con clima actual/ });
  await expect(currentTable).toContainText('15/09/2026');
  await expect(currentTable).toContainText('Clima actual · 2026-09-24 10:00');
  await expect(currentTable).toContainText('-2 °C');
  await expect(page.getByText(/no representa el mismo periodo/)).toBeVisible();
  expect(forecasts.length).toBeGreaterThan(forecastCount);
  expect(forecasts.at(-1)?.searchParams.get('forecast_days')).toBe('1');
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(currentTable).toBeVisible();
  const pageWidth = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);
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

test('BUG-005: el primer Tab revela el enlace para saltar al contenido principal', async ({ page }) => {
  await mockApis(page);
  await page.goto('/');
  const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' });
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toBeInViewport();
  await expect(skipLink).toHaveAttribute('href', '#main-content');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveURL(/#main-content$/);
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

test('BUG-004: E-04 sigue visible tras el fallback exitoso de ICON a Automático', async ({ page }) => {
  await mockApis(page);
  const models: string[] = [];
  await page.route(/https:\/\/api\.open-meteo\.com\/v1\/forecast/, async (route) => {
    const url = new URL(route.request().url());
    const model = url.searchParams.get('models') ?? '';
    models.push(model);
    if (model === 'icon_seamless') {
      await route.fulfill({ status: 400, json: { error: true, reason: 'detalle técnico privado' } });
    } else {
      await route.fulfill({ json: forecastPayload(url) });
    }
  });
  await page.goto('/');
  await selectCity(page, 'Neiva');
  await expect(page.getByRole('heading', { name: 'Clima actual' })).toBeVisible();
  await page.locator('.current-weather__preferences > summary').click();
  await page.getByText('Opciones avanzadas').click();
  await page.getByLabel('Modelo numérico').selectOption('icon_seamless');
  await expect(page.getByText('Modelo: Automático')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clima actual' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('No fue posible procesar la consulta. Verifique los datos ingresados.');
  await expect(page.getByRole('alert')).not.toContainText('detalle técnico privado');
  expect(models).toEqual(['best_match', 'icon_seamless', 'best_match']);
});
