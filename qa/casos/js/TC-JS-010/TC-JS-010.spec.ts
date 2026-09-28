import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * CASO DE PRUEBA: TC-JS-010
 * Nombre / Escenario: Rendimiento de renderizado en comparación de 4 ciudades
 * Endpoint o módulo: Vista de comparación (CityComparison / RF-04 y RNF-03)
 * Tipo de prueba: Rendimiento
 * Prioridad del caso: Media
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 27/09/2026
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Medir el tiempo de renderizado de la vista comparativa con 4 ciudades (RNF-03, caso semilla TC-024).
 * Tiempo de render < 2 s.
 */

const EVIDENCE_DIR = 'qa/casos/js/TC-JS-010/evidencias/TC-JS-010__2026-09-28__run01';
const CITIES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla'];
const ITERATIONS = 5;

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

test.describe('TC-JS-010: Rendimiento de renderizado en comparación de 4 ciudades (RNF-03)', () => {

  test.beforeAll(async () => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  });

  test('Medir tiempo de renderizado de la vista con 4 ciudades (5 repeticiones)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const renderTimes: number[] = [];

    for (let i = 1; i <= ITERATIONS; i++) {
      await page.goto('/');

      const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
      await compareTab.click();

      // Agregar las primeras 3 ciudades
      for (let c = 0; c < 3; c++) {
        await addCityToComparison(page, CITIES[c]);
      }

      // Preparar promesa de la 4.ª respuesta HTTP de forecast (Barranquilla)
      const lastForecastPromise = page.waitForResponse(
        (resp) => resp.url().includes('/v1/forecast') && resp.status() === 200,
        { timeout: 15000 }
      );

      // Agregar la 4.ª ciudad (Barranquilla)
      await addCityToComparison(page, CITIES[3]);

      // Esperar a que la última respuesta de red se complete
      await lastForecastPromise;

      // Iniciar medición del tiempo de renderizado desde la respuesta hasta el render completo del DOM
      const startRender = await page.evaluate(() => performance.now());

      // Esperar a que la tabla comparativa tenga las 4 columnas de ciudades visibles y estables
      const currentTable = page.getByRole('table', { name: /Clima actual por ciudad/i });
      await expect(currentTable).toBeVisible({ timeout: 10000 });
      const headers = currentTable.locator('thead th');
      await expect(headers).toContainText(['Variable', 'Bogotá', 'Medellín', 'Cali', 'Barranquilla']);

      // Validar que las celdas de datos están completamente pintadas
      const tempCells = currentTable.locator('tr:has-text("Temperatura") td');
      await expect(tempCells).toHaveCount(4);

      const endRender = await page.evaluate(() => performance.now());
      const renderDuration = endRender - startRender;
      renderTimes.push(renderDuration);

      console.log(`Iteración ${i}: tiempo de renderizado = ${renderDuration.toFixed(2)} ms`);
    }

    // Calcular estadísticas
    const avgRender = renderTimes.reduce((acc, val) => acc + val, 0) / renderTimes.length;
    const maxRender = Math.max(...renderTimes);
    const minRender = Math.min(...renderTimes);

    console.log(`Promedio de renderizado: ${avgRender.toFixed(2)} ms`);
    console.log(`Máximo de renderizado: ${maxRender.toFixed(2)} ms`);

    // Validar criterio de aceptación RNF-03: tiempo de renderizado < 2.000 ms (2 s)
    expect(avgRender).toBeLessThan(2000);
    expect(maxRender).toBeLessThan(2000);

    // Captura de evidencia de la tabla completa de 4 ciudades
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'renderizado-comparacion-cuatro-ciudades.png'),
      fullPage: true,
    });

    // Generar captura resumen visual con métricas de las 5 iteraciones
    await page.setContent(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Métricas de Renderizado TC-JS-010</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc; }
          .card { background: #1e293b; padding: 1.5rem; border-radius: 8px; border: 1px solid #334155; }
          h1 { color: #38bdf8; font-size: 1.5rem; }
          .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; background: #059669; font-weight: bold; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1rem; }
          .stat { background: #0f172a; padding: 1rem; border-radius: 6px; border: 1px solid #334155; }
          .stat-val { font-size: 1.5rem; color: #4ade80; font-weight: bold; }
          ul { line-height: 1.8; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <h1>Prueba de Rendimiento de Renderizado - TC-JS-010</h1>
        <div class="card">
          <p><span class="badge">CUMPLE RNF-03 (&lt; 2.000 ms)</span></p>
          <p><strong>Escenario:</strong> Medición de renderizado DOM con 4 ciudades (Bogotá, Medellín, Cali, Barranquilla).</p>
          <div class="grid">
            <div class="stat"><div>Tiempo Promedio</div><div class="stat-val">${avgRender.toFixed(2)} ms</div></div>
            <div class="stat"><div>Tiempo Máximo</div><div class="stat-val">${maxRender.toFixed(2)} ms</div></div>
            <div class="stat"><div>Tiempo Mínimo</div><div class="stat-val">${minRender.toFixed(2)} ms</div></div>
            <div class="stat"><div>Umbral Requerido</div><div class="stat-val">&lt; 2.000 ms</div></div>
          </div>
          <ul>
            ${renderTimes.map((t, idx) => `<li>Iteración ${idx + 1}: ${t.toFixed(2)} ms</li>`).join('')}
          </ul>
        </div>
      </body>
      </html>
    `);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'resumen-metricas-renderizado.png'),
      fullPage: true,
    });

    expect(pageErrors).toHaveLength(0);
  });
});
