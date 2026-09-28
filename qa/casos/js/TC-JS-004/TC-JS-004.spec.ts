import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-JS-004
 * Nombre / Escenario: Manejo de errores E-01 a E-05 en búsqueda
 * Endpoint o módulo: GET /v1/search (Geocoding API Open-Meteo) / RF-02
 * Tipo de prueba: Funcional
 * Prioridad del caso: Crítica
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 27/09/2026
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que la búsqueda maneja los errores E-01 a E-05 mostrando el mensaje
 * correcto en role="alert" con botón Reintentar.
 */

const EVIDENCE_DIR = 'qa/casos/js/TC-JS-004/evidencias/TC-JS-004__2026-09-28__run01';

const ERROR_MESSAGES = {
  'E-01': 'No hay conexión a internet. Verifique su red e intente nuevamente.',
  'E-02': 'La consulta tardó demasiado. Intente nuevamente.',
  'E-03': 'Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo.',
  'E-04': 'No fue posible procesar la consulta. Verifique los datos ingresados.',
  'E-05': 'El servicio meteorológico no está disponible en este momento. Intente más tarde.',
};

test.describe('TC-JS-004: Manejo de errores E-01 a E-05 en búsqueda (RF-02)', () => {

  test('Paso 1: Simular error E-01 (Sin conexión / fallo de red)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Abortar llamadas a la API de geocodificación simulando fallo de red
    await page.route('**/v1/search*', (route) => route.abort('failed'));

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Bogotá');

    // Debe mostrar contenedor con role="alert" y mensaje exacto
    const errorAlert = page.locator('.city-search__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(ERROR_MESSAGES['E-01']);

    // Botón Reintentar visible
    const retryBtn = errorAlert.getByRole('button', { name: 'Reintentar' });
    await expect(retryBtn).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e01-sin-conexion.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 2: Simular error E-02 (Timeout > 10 s)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Demorar la respuesta por más de 10 segundos para que se dispare el timeout del cliente (API_TIMEOUT_MS = 10000)
    await page.route('**/v1/search*', async (route) => {
      // Esperar 10500 ms antes de responder
      await new Promise((resolve) => setTimeout(resolve, 10500));
      try {
        await route.fulfill({ status: 200, json: { results: [] } });
      } catch {
        // Ignorar si el cliente ya abortó
      }
    });

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Bogotá');

    const errorAlert = page.locator('.city-search__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 15000 });
    await expect(errorAlert).toContainText(ERROR_MESSAGES['E-02']);

    const retryBtn = errorAlert.getByRole('button', { name: 'Reintentar' });
    await expect(retryBtn).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e02-timeout.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 3: Simular error E-03 (HTTP 429 - Límite de consultas excedido)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Interceptar y responder con código HTTP 429
    await page.route('**/v1/search*', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: true, reason: 'Daily API request limit exceeded' }),
      });
    });

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Bogotá');

    const errorAlert = page.locator('.city-search__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(ERROR_MESSAGES['E-03']);
    // No debe contener el texto técnico en crudo devuelto por la API
    await expect(errorAlert).not.toContainText('Daily API request limit exceeded');

    const retryBtn = errorAlert.getByRole('button', { name: 'Reintentar' });
    await expect(retryBtn).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e03-limite-429.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 4: Simular error E-04 (HTTP 400 - Parámetros inválidos)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Interceptar y responder con código HTTP 400
    await page.route('**/v1/search*', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: true, reason: 'Cannot initialize GeocodingQuery from invalid arguments' }),
      });
    });

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Bogotá');

    const errorAlert = page.locator('.city-search__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(ERROR_MESSAGES['E-04']);
    await expect(errorAlert).not.toContainText('invalid arguments');

    const retryBtn = errorAlert.getByRole('button', { name: 'Reintentar' });
    await expect(retryBtn).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e04-bad-request-400.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 5: Simular error E-05 (HTTP 500 / Respuesta malformada)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Interceptar y responder con código HTTP 500 y cuerpo malformado
    await page.route('**/v1/search*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'text/html',
        body: 'Internal Server Error - Service Crashed',
      });
    });

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Bogotá');

    const errorAlert = page.locator('.city-search__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(ERROR_MESSAGES['E-05']);
    await expect(errorAlert).not.toContainText('Service Crashed');

    const retryBtn = errorAlert.getByRole('button', { name: 'Reintentar' });
    await expect(retryBtn).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/e05-error-servidor-500.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });

  test('Paso Adicional: Operación del botón Reintentar recupera la búsqueda', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    let attempts = 0;
    // La primera petición falla con E-01 (red caída), la segunda tiene éxito
    await page.route('**/v1/search*', (route) => {
      attempts += 1;
      if (attempts === 1) {
        route.abort('failed');
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            results: [
              {
                id: 3688689,
                name: 'Bogotá',
                latitude: 4.60971,
                longitude: -74.08175,
                admin1: 'Bogota D.C.',
                country: 'Colombia',
              },
            ],
          }),
        });
      }
    });

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Bogotá');

    const errorAlert = page.locator('.city-search__error[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    const retryBtn = errorAlert.getByRole('button', { name: 'Reintentar' });
    await expect(retryBtn).toBeVisible();

    // Accionar Reintentar
    await retryBtn.click();

    // Debe recuperar y mostrar la lista con la ubicación
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await expect(listbox.getByRole('option', { name: /Bogotá/i })).toBeVisible();

    // El error debe haber desaparecido
    await expect(errorAlert).not.toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/reintento-exitoso.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    expect(pageErrors).toHaveLength(0);
  });
});
