import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-005
 * Nombre / Escenario: Comparación de una fecha histórica contra otra fecha histórica y contra el clima actual
 * Módulo / Endpoint: GET /v1/archive + GET /v1/forecast (RF-01)
 * Tipo de prueba: Integración
 * Prioridad: Alta
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que el usuario pueda comparar la fecha consultada contra otra fecha histórica o contra el
 * clima actual, y que el sistema muestre ambos conjuntos lado a lado con la diferencia por variable
 * calculada correctamente.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-005__2026-09-28__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-005', 'evidencias', RUN_ID);

test.describe('TC-SS-005: Comparación de fecha histórica (RF-05)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(60000);

  test('Neiva 15/09/2026: comparar contra 15/09/2025 y contra el clima actual', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    const archiveRequests: string[] = [];
    const forecastRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('archive-api.open-meteo.com/v1/archive')) archiveRequests.push(req.url());
      if (req.url().includes('api.open-meteo.com/v1/forecast')) forecastRequests.push(req.url());
    });

    await page.goto('/');
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Neiva');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
    await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);

    await page.getByRole('button', { name: 'Históricos', exact: true }).click();
    const section = page.locator('section.historical-weather');
    await expect(section).toBeVisible();

    // Paso 1 (primera parte): consultar la fecha base 15/09/2026
    await page.locator('#historical-start-date').fill('2026-09-15');
    await page.locator('#historical-end-date').fill('2026-09-15');
    await page.getByRole('button', { name: 'Consultar histórico' }).click();
    await expect(section.locator('.historical-weather__results h3')).toHaveText('Histórico — 15/09/2026', { timeout: 20000 });

    // Inventario de los controles disponibles en la sección de históricos (evidencia)
    const controls = await section.locator('button, input, select, textarea, [role="switch"], [role="checkbox"], [role="tab"], [role="radio"]').evaluateAll((els) =>
      els.map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: (el as HTMLInputElement).type || null,
        id: el.id || null,
        role: el.getAttribute('role'),
        texto_o_etiqueta: (el.getAttribute('aria-label') || (el as HTMLElement).innerText || (el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : '') || '').trim(),
      })),
    );
    const sectionText = await section.innerText();
    const comparisonControls = section.getByRole('button', { name: /compar/i })
      .or(section.getByRole('checkbox', { name: /compar/i }))
      .or(section.getByRole('switch', { name: /compar/i }))
      .or(section.getByRole('combobox', { name: /compar/i }))
      .or(section.getByLabel(/compar|clima actual/i));
    const comparisonCount = await comparisonControls.count();

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso1-sin-control-comparar.png'), fullPage: true });
    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'inventario-controles-historicos.json'),
      JSON.stringify({
        controles_en_seccion: controls,
        controles_de_comparacion_encontrados: comparisonCount,
        texto_menciona_comparar: /compar/i.test(sectionText),
        solicitudes_archive: archiveRequests,
        solicitudes_forecast_rf01_al_seleccionar_ubicacion: forecastRequests,
      }, null, 2),
    );

    // Paso 1 (segunda parte): debe existir la opción "Comparar" (otra fecha / clima actual)
    expect(comparisonCount, 'La sección de históricos no ofrece un control para "Comparar" con otra fecha o con el clima actual').toBeGreaterThan(0);

    // Los pasos 2 a 7 dependen del control de comparación; si existiera, se continuaría aquí.
    expect(pageErrors).toHaveLength(0);
  });
});
