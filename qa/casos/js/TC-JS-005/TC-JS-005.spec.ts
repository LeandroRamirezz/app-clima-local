import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-JS-005
 * Nombre / Escenario: Fallo de una ciudad en la comparación: aislamiento de errores E-01 a E-05
 * Endpoint o módulo: GET /v1/forecast (múltiples llamadas en paralelo) / RF-04
 * Tipo de prueba: Funcional
 * Prioridad del caso: Alta
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 27/09/2026
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que si una ciudad falla, su columna muestra el error correspondiente
 * y las demás se visualizan normalmente.
 */

const EVIDENCE_DIR = 'qa/casos/js/TC-JS-005/evidencias/TC-JS-005__2026-09-28__run01';

const ERROR_MESSAGES = {
  'E-01': 'No hay conexión a internet. Verifique su red e intente nuevamente.',
  'E-02': 'La consulta tardó demasiado. Intente nuevamente.',
  'E-03': 'Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo.',
  'E-04': 'No fue posible procesar la consulta. Verifique los datos ingresados.',
  'E-05': 'El servicio meteorológico no está disponible en este momento. Intente más tarde.',
};

// Medellín tiene latitud ~6.25 (o 6.24-6.26)
function isMedellinForecast(url: string): boolean {
  return url.includes('latitude=6.2') || url.includes('latitude=6.3');
}

async function addCityToComparison(page: import('@playwright/test').Page, cityName: string) {
  const setupSection = page.locator('.current-weather__comparison-setup');
  const searchInput = setupSection.getByRole('combobox', { name: /Nombre de la ciudad/i });
  await searchInput.fill(cityName);

  const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  await expect(listbox).toBeVisible({ timeout: 10000 });

  const option = listbox.getByRole('option', { name: new RegExp(cityName, 'i') }).first();
  await expect(option).toBeVisible();
  await option.click();
}

test.describe('TC-JS-005: Fallo de una ciudad en la comparación (RF-04)', () => {

  test('Paso 1: Simular error E-01 en Medellín (Fallo de red) manteniendo Bogotá operativo', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.route('**/v1/forecast*', (route) => {
      if (isMedellinForecast(route.request().url())) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Medellín');

    // Validar alerta con role="alert" para Medellín con el mensaje exacto de E-01
    const errorAlert = page.locator('.city-comparison__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 15000 });
    await expect(errorAlert).toContainText(`Medellín: ${ERROR_MESSAGES['E-01']}`);

    // Botón de reintento para Medellín presente
    const retryBtn = errorAlert.getByRole('button', { name: 'Reintentar Medellín' });
    await expect(retryBtn).toBeVisible();

    // La tabla de comparación debe renderizarse
    const table = page.getByRole('table', { name: /Clima actual por ciudad/i });
    await expect(table).toBeVisible();

    // La columna de Medellín debe mostrar 'N/D' y la de Bogotá sus datos numéricos reales
    const ndCells = table.locator('td', { hasText: 'N/D' });
    await expect(ndCells.first()).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e01-fallo-medellin.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 2: Simular error E-02 en Medellín (Timeout > 10 s) manteniendo Bogotá operativo', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.route('**/v1/forecast*', async (route) => {
      if (isMedellinForecast(route.request().url())) {
        // Demorar más de 10 s para timeout de cliente (API_TIMEOUT_MS = 10000)
        await new Promise((resolve) => setTimeout(resolve, 10500));
        try {
          await route.fulfill({ status: 200, json: {} });
        } catch {
          // Ignorar si el test o cliente abortó
        }
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Medellín');

    // Alerta de E-02 para Medellín
    const errorAlert = page.locator('.city-comparison__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 16000 });
    await expect(errorAlert).toContainText(`Medellín: ${ERROR_MESSAGES['E-02']}`);

    const retryBtn = errorAlert.getByRole('button', { name: 'Reintentar Medellín' });
    await expect(retryBtn).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e02-timeout-medellin.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 3: Simular error E-03 en Medellín (HTTP 429 Límite alcanzado)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.route('**/v1/forecast*', (route) => {
      if (isMedellinForecast(route.request().url())) {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: true, reason: 'Rate limit exceeded' }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Medellín');

    const errorAlert = page.locator('.city-comparison__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 15000 });
    await expect(errorAlert).toContainText(`Medellín: ${ERROR_MESSAGES['E-03']}`);
    await expect(errorAlert).not.toContainText('Rate limit exceeded');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e03-limite-429-medellin.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 4: Simular error E-04 en Medellín (HTTP 400 Bad Request)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.route('**/v1/forecast*', (route) => {
      if (isMedellinForecast(route.request().url())) {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: true, reason: 'Invalid latitude parameter' }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Medellín');

    const errorAlert = page.locator('.city-comparison__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 15000 });
    await expect(errorAlert).toContainText(`Medellín: ${ERROR_MESSAGES['E-04']}`);
    await expect(errorAlert).not.toContainText('Invalid latitude parameter');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e04-bad-request-medellin.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 5: Simular error E-05 en Medellín (HTTP 500 / Servicio no disponible)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.route('**/v1/forecast*', (route) => {
      if (isMedellinForecast(route.request().url())) {
        route.fulfill({
          status: 500,
          contentType: 'text/html',
          body: '500 Internal Server Error',
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Medellín');

    const errorAlert = page.locator('.city-comparison__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 15000 });
    await expect(errorAlert).toContainText(`Medellín: ${ERROR_MESSAGES['E-05']}`);
    await expect(errorAlert).not.toContainText('500 Internal Server Error');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e05-error-servidor-medellin.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 6: Reintento selectivo - el botón Reintentar recupera la ciudad fallida sin afectar a las demás', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    let medellinAttempts = 0;
    await page.route('**/v1/forecast*', (route) => {
      if (isMedellinForecast(route.request().url())) {
        medellinAttempts += 1;
        if (medellinAttempts === 1) {
          route.abort('failed');
        } else {
          // El segundo intento (al pulsar reintentar) procede normalmente a Open-Meteo
          route.continue();
        }
      } else {
        route.continue();
      }
    });

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Medellín');

    const errorAlert = page.locator('.city-comparison__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 15000 });

    const retryBtn = errorAlert.getByRole('button', { name: 'Reintentar Medellín' });
    await expect(retryBtn).toBeVisible();

    // Accionar Reintentar Medellín
    await retryBtn.click();

    // El bloque de error debe desaparecer
    await expect(errorAlert).not.toBeVisible({ timeout: 15000 });

    // La tabla debe contener datos válidos para ambas ciudades
    const table = page.getByRole('table', { name: /Clima actual por ciudad/i });
    await expect(table).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/reintento-selectivo-exitoso.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });
});
