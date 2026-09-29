import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CASO DE PRUEBA: TC-JS-015
 * Nombre / Escenario: Anuncios en lectores de pantalla para errores y resultados
 * Endpoint o módulo: Interfaz general / Módulo de búsqueda y clima / RNF-04 (WCAG 2.1 AA)
 * Tipo de prueba: Accesibilidad
 * Prioridad: Alta
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 2026-09-27
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que errores (E-01 a E-05) y actualizaciones (búsqueda válida,
 * sin resultados y homónimos) se anuncian correctamente en live regions
 * (role="alert" y role="status" con aria-live) para lectores de pantalla.
 */

const EVIDENCE_DIR = path.resolve(__dirname, 'evidencias', 'TC-JS-015__2026-09-28__run01');

const ERROR_MESSAGES = {
  'E-01': 'No hay conexión a internet. Verifique su red e intente nuevamente.',
  'E-02': 'La consulta tardó demasiado. Intente nuevamente.',
  'E-03': 'Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo.',
  'E-04': 'No fue posible procesar la consulta. Verifique los datos ingresados.',
  'E-05': 'El servicio meteorológico no está disponible en este momento. Intente más tarde.',
};

test.describe('TC-JS-015: Anuncios en lectores de pantalla (Live Regions: alert & status)', () => {
  const auditLogs: string[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Paso 1: Verificar anuncio de errores E-01 a E-05 en role="alert"', async ({ page }) => {
    auditLogs.push('=== BLOQUE 1: ERRORES E-01 A E-05 EN ROLE="ALERT" ===\n');

    const errorCases = [
      {
        code: 'E-01',
        name: 'Sin conexión (Fallo de red)',
        handler: (route: import('@playwright/test').Route) => route.abort('failed'),
      },
      {
        code: 'E-03',
        name: 'Límite de consultas (HTTP 429)',
        handler: (route: import('@playwright/test').Route) =>
          route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: true, reason: 'Rate limit exceeded' }) }),
      },
      {
        code: 'E-04',
        name: 'Parámetros inválidos (HTTP 400)',
        handler: (route: import('@playwright/test').Route) =>
          route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: true, reason: 'Invalid parameters' }) }),
      },
      {
        code: 'E-05',
        name: 'Servicio no disponible (HTTP 500)',
        handler: (route: import('@playwright/test').Route) =>
          route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: true, reason: 'Internal server error' }) }),
      },
    ];

    for (const ec of errorCases) {
      await page.route('**/v1/search*', ec.handler);
      await page.goto('/');

      const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
      await searchInput.fill('Medellin');

      const errorAlert = page.locator('.city-search__error[role="alert"]');
      await expect(errorAlert).toBeVisible({ timeout: 10000 });
      await expect(errorAlert).toContainText(ERROR_MESSAGES[ec.code as keyof typeof ERROR_MESSAGES]);

      const alertRole = await errorAlert.getAttribute('role');
      expect(alertRole).toBe('alert');

      auditLogs.push(`- Error ${ec.code} (${ec.name}):`);
      auditLogs.push(`  Role ARIA verificado: "${alertRole}" (Live region asertiva implícita)`);
      auditLogs.push(`  Mensaje anunciado: "${await errorAlert.innerText()}"`);

      await page.screenshot({ path: path.join(EVIDENCE_DIR, `error-${ec.code}.png`) });
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }

    // Probar E-02 (Timeout > 10s)
    await page.route('**/v1/search*', async (route) => {
      await new Promise((r) => setTimeout(r, 11000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) });
    });

    await page.goto('/');
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Cali');

    const timeoutAlert = page.locator('.city-search__error[role="alert"]');
    await expect(timeoutAlert).toBeVisible({ timeout: 16000 });
    await expect(timeoutAlert).toContainText(ERROR_MESSAGES['E-02']);

    auditLogs.push(`- Error E-02 (Timeout > 10 s):`);
    auditLogs.push(`  Role ARIA verificado: "alert"`);
    auditLogs.push(`  Mensaje anunciado: "${await timeoutAlert.innerText()}"`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'error-E-02.png') });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('Paso 2: Verificar anuncio de actualizaciones en role="status" y aria-live="polite"', async ({ page }) => {
    auditLogs.push('\n=== BLOQUE 2: ACTUALIZACIONES DE BÚSQUEDA EN ROLE="STATUS" ===\n');

    await page.goto('/');
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });

    // Escenario 1: Sin resultados ("Xyzabc123")
    await searchInput.fill('Xyzabc123');
    const emptyStatus = page.locator('.city-search__status[role="status"]');
    await expect(emptyStatus).toBeVisible({ timeout: 10000 });
    await expect(emptyStatus).toContainText('No se encontraron ubicaciones para «Xyzabc123».');

    const emptyRole = await emptyStatus.getAttribute('role');
    const emptyLive = await emptyStatus.getAttribute('aria-live');
    expect(emptyRole).toBe('status');
    expect(emptyLive).toBe('polite');

    auditLogs.push(`- Búsqueda sin resultados:`);
    auditLogs.push(`  Role ARIA: "${emptyRole}", aria-live: "${emptyLive}"`);
    auditLogs.push(`  Mensaje anunciado: "${await emptyStatus.innerText()}"`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'status-sin-resultados.png') });

    // Escenario 2: Homónimos múltiples ("San")
    await searchInput.fill('');
    await searchInput.fill('San');

    const homonymsStatus = page.locator('.city-search__status[role="status"]');
    await expect(homonymsStatus).toBeVisible({ timeout: 10000 });
    await expect(homonymsStatus).toContainText(/ubicaciones encontradas\./i);

    const homonymsRole = await homonymsStatus.getAttribute('role');
    const homonymsLive = await homonymsStatus.getAttribute('aria-live');
    expect(homonymsRole).toBe('status');
    expect(homonymsLive).toBe('polite');

    auditLogs.push(`- Búsqueda de homónimos múltiples:`);
    auditLogs.push(`  Role ARIA: "${homonymsRole}", aria-live: "${homonymsLive}"`);
    auditLogs.push(`  Mensaje anunciado: "${await homonymsStatus.innerText()}"`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'status-homonimos.png') });

    // Escenario 3: Búsqueda y selección válida ("Bogotá")
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    const bogotaOption = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await bogotaOption.fill('Bogota');
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Bogot/i }).first().click();

    const activeLocation = page.locator('section.active-location');
    await expect(activeLocation).toBeVisible({ timeout: 15000 });

    const activeRole = await activeLocation.getAttribute('role');
    const activeLive = await activeLocation.getAttribute('aria-live');
    expect(activeRole).toBe('status');
    expect(activeLive).toBe('polite');

    auditLogs.push(`- Selección de ubicación activa:`);
    auditLogs.push(`  Role ARIA: "${activeRole}", aria-live: "${activeLive}"`);
    auditLogs.push(`  Mensaje anunciado: "${await activeLocation.locator('.active-location__name').innerText()}"`);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'status-ubicacion-activa.png') });

    // Guardar resumen en evidencias
    const summaryFilePath = path.join(EVIDENCE_DIR, 'screen-reader-announcements-summary.txt');
    fs.writeFileSync(summaryFilePath, auditLogs.join('\n'), 'utf8');
  });
});
