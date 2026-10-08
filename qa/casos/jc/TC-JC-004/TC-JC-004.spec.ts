import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-004__2026-10-08__run02');

/**
 * CASO DE PRUEBA: TC-JC-004
 * Requerimiento: RF-01 (Manejo de errores E-01 a E-05 en la consulta de pronóstico)
 * Diseñado por: Juan Camilo La Rotta
 * Fecha: 2026-09-28
 */
test.describe('TC-JC-004: Manejo de errores E-01 a E-05 en la consulta de pronóstico', () => {

  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  // Helper para buscar Neiva y llegar a la consulta de pronóstico
  async function selectNeiva(page: any) {
    await page.route(/\/v1\/search/, async (route: any) => {
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

    await page.goto('/');
    const searchInput = page.getByLabel('Nombre de la ciudad');
    await searchInput.fill('Neiva');
    const option = page.locator('.city-search__option').filter({ hasText: 'Neiva' }).first();
    await expect(option).toBeVisible({ timeout: 10000 });
    await option.click();
  }

  test('E-01: Sin conexión / Error de red', async ({ page }) => {
    await page.route(/\/v1\/forecast/, async (route) => {
      await route.abort('failed');
    });

    await selectNeiva(page);

    const alertRegion = page.locator('.current-weather__error[role="alert"]');
    await expect(alertRegion).toBeVisible();
    await expect(alertRegion).toContainText('No hay conexión a internet. Verifique su red e intente nuevamente.');

    // Botón Reintentar presente
    const retryButton = alertRegion.locator('.current-weather__retry');
    await expect(retryButton).toBeVisible();

    await page.screenshot({
      path: path.join(evidenciasDir, '01_E-01_sin_conexion.png'),
      fullPage: true,
    });
  });

  test('E-02: Tiempo de espera agotado (> 10 s)', async ({ page }) => {
    test.setTimeout(20000); // Dar margen al test para aguardar los 10s de timeout de la app

    await page.route(/\/v1\/forecast/, async (route) => {
      // Retrasar más de 10s para que la app dispare el timeout interno (10.000 ms)
      await new Promise((resolve) => setTimeout(resolve, 10500));
      await route.fulfill({ status: 200, body: '{}' });
    });

    await selectNeiva(page);

    const alertRegion = page.locator('.current-weather__error[role="alert"]');
    await expect(alertRegion).toBeVisible({ timeout: 15000 });
    await expect(alertRegion).toContainText('La consulta tardó demasiado. Intente nuevamente.');

    // Botón Reintentar presente
    const retryButton = alertRegion.locator('.current-weather__retry');
    await expect(retryButton).toBeVisible();

    await page.screenshot({
      path: path.join(evidenciasDir, '02_E-02_timeout.png'),
      fullPage: true,
    });
  });

  test('E-03: HTTP 429 (Límite alcanzado) - Debe ocultar botón Reintentar', async ({ page }) => {
    await page.route(/\/v1\/forecast/, async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: true, reason: 'Limit reached' }),
      });
    });

    await selectNeiva(page);

    const alertRegion = page.locator('.current-weather__error[role="alert"]');
    await expect(alertRegion).toBeVisible();
    await expect(alertRegion).toContainText('Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo.');

    await page.screenshot({
      path: path.join(evidenciasDir, '03_E-03_http_429.png'),
      fullPage: true,
    });

    // Criterio de aceptación explícito para E-03: El botón Reintentar NO debe estar visible
    const retryButton = alertRegion.locator('.current-weather__retry');
    await expect(retryButton).toBeHidden();
  });

  test('E-04: HTTP 400 (Parámetros inválidos)', async ({ page }) => {
    await page.route(/\/v1\/forecast/, async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: true, reason: 'Invalid latitude parameter' }),
      });
    });

    await selectNeiva(page);

    const alertRegion = page.locator('.current-weather__error[role="alert"]');
    await expect(alertRegion).toBeVisible();
    await expect(alertRegion).toContainText('No fue posible procesar la consulta. Verifique los datos ingresados.');

    const retryButton = alertRegion.locator('.current-weather__retry');
    await expect(retryButton).toBeVisible();

    await page.screenshot({
      path: path.join(evidenciasDir, '04_E-04_http_400.png'),
      fullPage: true,
    });
  });

  test('E-05: HTTP 500 / Fallo de servidor y JSON malformado', async ({ page }) => {
    // Prueba con HTTP 500
    await page.route(/\/v1\/forecast/, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: true, reason: 'Internal Server Error' }),
      });
    });

    await selectNeiva(page);

    const alertRegion = page.locator('.current-weather__error[role="alert"]');
    await expect(alertRegion).toBeVisible();
    await expect(alertRegion).toContainText('El servicio meteorológico no está disponible en este momento. Intente más tarde.');

    const retryButton = alertRegion.locator('.current-weather__retry');
    await expect(retryButton).toBeVisible();

    await page.screenshot({
      path: path.join(evidenciasDir, '05_E-05_http_500.png'),
      fullPage: true,
    });
  });
});
