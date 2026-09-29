import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type BrowserContext, type Page, type Route } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-006
 * Nombre / Escenario: Manejo de errores E-01 a E-05 en la consulta de históricos
 * Módulo / Endpoint: GET /v1/archive (respuesta interceptada, 5 escenarios)
 * Tipo de prueba: Funcional
 * Prioridad: Alta
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que ante cada escenario del catálogo E-01 a E-05 aplicado a /v1/archive, la sección de
 * históricos muestre el mensaje exacto en una región role="alert", con botón Reintentar, sin texto
 * crudo de la API y sin romper el resto de la aplicación.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-006__2026-09-28__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-006', 'evidencias', RUN_ID);
const ARCHIVE_PATTERN = '**/archive-api.open-meteo.com/v1/archive**';
const QUERY_DATE = '2026-09-15';

const MESSAGES = {
  'E-01': 'No hay conexión a internet. Verifique su red e intente nuevamente.',
  'E-02': 'La consulta tardó demasiado. Intente nuevamente.',
  'E-03': 'Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo.',
  'E-04': 'No fue posible procesar la consulta. Verifique los datos ingresados.',
  'E-05': 'El servicio meteorológico no está disponible en este momento. Intente más tarde.',
} as const;

// Textos técnicos que nunca deben mostrarse al usuario
const RAW_TEXT = /Parameter start_date|out of allowed range|"reason"|\breason\b|\b(400|429|503)\b|HTTP|TypeError|SyntaxError|Failed to fetch|NetworkError|AbortError|JSON|Unexpected token|at \w+ \(|stack/i;

type Scenario = {
  id: string;
  slug: string;
  code: keyof typeof MESSAGES;
  description: string;
  // Activa la falla; devuelve la función que la desactiva
  activate: (page: Page, context: BrowserContext) => Promise<() => Promise<void>>;
  checkNoAutoRetry?: boolean;
};

const fulfillWith = (status: number, body: string, contentType = 'application/json') =>
  async (page: Page) => {
    const handler = (route: Route) => route.fulfill({ status, body, contentType });
    await page.route(ARCHIVE_PATTERN, handler);
    return () => page.unroute(ARCHIVE_PATTERN, handler);
  };

const SCENARIOS: Scenario[] = [
  {
    id: 'E-01', slug: 'e01-sin-conexion', code: 'E-01', description: 'Sin conexión (context.setOffline(true))',
    activate: async (_page, context) => {
      await context.setOffline(true);
      return () => context.setOffline(false);
    },
  },
  {
    id: 'E-02', slug: 'e02-timeout-11s', code: 'E-02', description: 'Respuesta retrasada 11 000 ms (> 10 s)',
    activate: async (page) => {
      const handler = async (route: Route) => {
        await new Promise((resolve) => setTimeout(resolve, 11000));
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }).catch(() => {});
      };
      await page.route(ARCHIVE_PATTERN, handler);
      return () => page.unroute(ARCHIVE_PATTERN, handler);
    },
  },
  {
    id: 'E-03', slug: 'e03-http-429', code: 'E-03', description: 'HTTP 429', checkNoAutoRetry: true,
    activate: fulfillWith(429, JSON.stringify({ error: true, reason: 'Too many requests' })),
  },
  {
    id: 'E-04', slug: 'e04-http-400', code: 'E-04', description: 'HTTP 400 con reason de la API',
    activate: fulfillWith(400, JSON.stringify({ error: true, reason: 'Parameter start_date is out of allowed range' })),
  },
  {
    id: 'E-05a', slug: 'e05a-http-503', code: 'E-05', description: 'HTTP 503',
    activate: fulfillWith(503, 'Service Unavailable', 'text/plain'),
  },
  {
    id: 'E-05b', slug: 'e05b-json-malformado', code: 'E-05', description: 'HTTP 200 con cuerpo malformado "{daily: ["',
    activate: fulfillWith(200, '{daily: ['),
  },
];

test.describe('TC-SS-006: Manejo de errores E-01 a E-05 en históricos (RF-05, RNF-12)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(90000);

  for (const sc of SCENARIOS) {
    test(`${sc.id}: ${sc.description}`, async ({ page, context }) => {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));
      const archiveRequests: number[] = [];
      page.on('request', (req) => {
        if (req.url().includes('archive-api.open-meteo.com/v1/archive')) archiveRequests.push(Date.now());
      });

      // Precondición: Neiva activa y sección de históricos con 15/09/2026
      await page.goto('/');
      const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
      await searchInput.fill('Neiva');
      const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
      await expect(listbox).toBeVisible({ timeout: 10000 });
      await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
      await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);
      await expect(page.locator('.current-weather__location')).toContainText(/Neiva/i, { timeout: 15000 });

      await page.getByRole('button', { name: 'Históricos', exact: true }).click();
      const section = page.locator('section.historical-weather');
      await expect(section).toBeVisible();
      await page.locator('#historical-start-date').fill(QUERY_DATE);
      await page.locator('#historical-end-date').fill(QUERY_DATE);

      // Paso 1: activar la interceptación y consultar
      const deactivate = await sc.activate(page, context);
      const started = Date.now();
      await page.getByRole('button', { name: 'Consultar histórico' }).click();

      // Paso 2: mensaje exacto dentro de role="alert"
      const alert = section.locator('.historical-weather__error[role="alert"]');
      await expect(alert).toBeVisible({ timeout: 20000 });
      const errorShownMs = Date.now() - started;
      const alertMessage = (await alert.locator('span').innerText()).trim();

      // Paso 3: botón Reintentar dentro de la alerta
      const retry = alert.getByRole('button', { name: 'Reintentar' });
      await expect(retry).toBeVisible();
      await expect(retry).toBeEnabled();

      // Paso 4: sin texto crudo de la API, códigos HTTP ni trazas
      const sectionText = await section.innerText();
      const rawMatch = sectionText.match(RAW_TEXT)?.[0] ?? null;
      await expect(section.locator('.historical-weather__table')).toHaveCount(0);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `${sc.slug}__error.png`), fullPage: true });

      // Paso 5 (E-03): 10 s sin interactuar, sin reintentos automáticos
      let autoRetries: number | null = null;
      if (sc.checkNoAutoRetry) {
        const before = archiveRequests.length;
        await page.waitForTimeout(10000);
        autoRetries = archiveRequests.length - before;
        await expect(alert).toBeVisible();
      }

      // Paso 6: quitar la interceptación, Reintentar y verificar carga de datos
      await deactivate();
      const requestsBeforeRetry = archiveRequests.length;
      await retry.click();
      await expect(section.locator('.historical-weather__results h3')).toHaveText('Histórico — 15/09/2026', { timeout: 20000 });
      await expect(alert).toHaveCount(0);
      const retryRow = section.locator('.historical-weather__table tbody tr');
      await expect(retryRow).toHaveCount(1);
      const retryCells = (await retryRow.locator('td').allInnerTexts()).map((t) => t.trim());
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `${sc.slug}__reintento.png`), fullPage: true });

      // Paso 7: el resto de la app sigue visible y operativa
      await expect(page.locator('.city-search, [class*="city-search"]').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Usar mi ubicación' })).toBeVisible();
      await page.getByRole('button', { name: 'Clima', exact: true }).click();
      await expect(page.locator('.current-weather__location')).toContainText(/Neiva/i, { timeout: 15000 });
      await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
      await expect(page.locator('.current-weather[data-area="air"]')).toBeVisible();
      await page.getByRole('button', { name: 'Históricos', exact: true }).click();
      await expect(section).toBeVisible();

      const result = {
        escenario: sc.id,
        descripcion: sc.description,
        mensaje_esperado: MESSAGES[sc.code],
        mensaje_mostrado: alertMessage,
        dentro_de_role_alert: true,
        boton_reintentar: true,
        tiempo_hasta_error_ms: errorShownMs,
        texto_crudo_detectado: rawMatch,
        reintentos_automaticos_en_10s: autoRetries,
        solicitudes_tras_reintentar: archiveRequests.length - requestsBeforeRetry,
        datos_tras_reintentar: retryCells,
        resto_app_operativo: true,
        errores_consola: pageErrors,
      };
      fs.writeFileSync(path.join(EVIDENCE_DIR, `${sc.slug}.json`), JSON.stringify(result, null, 2));

      expect.soft(alertMessage, `${sc.id}: mensaje`).toBe(MESSAGES[sc.code]);
      expect.soft(rawMatch, `${sc.id}: texto técnico visible`).toBeNull();
      if (sc.code === 'E-02') expect.soft(errorShownMs, 'E-02: el error debe aparecer tras ~10 s').toBeGreaterThanOrEqual(9500);
      if (sc.checkNoAutoRetry) expect.soft(autoRetries, 'E-03: reintentos automáticos en 10 s').toBe(0);
      expect.soft(retryCells).toHaveLength(6);
      expect(pageErrors).toHaveLength(0);
    });
  }
});
