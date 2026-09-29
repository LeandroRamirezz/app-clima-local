import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-010
 * Nombre / Escenario: Manejo de errores E-01 a E-05 en la consulta de calidad del aire
 * Módulo / Endpoint: GET /v1/air-quality (respuesta interceptada, 5 escenarios)
 * Tipo de prueba: Funcional
 * Prioridad: Alta
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que, ante cada escenario del catálogo E-01 a E-05 aplicado a /v1/air-quality, la sección
 * muestre el mensaje exacto en role="alert" con botón Reintentar, sin texto crudo, y que el fallo no
 * afecte al pronóstico ni a los demás módulos.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-010__2026-09-29__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-010', 'evidencias', RUN_ID);
const AIR_PATTERN = '**/air-quality-api.open-meteo.com/v1/air-quality**';

const MESSAGES = {
  'E-01': 'No hay conexión a internet. Verifique su red e intente nuevamente.',
  'E-02': 'La consulta tardó demasiado. Intente nuevamente.',
  'E-03': 'Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo.',
  'E-04': 'No fue posible procesar la consulta. Verifique los datos ingresados.',
  'E-05': 'El servicio meteorológico no está disponible en este momento. Intente más tarde.',
} as const;

// Textos técnicos que nunca deben mostrarse al usuario
const RAW_TEXT = /AirQualityVariable|invalid String value|"reason"|\breason\b|\b(400|429|500)\b|HTTP|<html>|TypeError|SyntaxError|Failed to fetch|NetworkError|AbortError|JSON|Unexpected token|at \w+ \(|stack/i;

type Scenario = {
  id: string;
  slug: string;
  code: keyof typeof MESSAGES;
  description: string;
  handler: (route: Route) => Promise<void>;
  checkNoAutoRetry?: boolean;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'E-01', slug: 'e01-fallo-de-red', code: 'E-01', description: 'Fallo de fetch solo en /v1/air-quality (internetdisconnected)',
    handler: (route) => route.abort('internetdisconnected'),
  },
  {
    id: 'E-02', slug: 'e02-timeout-11s', code: 'E-02', description: 'Respuesta retrasada 11 000 ms',
    handler: async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 11000));
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }).catch(() => {});
    },
  },
  {
    id: 'E-03', slug: 'e03-http-429', code: 'E-03', description: 'HTTP 429', checkNoAutoRetry: true,
    handler: (route) => route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: true, reason: 'Too many requests' }) }),
  },
  {
    id: 'E-04', slug: 'e04-http-400', code: 'E-04', description: 'HTTP 400 con reason de la API',
    handler: (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: true, reason: 'Cannot initialize AirQualityVariable from invalid String value x' }) }),
  },
  {
    id: 'E-05a', slug: 'e05a-http-500', code: 'E-05', description: 'HTTP 500',
    handler: (route) => route.fulfill({ status: 500, contentType: 'text/plain', body: 'Internal Server Error' }),
  },
  {
    id: 'E-05b', slug: 'e05b-cuerpo-html', code: 'E-05', description: 'HTTP 200 con cuerpo malformado "<html>"',
    handler: (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '<html>' }),
  },
];

async function readClimate(page: Page) {
  await page.getByRole('button', { name: 'Clima', exact: true }).click();
  await expect(page.locator('.current-weather__location')).toContainText(/Neiva/i, { timeout: 15000 });
  await expect(page.locator('.forecast-panel__day').first()).toBeVisible({ timeout: 15000 });
  return {
    ubicacion: (await page.locator('.current-weather__location').innerText()).trim(),
    tarjeta_clima_visible: await page.locator('.current-weather__card').isVisible(),
    dias_pronostico: await page.locator('.forecast-panel__day').count(),
    error_clima: await page.locator('.current-weather__error').count(),
  };
}

test.describe('TC-SS-010: Manejo de errores E-01 a E-05 en calidad del aire (RF-06, RNF-12)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(90000);

  for (const sc of SCENARIOS) {
    test(`${sc.id}: ${sc.description}`, async ({ page }) => {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));
      const airRequests: number[] = [];
      const forecastStatuses: number[] = [];
      page.on('request', (req) => { if (req.url().includes('air-quality-api.open-meteo.com/v1/air-quality')) airRequests.push(Date.now()); });
      page.on('response', (res) => { if (res.url().includes('api.open-meteo.com/v1/forecast')) forecastStatuses.push(res.status()); });

      // Precondición: Neiva activa con clima actual (RF-01) cargado
      await page.goto('/');
      const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
      await searchInput.fill('Neiva');
      const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
      await expect(listbox).toBeVisible({ timeout: 10000 });
      await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
      await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);
      const climateBefore = await readClimate(page);

      // Paso 1: activar la interceptación (solo /v1/air-quality) y abrir la sección
      await page.route(AIR_PATTERN, sc.handler);
      const started = Date.now();
      await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
      const section = page.locator('section.air-quality');

      // Paso 2: mensaje exacto dentro de role="alert"
      const alert = section.locator('.air-quality__error[role="alert"]');
      await expect(alert).toBeVisible({ timeout: 20000 });
      const errorShownMs = Date.now() - started;
      const alertMessage = (await alert.locator('span').innerText()).trim();

      // Paso 3: botón Reintentar y ausencia de texto crudo
      const retry = alert.getByRole('button', { name: 'Reintentar' });
      await expect(retry).toBeVisible();
      await expect(retry).toBeEnabled();
      const sectionText = await section.innerText();
      const rawMatch = sectionText.match(RAW_TEXT)?.[0] ?? null;
      await expect(section.locator('.air-quality__current')).toHaveCount(0);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `${sc.slug}__error.png`), fullPage: true });

      // Paso 4 (E-03): 10 s sin interactuar, sin reintentos automáticos
      let autoRetries: number | null = null;
      if (sc.checkNoAutoRetry) {
        const before = airRequests.length;
        await page.waitForTimeout(10000);
        autoRetries = airRequests.length - before;
        await expect(alert).toBeVisible();
      }

      // Paso 5: clima actual y pronóstico siguen visibles y correctos
      const climateAfter = await readClimate(page);
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `${sc.slug}__clima-y-pronostico.png`), fullPage: true });

      // Paso 6: quitar la interceptación, volver a la sección, Reintentar y verificar la carga
      await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
      await expect(alert).toBeVisible({ timeout: 20000 });
      await page.unroute(AIR_PATTERN, sc.handler);
      const requestsBeforeRetry = airRequests.length;
      await section.locator('.air-quality__error[role="alert"]').getByRole('button', { name: 'Reintentar' }).click();
      await expect(section.locator('.air-quality__current')).toBeVisible({ timeout: 20000 });
      await expect(alert).toHaveCount(0);
      const retryAqi = (await section.locator('.air-quality__aqi strong').innerText().catch(() => '')).trim()
        || (await section.locator('.air-quality__unavailable').innerText().catch(() => '')).trim();
      const retryPollutants = await section.locator('.air-quality__pollutant').count();
      await page.screenshot({ path: path.join(EVIDENCE_DIR, `${sc.slug}__reintento.png`), fullPage: true });

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
        clima_antes: climateBefore,
        clima_durante_fallo: climateAfter,
        respuestas_forecast: forecastStatuses,
        solicitudes_tras_reintentar: airRequests.length - requestsBeforeRetry,
        aqi_tras_reintentar: retryAqi,
        contaminantes_tras_reintentar: retryPollutants,
        errores_consola: pageErrors,
      };
      fs.writeFileSync(path.join(EVIDENCE_DIR, `${sc.slug}.json`), JSON.stringify(result, null, 2));

      expect.soft(alertMessage, `${sc.id}: mensaje`).toBe(MESSAGES[sc.code]);
      expect.soft(rawMatch, `${sc.id}: texto técnico visible`).toBeNull();
      if (sc.code === 'E-02') expect.soft(errorShownMs, 'E-02: el error debe aparecer tras ~10 s').toBeGreaterThanOrEqual(9500);
      if (sc.checkNoAutoRetry) expect.soft(autoRetries, 'E-03: reintentos automáticos en 10 s').toBe(0);
      expect.soft(climateAfter.ubicacion).toBe(climateBefore.ubicacion);
      expect.soft(climateAfter.dias_pronostico).toBe(climateBefore.dias_pronostico);
      expect.soft(climateAfter.error_clima).toBe(0);
      expect.soft(forecastStatuses.every((s) => s === 200)).toBe(true);
      expect.soft(result.solicitudes_tras_reintentar).toBeGreaterThanOrEqual(1);
      expect.soft(retryPollutants).toBe(6);
      expect(pageErrors).toHaveLength(0);
    });
  }
});
