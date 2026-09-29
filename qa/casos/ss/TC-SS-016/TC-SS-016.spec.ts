import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-016
 * Nombre / Escenario: Cabeceras HTTP de seguridad (CSP, HSTS, X-Content-Type-Options, Referrer-Policy) y escaneo OWASP ZAP
 * Módulo / Endpoint: Despliegue / hosting estático — RNF-06
 * Tipo de prueba: Seguridad
 * Prioridad: Alta
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright (pasos 1 a 4) + curl + OWASP ZAP (paso 5) + Mozilla Observatory (paso 6)
 *
 * Objetivo:
 * Verificar que el despliegue envíe las 4 cabeceras de seguridad exigidas con valores adecuados y que el escaneo
 * pasivo de OWASP ZAP no reporte vulnerabilidades de riesgo alto.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-016__2026-09-29__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-016', 'evidencias', RUN_ID);
const OPEN_METEO_HOSTS = ['api.open-meteo.com', 'geocoding-api.open-meteo.com', 'archive-api.open-meteo.com', 'air-quality-api.open-meteo.com'];

function parseCsp(csp: string | null) {
  if (!csp) return null;
  return Object.fromEntries(csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const [name, ...values] = d.split(/\s+/);
    return [name.toLowerCase(), values];
  }));
}

test.describe('TC-SS-016: Cabeceras HTTP de seguridad (RNF-06)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(90000);

  test('Cabeceras del documento y funcionamiento de la app sin recursos bloqueados por CSP', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

    const cspViolations: string[] = [];
    const consoleMessages: { tipo: string; texto: string }[] = [];
    page.on('console', (msg) => consoleMessages.push({ tipo: msg.type(), texto: msg.text() }));
    page.on('pageerror', (err) => consoleMessages.push({ tipo: 'pageerror', texto: err.message }));
    await page.exposeFunction('__reportCspViolation', (v: string) => cspViolations.push(v));
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        (window as unknown as { __reportCspViolation: (v: string) => void }).__reportCspViolation(`${e.violatedDirective} bloqueó ${e.blockedURI}`);
      });
    });

    // Pasos 1 y 2: cabeceras del documento principal
    const response = await page.goto('/');
    const headers = await response!.allHeaders();
    const h = (name: string) => headers[name.toLowerCase()] ?? null;
    const csp = h('content-security-policy');
    const metaLocator = page.locator('meta[http-equiv="Content-Security-Policy" i]');
    const metaCsp = (await metaLocator.count()) > 0 ? await metaLocator.first().getAttribute('content') : null;
    const effectiveCsp = parseCsp(csp ?? metaCsp);
    const hsts = h('strict-transport-security');
    const maxAge = Number(/max-age=(\d+)/i.exec(hsts ?? '')?.[1] ?? NaN);

    // Paso 3: análisis de la CSP (si existe)
    const connectSrc = effectiveCsp?.['connect-src'] ?? null;
    const scriptSrc = effectiveCsp?.['script-src'] ?? effectiveCsp?.['default-src'] ?? null;
    const cspAnalysis = effectiveCsp ? {
      default_src: effectiveCsp['default-src'] ?? null,
      connect_src: connectSrc,
      connect_src_limitado: !!connectSrc && connectSrc.every((s) => s === "'self'" || OPEN_METEO_HOSTS.some((host) => s.replace(/^https:\/\//, '') === host)),
      incluye_4_open_meteo: !!connectSrc && OPEN_METEO_HOSTS.every((host) => connectSrc.some((s) => s.includes(host))),
      script_src: scriptSrc,
      unsafe_inline_o_eval: !!scriptSrc && scriptSrc.some((s) => s === "'unsafe-inline'" || s === "'unsafe-eval'"),
    } : null;

    // Paso 4: recorrer la app y verificar que nada quede bloqueado
    await page.getByRole('combobox', { name: /Nombre de la ciudad/i }).first().fill('Neiva');
    await page.getByRole('listbox', { name: /Ubicaciones encontradas/i }).getByRole('option', { name: /Neiva.*Huila/i }).first().click();
    await expect(page.locator('.current-weather__temperature strong')).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Históricos', exact: true }).click();
    await page.locator('#historical-start-date').fill('2026-09-15');
    await page.locator('#historical-end-date').fill('2026-09-15');
    await page.getByRole('button', { name: 'Consultar histórico' }).click();
    await expect(page.locator('.historical-weather__table')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
    await expect(page.locator('.air-quality__current')).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso4-app-funcionando.png'), fullPage: true });

    const summary = {
      url: response!.url(),
      http: response!.status(),
      cabeceras_de_seguridad: {
        'Content-Security-Policy': csp,
        'CSP en <meta>': metaCsp,
        'Strict-Transport-Security': hsts,
        'X-Content-Type-Options': h('x-content-type-options'),
        'Referrer-Policy': h('referrer-policy'),
        'X-Frame-Options (complementaria)': h('x-frame-options'),
      },
      hsts_max_age: Number.isFinite(maxAge) ? maxAge : null,
      analisis_csp: cspAnalysis,
      violaciones_csp: cspViolations,
      mensajes_consola: consoleMessages,
      todas_las_cabeceras: headers,
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'resumen-cabeceras.json'), JSON.stringify(summary, null, 2));

    expect.soft(csp ?? metaCsp, 'Content-Security-Policy presente').not.toBeNull();
    if (cspAnalysis) {
      expect.soft(cspAnalysis.default_src).toContain("'self'");
      expect.soft(cspAnalysis.connect_src_limitado, "connect-src limitado a 'self' y Open-Meteo").toBe(true);
      expect.soft(cspAnalysis.incluye_4_open_meteo).toBe(true);
      expect.soft(cspAnalysis.unsafe_inline_o_eval, "script-src sin 'unsafe-inline' ni 'unsafe-eval'").toBe(false);
    }
    expect.soft(hsts, 'Strict-Transport-Security presente').not.toBeNull();
    expect.soft(maxAge, 'HSTS max-age ≥ 31536000').toBeGreaterThanOrEqual(31536000);
    expect.soft(h('x-content-type-options'), 'X-Content-Type-Options: nosniff').toBe('nosniff');
    expect.soft(['strict-origin-when-cross-origin', 'no-referrer'], 'Referrer-Policy adecuada').toContain(h('referrer-policy'));
    expect.soft(cspViolations, 'Sin recursos bloqueados por CSP').toEqual([]);
  });
});
