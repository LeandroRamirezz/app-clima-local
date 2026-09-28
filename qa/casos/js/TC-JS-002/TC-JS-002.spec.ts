import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-JS-002
 * Nombre / Escenario: Geolocalización: concedido, denegado, timeout, posición no disponible y sin soporte
 * Endpoint o módulo: Geolocation API del navegador / RF-03 (con interacción con RF-02 y RF-01)
 * Tipo de prueba: Funcional
 * Prioridad del caso: Crítica
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 27/09/2026
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que la app responde de forma controlada a todos los desenlaces del permiso
 * de geolocalización y que la búsqueda manual sigue disponible.
 */

const EXPECTED_MESSAGES = {
  permissionDenied:
    'No se pudo acceder a su ubicación porque el permiso fue denegado. Puede buscar su ciudad manualmente o habilitar el permiso en la configuración del navegador.',
  timeout:
    'Se agotó el tiempo para obtener su ubicación. Intente de nuevo o busque su ciudad manualmente.',
  positionUnavailable:
    'No fue posible determinar su ubicación en este momento.',
  unsupported:
    'La geolocalización no está disponible en este navegador.',
};

test.describe('TC-JS-002: Geolocalización automática (RF-03)', () => {

  test('Escenario 1: Permiso concedido - detecta coordenadas simuladas y muestra clima', async ({ browser }) => {
    // Coordenadas simuladas: lat=2.93, lon=-75.28 (Neiva / Huila aprox)
    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 2.93, longitude: -75.28 },
    });
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    const geoBtn = page.getByRole('button', { name: /Usar mi ubicación/i });
    await expect(geoBtn).toBeVisible();

    await geoBtn.click();

    // Debe mostrar la sección de ubicación activa con coordenadas redondeadas a 2 decimales
    const activeLocation = page.locator('section.active-location');
    await expect(activeLocation).toBeVisible({ timeout: 10000 });
    await expect(activeLocation).toContainText('Mi ubicación (2.93, -75.28)');
    await expect(activeLocation).toContainText('Latitud: 2.93');
    await expect(activeLocation).toContainText('Longitud: -75.28');

    // Debe cargar y mostrar la sección del clima actual
    const currentWeather = page.locator('.current-weather');
    await expect(currentWeather).toBeVisible({ timeout: 10000 });

    // La búsqueda manual debe seguir presente y operable
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();

    await page.screenshot({
      path: 'qa/casos/js/TC-JS-002/evidencias/TC-JS-002__2026-09-28__run01/escenario1-concedido.png',
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
    await context.close();
  });

  test('Escenario 2: Permiso denegado - muestra mensaje apropiado y mantiene búsqueda manual', async ({ browser }) => {
    // Contexto sin otorgar permiso (simulando denegación en navegador)
    const context = await browser.newContext();
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Simular que navigator.geolocation.getCurrentPosition falla con PERMISSION_DENIED (código 1)
    await page.addInitScript(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = (success, error, _options) => {
          if (error) {
            const err = {
              code: 1,
              message: 'User denied Geolocation',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError;
            setTimeout(() => error(err), 50);
          }
        };
      }
    });

    await page.goto('/');

    const geoBtn = page.getByRole('button', { name: /Usar mi ubicación/i });
    await expect(geoBtn).toBeVisible();
    await geoBtn.click();

    // Debe mostrar mensaje de error con role="alert"
    const alertMsg = page.locator('.geolocation-control__message[role="alert"]');
    await expect(alertMsg).toBeVisible({ timeout: 5000 });
    await expect(alertMsg).toHaveText(EXPECTED_MESSAGES.permissionDenied);

    // No debe reintentar automáticamente ni bloquear la búsqueda manual
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Medellín');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'qa/casos/js/TC-JS-002/evidencias/TC-JS-002__2026-09-28__run01/escenario2-denegado.png',
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
    await context.close();
  });

  test('Escenario 3: Timeout - muestra mensaje de tiempo agotado, botón reintentar y búsqueda manual activa', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Simular error de timeout (código 3)
    await page.addInitScript(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = (success, error, _options) => {
          if (error) {
            const err = {
              code: 3,
              message: 'Timeout expired',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError;
            setTimeout(() => error(err), 50);
          }
        };
      }
    });

    await page.goto('/');

    const geoBtn = page.getByRole('button', { name: /Usar mi ubicación/i });
    await expect(geoBtn).toBeVisible();
    await geoBtn.click();

    // Mensaje de timeout
    const alertMsg = page.locator('.geolocation-control__message[role="alert"]');
    await expect(alertMsg).toBeVisible({ timeout: 5000 });
    await expect(alertMsg).toHaveText(EXPECTED_MESSAGES.timeout);

    // Debe permitir reintento (botón con texto "Reintentar ubicación")
    const retryBtn = page.getByRole('button', { name: /Reintentar ubicación/i });
    await expect(retryBtn).toBeVisible();

    // Búsqueda manual disponible
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();

    await page.screenshot({
      path: 'qa/casos/js/TC-JS-002/evidencias/TC-JS-002__2026-09-28__run01/escenario3-timeout.png',
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
    await context.close();
  });

  test('Escenario 4: Posición no disponible - mensaje exacto y búsqueda manual funcional', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Simular POSITION_UNAVAILABLE (código 2)
    await page.addInitScript(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition = (success, error, _options) => {
          if (error) {
            const err = {
              code: 2,
              message: 'Position unavailable',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError;
            setTimeout(() => error(err), 50);
          }
        };
      }
    });

    await page.goto('/');

    const geoBtn = page.getByRole('button', { name: /Usar mi ubicación/i });
    await expect(geoBtn).toBeVisible();
    await geoBtn.click();

    const alertMsg = page.locator('.geolocation-control__message[role="alert"]');
    await expect(alertMsg).toBeVisible({ timeout: 5000 });
    await expect(alertMsg).toHaveText(EXPECTED_MESSAGES.positionUnavailable);

    // Búsqueda manual disponible
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();

    await page.screenshot({
      path: 'qa/casos/js/TC-JS-002/evidencias/TC-JS-002__2026-09-28__run01/escenario4-posicion-no-disponible.png',
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
    await context.close();
  });

  test('Escenario 5: Sin soporte de navegador - botón deshabilitado/mensaje y búsqueda manual operativa', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Eliminar soporte de geolocation
    await page.addInitScript(() => {
      // @ts-ignore
      delete Object.getPrototypeOf(navigator).geolocation;
      // @ts-ignore
      delete navigator.geolocation;
    });

    await page.goto('/');

    // Al hacer clic o al evaluar disponibilidad
    const geoBtn = page.getByRole('button', { name: /Usar mi ubicación/i });
    await expect(geoBtn).toBeVisible();
    await geoBtn.click();

    // Mensaje de navegador sin soporte
    const alertMsg = page.locator('.geolocation-control__message[role="alert"]');
    await expect(alertMsg).toBeVisible({ timeout: 5000 });
    await expect(alertMsg).toHaveText(EXPECTED_MESSAGES.unsupported);

    // El botón debe quedar deshabilitado
    await expect(geoBtn).toBeDisabled();

    // Búsqueda manual completamente operativa
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Cali');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'qa/casos/js/TC-JS-002/evidencias/TC-JS-002__2026-09-28__run01/escenario5-sin-soporte.png',
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
    await context.close();
  });

  test('Escenario 6: Contexto no seguro - mismo mensaje de no disponible y búsqueda manual operativa', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Simular que window.isSecureContext = false
    await page.addInitScript(() => {
      Object.defineProperty(window, 'isSecureContext', {
        configurable: true,
        get: () => false,
      });
    });

    await page.goto('/');

    const geoBtn = page.getByRole('button', { name: /Usar mi ubicación/i });
    await expect(geoBtn).toBeVisible();
    await geoBtn.click();

    const alertMsg = page.locator('.geolocation-control__message[role="alert"]');
    await expect(alertMsg).toBeVisible({ timeout: 5000 });
    await expect(alertMsg).toHaveText(EXPECTED_MESSAGES.unsupported);

    // El botón debe quedar deshabilitado
    await expect(geoBtn).toBeDisabled();

    // Búsqueda manual disponible
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();

    await page.screenshot({
      path: 'qa/casos/js/TC-JS-002/evidencias/TC-JS-002__2026-09-28__run01/escenario6-contexto-no-seguro.png',
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
    await context.close();
  });
});
