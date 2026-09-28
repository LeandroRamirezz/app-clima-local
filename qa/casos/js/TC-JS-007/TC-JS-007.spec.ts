import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-JS-007
 * Nombre / Escenario: Consistencia de datos en comparación paralela (2–4 ciudades)
 * Endpoint o módulo: GET /v1/forecast / RF-01 y RF-04
 * Tipo de prueba: Integración
 * Prioridad del caso: Alta
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 27/09/2026
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que los datos de cada ciudad en la comparación son idénticos a los de una consulta
 * individual con los mismos parámetros.
 */

const EVIDENCE_DIR = 'qa/casos/js/TC-JS-007/evidencias/TC-JS-007__2026-09-28__run01';

const CITIES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla'];

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

test.describe('TC-JS-007: Consistencia de datos en comparación paralela (RF-01 vs RF-04)', () => {

  test('Validar consistencia de datos individuales vs comparación de 4 ciudades', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Mapa para almacenar los datos capturados de la consulta individual de cada ciudad
    const individualData: Record<string, { temp: string; humidity: string; wind: string }> = {};

    await page.goto('/');

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();

    // 1. Registrar valores de consulta individual para cada ciudad
    for (const city of CITIES) {
      await searchInput.fill(city);
      const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
      await expect(listbox).toBeVisible({ timeout: 10000 });

      const forecastPromise = page.waitForResponse(
        (resp) => resp.url().includes('/v1/forecast') && resp.status() === 200,
        { timeout: 15000 }
      );

      await listbox.getByRole('option', { name: new RegExp(city, 'i') }).first().click();
      await forecastPromise;

      const card = page.locator('.current-weather__card');
      await expect(card).toBeVisible({ timeout: 10000 });

      // Extraer métricas de la vista individual
      const temp = (await card.locator('.current-weather__temperature strong').innerText()).trim();
      const humidity = (await card.locator('dt:has-text("Humedad") + dd').innerText()).trim();
      const wind = (await card.locator('dt:has-text("Viento") + dd').innerText()).trim();

      individualData[city] = { temp, humidity, wind };
    }

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso1-consulta-individual-bogota.png`,
      fullPage: true,
    });

    // 2. Cambiar a modo Comparar ciudades y agregar las 4 ciudades
    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    await compareTab.click();

    for (const city of CITIES) {
      await addCityToComparison(page, city);
    }

    // Validar que la tabla comparativa se despliega
    const currentTable = page.getByRole('table', { name: /Clima actual por ciudad/i });
    await expect(currentTable).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso2-comparacion-cuatro-ciudades.png`,
      fullPage: true,
    });

    // 3. Obtener el índice de cada columna de ciudad en la tabla
    const headerElements = await currentTable.locator('thead th').allInnerTexts();
    // Headers: ['Variable', 'Bogotá', 'Medellín', 'Cali', 'Barranquilla']

    // Validar consistencia para cada ciudad
    for (const city of CITIES) {
      const colIndex = headerElements.findIndex((h) => h.includes(city));
      expect(colIndex).toBeGreaterThan(0); // colIndex 0 es "Variable", 1..4 son las ciudades
      const tdIndex = colIndex - 1; // en tbody, tr td está indexado desde 0 para las columnas de ciudades

      // Leer valores de la fila correspondiente en la tabla comparativa
      const tempCell = currentTable.locator('tr:has-text("Temperatura") td').nth(tdIndex);
      const humidityCell = currentTable.locator('tr:has-text("Humedad") td').nth(tdIndex);
      const windCell = currentTable.locator('tr:has-text("Viento") td').nth(tdIndex);

      await expect(tempCell).toBeVisible();
      await expect(humidityCell).toBeVisible();
      await expect(windCell).toBeVisible();

      const compTemp = (await tempCell.innerText()).trim();
      const compHumidity = (await humidityCell.innerText()).trim();
      const compWind = (await windCell.innerText()).trim();

      const expected = individualData[city]!;

      // Validar coincidencia de formato, unidades y valor numérico
      expect(compTemp).toBe(expected.temp);
      expect(compHumidity).toBe(expected.humidity);
      expect(compWind).toBe(expected.wind);
    }

    await page.screenshot({
      path: `${EVIDENCE_DIR}/paso3-verificacion-consistencia.png`,
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });
});
