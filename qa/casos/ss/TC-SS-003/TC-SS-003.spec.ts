import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-003
 * Nombre / Escenario: Validación de límites de una fecha: futura, hoy, reciente no disponible,
 *                     última disponible y cobertura desde 1940
 * Módulo / Endpoint: GET /v1/archive (validación en cliente)
 * Tipo de prueba: Funcional
 * Prioridad: Media
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar, con análisis de valores límite, que el sistema acepte solo fechas entre 01/01/1940 y la
 * última fecha disponible (hoy menos el margen de 5 días), muestre el mensaje exacto para cada fecha
 * fuera de rango y no envíe la solicitud a la API cuando la fecha es inválida.
 *
 * Las fechas se calculan a partir de la fecha real del día de ejecución (reloj del navegador,
 * zona America/Bogota), con los mismos desplazamientos del diseño (diseño base: hoy = 27/09/2026).
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-003__2026-09-28__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-003', 'evidencias', RUN_ID);
const AVAILABILITY_LAG_DAYS = 5;

function addDays(iso: string, amount: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + amount));
  return date.toISOString().slice(0, 10);
}

function toDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

test.describe('TC-SS-003: Validación de límites de fecha en históricos (RF-05)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(120000);

  test('Neiva: fechas futura, hoy, reciente, límite+1, última disponible, 01/01/1940 y 31/12/1939', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Registro de todas las solicitudes a /v1/archive (equivalente a DevTools > Network)
    const archiveRequests: { url: URL; status: number | null }[] = [];
    page.on('request', (req) => {
      if (req.url().includes('archive-api.open-meteo.com/v1/archive')) archiveRequests.push({ url: new URL(req.url()), status: null });
    });
    page.on('response', (res) => {
      if (res.url().includes('archive-api.open-meteo.com/v1/archive')) {
        const entry = [...archiveRequests].reverse().find((r) => r.url.toString() === res.url() && r.status === null);
        if (entry) entry.status = res.status();
      }
    });

    await page.goto('/');

    // Fecha real del día de ejecución según el navegador (misma fuente que usa la app)
    const today = await page.evaluate(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    });
    const lastAvailable = addDays(today, -AVAILABILITY_LAG_DAYS);
    const notAvailableMsg = `Los datos de esa fecha aún no están disponibles. La última fecha consultable es ${toDisplay(lastAvailable)}.`;

    const scenarios = [
      { slug: 'futura', label: 'Futura (hoy + 1)', iso: addDays(today, 1), valid: false, message: 'No es posible consultar fechas futuras. Consulte el pronóstico.' },
      { slug: 'hoy', label: 'Hoy', iso: today, valid: false, message: notAvailableMsg },
      { slug: 'reciente', label: 'Reciente dentro del margen (hoy − 2)', iso: addDays(today, -2), valid: false, message: notAvailableMsg },
      { slug: 'limite-mas-1', label: 'Un día después del límite (hoy − 4)', iso: addDays(lastAvailable, 1), valid: false, message: notAvailableMsg },
      { slug: 'ultima-disponible', label: 'Última disponible (hoy − 5)', iso: lastAvailable, valid: true, message: null },
      { slug: 'minima-1940', label: 'Mínima', iso: '1940-01-01', valid: true, message: null },
      { slug: 'antes-minima-1939', label: 'Un día antes del mínimo', iso: '1939-12-31', valid: false, message: 'Solo hay datos disponibles desde el 01/01/1940.' },
    ];

    // Precondición: ubicación activa Neiva
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Neiva');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
    await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);

    await page.getByRole('button', { name: 'Históricos', exact: true }).click();
    const section = page.locator('section.historical-weather');
    await expect(section).toBeVisible();

    const validation = section.locator('#historical-date-error[role="alert"]');
    const heading = section.locator('.historical-weather__results h3');

    async function query(p: Page, iso: string) {
      await p.locator('#historical-start-date').fill(iso);
      await p.locator('#historical-end-date').fill(iso);
      await p.getByRole('button', { name: 'Consultar histórico' }).click();
    }

    async function expectValidQuery(iso: string) {
      const before = archiveRequests.length;
      await query(page, iso);
      await expect(heading).toHaveText(`Histórico — ${toDisplay(iso)}`, { timeout: 20000 });
      await expect(validation).toHaveCount(0);
      await expect.poll(() => archiveRequests.length).toBeGreaterThan(before);
      const req = archiveRequests[archiveRequests.length - 1];
      await expect.poll(() => req.status).toBe(200);
      const row = section.locator('.historical-weather__table tbody tr');
      await expect(row).toHaveCount(1);
      await expect(row.locator('th')).toHaveText(toDisplay(iso));
      const cells = (await row.locator('td').allInnerTexts()).map((t) => t.trim());
      return { req, cells };
    }

    const results: Record<string, unknown>[] = [];

    for (const sc of scenarios) {
      const before = archiveRequests.length;
      const result: Record<string, unknown> = { escenario: sc.label, fecha: toDisplay(sc.iso), fecha_iso: sc.iso, esperado_valida: sc.valid, mensaje_esperado: sc.message };

      if (sc.valid) {
        const { req, cells } = await expectValidQuery(sc.iso);
        expect.soft(req.url.searchParams.get('start_date')).toBe(sc.iso);
        expect.soft(req.url.searchParams.get('end_date')).toBe(sc.iso);
        expect.soft(req.url.searchParams.get('timezone')).toBe('auto');
        Object.assign(result, {
          solicitudes_archive: archiveRequests.length - before,
          url_enviada: req.url.toString(),
          http: req.status,
          valores_mostrados: cells,
        });
        await page.screenshot({ path: path.join(EVIDENCE_DIR, `${sc.slug}__${sc.iso}.png`), fullPage: true });
      } else {
        await query(page, sc.iso);
        await expect(validation).toBeVisible();
        const shownMessage = (await validation.innerText()).trim();
        // Margen para detectar cualquier solicitud tardía
        await page.waitForTimeout(1500);
        const sent = archiveRequests.length - before;
        await expect(section.locator('.historical-weather__status')).toHaveCount(0);
        await page.screenshot({ path: path.join(EVIDENCE_DIR, `${sc.slug}__${sc.iso}.png`), fullPage: true });

        expect.soft(shownMessage, `${sc.label}: mensaje`).toBe(sc.message);
        expect.soft(sent, `${sc.label}: no debe enviarse solicitud a /v1/archive`).toBe(0);
        Object.assign(result, { mensaje_mostrado: shownMessage, solicitudes_archive: sent });

        // Paso 6: la sección sigue operativa y admite una consulta válida inmediatamente después
        const recovery = await expectValidQuery(lastAvailable);
        result.recuperacion = { fecha: toDisplay(lastAvailable), http: recovery.req.status, datos_mostrados: recovery.cells.length === 6 };
      }

      result.cumple = sc.valid
        ? result.http === 200
        : result.mensaje_mostrado === sc.message && result.solicitudes_archive === 0 && (result.recuperacion as { http: number }).http === 200;
      results.push(result);
    }

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'resumen-limites-fecha.json'),
      JSON.stringify({ fecha_ejecucion_navegador: today, zona_navegador: 'America/Bogota', ultima_fecha_consultable: lastAvailable, escenarios: results }, null, 2),
    );
    expect(pageErrors).toHaveLength(0);
  });
});
