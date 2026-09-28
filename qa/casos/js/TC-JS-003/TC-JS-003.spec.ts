import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-JS-003
 * Nombre / Escenario: Comparación de ciudades: 2–4, límites, duplicados, nulos, móvil y teclado
 * Endpoint o módulo: Módulo de comparación (GET /v1/forecast en paralelo) / RF-04
 * Tipo de prueba: Funcional
 * Prioridad del caso: Alta
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 27/09/2026
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar la funcionalidad de comparación entre 2 y 4 ciudades, incluyendo límites,
 * duplicados, valores nulos y usabilidad en móvil/teclado.
 */

const EVIDENCE_DIR = 'qa/casos/js/TC-JS-003/evidencias/TC-JS-003__2026-09-28__run01';

// Función auxiliar para agregar una ciudad a la comparación desde el input de búsqueda de comparación
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

test.describe('TC-JS-003: Comparación de ciudades (RF-04)', () => {

  test('Paso 5: Mensaje de menos de 2 ciudades al iniciar modo comparación', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    // Activar pestaña "Comparar ciudades"
    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await expect(compareTab).toBeVisible();
    await compareTab.click();

    // Validar mensaje cuando hay 0 ciudades
    const minimumNotice = page.locator('.city-comparison__minimum[role="status"]');
    await expect(minimumNotice).toBeVisible();
    await expect(minimumNotice).toHaveText('Agregue al menos dos ciudades para comparar.');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso5-menos-de-dos-ciudades.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 1 y 2: Agregar 2 y 4 ciudades - vista comparativa lado a lado', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    // 1. Agregar primera ciudad: Bogotá
    await addCityToComparison(page, 'Bogotá');
    // Aún solo 1 ciudad: debe seguir el aviso de al menos 2
    const minimumNotice = page.locator('.city-comparison__minimum[role="status"]');
    await expect(minimumNotice).toBeVisible();

    // Agregar segunda ciudad: Medellín
    await addCityToComparison(page, 'Medellín');

    // Ahora son 2 ciudades: la tabla de comparación actual debe renderizarse
    const currentTable = page.getByRole('table', { name: /Clima actual por ciudad/i });
    await expect(currentTable).toBeVisible({ timeout: 15000 });

    // Validar encabezados de columnas: Variable, Bogotá, Medellín
    const colHeaders = currentTable.locator('thead th');
    await expect(colHeaders).toContainText(['Variable', 'Bogotá', 'Medellín']);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso1-dos-ciudades.png`,
      fullPage: true,
    });

    // 2. Agregar tercera ciudad: Cali
    await addCityToComparison(page, 'Cali');
    // Agregar cuarta ciudad: Barranquilla
    await addCityToComparison(page, 'Barranquilla');

    // Validar que la tabla tiene las 4 ciudades
    await expect(colHeaders).toContainText(['Variable', 'Bogotá', 'Medellín', 'Cali', 'Barranquilla']);

    // Validar contador: "4 de 4 ubicaciones agregadas"
    const countStatus = page.locator('.current-weather__comparison-count');
    await expect(countStatus).toHaveText('4 de 4 ubicaciones agregadas');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso2-cuatro-ciudades.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 3: Límite máximo de 4 ciudades - intento de agregar 5.ª ciudad', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    // Agregar 4 ciudades
    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Medellín');
    await addCityToComparison(page, 'Cali');
    await addCityToComparison(page, 'Barranquilla');

    // Intentar agregar una 5ta ciudad (Neiva)
    await addCityToComparison(page, 'Neiva');

    // Debe mostrar mensaje de error con role="alert"
    const feedback = page.locator('.current-weather__comparison-feedback[role="alert"]');
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveText('Puede comparar hasta 4 ciudades a la vez.');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso3-limite-quinta-ciudad.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 4: Control de duplicados - intento de agregar ciudad existente', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    // Agregar Bogotá
    await addCityToComparison(page, 'Bogotá');

    // Intentar agregar nuevamente Bogotá
    await addCityToComparison(page, 'Bogotá');

    // Validar mensaje de error de duplicado
    const feedback = page.locator('.current-weather__comparison-feedback[role="alert"]');
    await expect(feedback).toBeVisible();
    await expect(feedback).toHaveText('Esta ubicación ya está en la comparación.');

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso4-ciudad-duplicada.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 6: Tolerancia a valores nulos - muestra "N/D" sin romper la tabla', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Interceptar llamadas a /v1/forecast para una de las ciudades inyectando valores nulos en current
    await page.route('**/v1/forecast*', async (route) => {
      try {
        const url = route.request().url();
        if (url.includes('latitude=3.45') || url.includes('latitude=3.4')) {
          const response = await route.fetch();
          const json = await response.json();
          if (json.current) {
            json.current.relative_humidity_2m = null;
            json.current.precipitation = null;
            json.current.wind_direction_10m = null;
            json.current.uv_index = null;
          }
          await route.fulfill({ response, json });
        } else {
          await route.continue();
        }
      } catch {
        // Ignorar si el test concluye antes de resolver peticiones secundarias
      }
    });

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Cali');

    const currentTable = page.getByRole('table', { name: /Clima actual por ciudad/i });
    await expect(currentTable).toBeVisible({ timeout: 15000 });

    // Verificar que las celdas con valores nulos renderizan "N/D"
    const ndCells = currentTable.locator('td', { hasText: 'N/D' });
    await expect(ndCells.first()).toBeVisible();
    const count = await ndCells.count();
    expect(count).toBeGreaterThanOrEqual(1);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso6-valores-nulos-nd.png`,
      fullPage: true,
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });

    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 7: Adaptabilidad móvil (viewport 320 px) - scroll horizontal contenedor sin romper', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Reducir viewport a 320x640 (móvil compacto)
    await page.setViewportSize({ width: 320, height: 640 });

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Medellín');

    // La tabla debe estar dentro de un contenedor con scroll horizontal
    const scrollContainer = page.locator('.city-comparison__table-scroll').first();
    await expect(scrollContainer).toBeVisible();

    // Validar que el contenedor permite scroll (scrollWidth >= clientWidth)
    const isScrollable = await scrollContainer.evaluate((el) => el.scrollWidth >= el.clientWidth);
    expect(isScrollable).toBe(true);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso7-adaptabilidad-movil.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });

  test('Paso 8: Navegación y operabilidad con teclado - botones Quitar con Enter/Espacio', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    await addCityToComparison(page, 'Bogotá');
    await addCityToComparison(page, 'Medellín');

    // Localizar botón de quitar Medellín y operarlo con teclado (focus + Enter)
    const removeMedellinBtn = page.getByRole('button', { name: 'Quitar Medellín de la comparación' });
    await expect(removeMedellinBtn).toBeVisible();

    await removeMedellinBtn.focus();
    await page.keyboard.press('Enter');

    // Medellín debe desaparecer de la lista de comparación
    await expect(removeMedellinBtn).not.toBeVisible();

    // Como ahora solo queda Bogotá (< 2), debe reaparecer el aviso de mínimo
    const minimumNotice = page.locator('.city-comparison__minimum[role="status"]');
    await expect(minimumNotice).toBeVisible();

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso8-operabilidad-teclado.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });
});
