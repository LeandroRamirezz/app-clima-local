import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-JS-006
 * Nombre / Escenario: Flujo completo: geocodificar/geolocalizar → pronóstico → renderizar
 * Endpoint o módulo: Flujo completo de la app (búsqueda, geolocalización, pronóstico) / RF-01, RF-02, RF-03, RF-04
 * Tipo de prueba: Integración
 * Prioridad del caso: Crítica
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 27/09/2026
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar la integración de la ubicación (manual y automática) con la consulta de pronóstico y su renderizado.
 */

const EVIDENCE_DIR = 'qa/casos/js/TC-JS-006/evidencias/TC-JS-006__2026-09-28__run01';

test.describe('TC-JS-006: Flujo completo de integración (RF-01 a RF-04)', () => {

  test('Flujo 1: Búsqueda manual de ciudad -> Selección -> Consulta y renderizado de pronóstico', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Monitorear que se dispare la llamada a /v1/forecast con las coordenadas de Bogotá tras seleccionarla
    const forecastPromise = page.waitForResponse(
      (resp) => resp.url().includes('/v1/forecast') && resp.status() === 200,
      { timeout: 15000 }
    );

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();

    // 1. Escribir Bogotá y seleccionar
    await searchInput.fill('Bogotá');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });

    const bogotaOption = listbox.getByRole('option', { name: /Bogotá/i }).first();
    await expect(bogotaOption).toBeVisible();
    await bogotaOption.click();

    // 2. Esperar y validar respuesta de forecast
    const forecastResponse = await forecastPromise;
    expect(forecastResponse.ok()).toBe(true);
    const forecastJson = await forecastResponse.json();

    // Validar que se actualiza la sección de ubicación activa
    const activeLocation = page.locator('section.active-location');
    await expect(activeLocation).toBeVisible();
    await expect(activeLocation).toContainText('Bogotá');

    // Validar renderizado de la tarjeta de clima actual
    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard).toBeVisible({ timeout: 10000 });
    await expect(currentWeatherCard.locator('.current-weather__location')).toContainText('Bogotá');

    // Validar que los datos de temperatura y métricas están visibles y corresponden a números formateados
    const tempElement = page.locator('.current-weather__temperature strong');
    await expect(tempElement).toBeVisible();
    const tempText = await tempElement.innerText();
    expect(tempText).toMatch(/^-?\d+([.,]\d+)?\s*°C$/);

    // Validar que el panel de pronóstico diario u horario se renderiza
    const forecastPanel = page.locator('.forecast-panel');
    await expect(forecastPanel).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/flujo1-busqueda-pronostico-bogota.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });

  test('Flujo 2: Geolocalización concedida -> Consulta automática y renderizado del clima detectado', async ({ browser }) => {
    // Configurar contexto con permisos y coordenadas simuladas (lat: 2.93, lon: -75.28)
    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 2.93, longitude: -75.28 },
    });
    const page = await context.newPage();

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    const forecastPromise = page.waitForResponse(
      (resp) => resp.url().includes('/v1/forecast') && resp.url().includes('latitude=2.93') && resp.status() === 200,
      { timeout: 15000 }
    );

    // 3. Accionar botón "Usar mi ubicación"
    const geoBtn = page.getByRole('button', { name: /Usar mi ubicación/i });
    await expect(geoBtn).toBeVisible();
    await geoBtn.click();

    // Validar recepción de datos meteorológicos para las coordenadas
    const forecastResponse = await forecastPromise;
    expect(forecastResponse.ok()).toBe(true);

    // Verificar ubicación activa rotulada con coordenadas a 2 decimales
    const activeLocation = page.locator('section.active-location');
    await expect(activeLocation).toBeVisible({ timeout: 10000 });
    await expect(activeLocation).toContainText('Mi ubicación (2.93, -75.28)');

    // Verificar clima actual
    const currentWeatherCard = page.locator('.current-weather__card');
    await expect(currentWeatherCard).toBeVisible({ timeout: 10000 });
    await expect(currentWeatherCard.locator('.current-weather__location')).toContainText('Mi ubicación (2.93, -75.28)');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/flujo2-geolocalizacion-pronostico.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
    await context.close();
  });

  test('Flujo 3: Comparación de 2 ciudades -> Solicitudes concurrentes y renderizado lado a lado', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    // 4. Cambiar a modo Comparar ciudades
    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    const setupSection = page.locator('.current-weather__comparison-setup');
    const searchInput = setupSection.getByRole('combobox', { name: /Nombre de la ciudad/i });

    // Agregar Bogotá
    await searchInput.fill('Bogotá');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Bogotá/i }).first().click();

    // Agregar Medellín esperando que se disparen las consultas de ambas ciudades
    const medellinForecastPromise = page.waitForResponse(
      (resp) => resp.url().includes('/v1/forecast') && (resp.url().includes('latitude=6.2') || resp.url().includes('latitude=6.3')) && resp.status() === 200,
      { timeout: 15000 }
    );

    await searchInput.fill('Medellín');
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Medellín/i }).first().click();

    // Confirmar que Medellín obtuvo respuesta
    const medellinResp = await medellinForecastPromise;
    expect(medellinResp.ok()).toBe(true);

    // Validar tabla de comparación actual
    const table = page.getByRole('table', { name: /Clima actual por ciudad/i });
    await expect(table).toBeVisible({ timeout: 10000 });

    // Confirmar que ambas ciudades figuran como columnas con sus datos
    const headerTexts = await table.locator('thead th').allInnerTexts();
    expect(headerTexts).toEqual(expect.arrayContaining(['Bogotá', 'Medellín']));

    // Ambas deben mostrar filas con valores numéricos
    const tempRow = table.locator('tr', { hasText: 'Temperatura' });
    await expect(tempRow).toBeVisible();
    await expect(tempRow.locator('td')).toHaveCount(2);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/flujo3-comparacion-paralela.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });
});
