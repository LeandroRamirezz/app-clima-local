import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CASO DE PRUEBA: TC-JS-012
 * Nombre / Escenario: Privacidad de coordenadas en geolocalización
 * Módulo / Endpoint: Módulo de geolocalización / RNF-07 (Privacidad de datos)
 * Tipo de prueba: Seguridad
 * Prioridad: Crítica
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 2026-09-27
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que las coordenadas no se persisten en almacenamiento local,
 * no se envían a servicios de analítica ni terceros, no se exponen en logs
 * de consola y que se muestra un aviso previo visible al usuario.
 */

test.describe('TC-JS-012: Privacidad de coordenadas en geolocalización (RNF-07)', () => {
  const EVIDENCE_DIR = path.resolve(__dirname, 'evidencias', 'TC-JS-012__2026-09-28__run01');
  const TEST_LATITUDE = 2.93;
  const TEST_LONGITUDE = -75.28;

  test.beforeAll(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('debe mostrar aviso previo, no persistir coordenadas en storage ni exponerlas en logs o analítica', async ({ page, context }) => {
    // 1. Simular geolocalización y permisos en el contexto del navegador
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: TEST_LATITUDE, longitude: TEST_LONGITUDE });

    // 2. Configurar interceptor de logs de consola para detectar fuga de coordenadas
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // 3. Configurar interceptor de peticiones de red
    const outgoingRequests: string[] = [];
    page.on('request', (request) => {
      outgoingRequests.push(request.url());
    });

    // 4. Navegar a la aplicación desplegada
    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    // 5. Paso 1: Verificar existencia y visibilidad del aviso previo de privacidad
    const privacyNotice = page.locator('.geolocation-control__privacy');
    await expect(privacyNotice).toBeVisible();
    await expect(privacyNotice).toContainText(
      'Tu ubicación se utilizará únicamente para consultar información meteorológica y no se guardará.'
    );

    // 6. Paso 2: Ejecutar acción de solicitar ubicación
    const geolocationButton = page.getByRole('button', { name: /Usar mi ubicación/i });
    await expect(geolocationButton).toBeVisible();
    await geolocationButton.click();

    // 7. Esperar a que la ubicación se aplique y el clima cargue
    const activeLocationSection = page.locator('section.active-location');
    await expect(activeLocationSection).toBeVisible({ timeout: 15000 });
    await expect(activeLocationSection).toContainText(/Mi ubicación/i);

    // Verificar que el clima actual se muestra para la ubicación detectada
    const currentWeatherSection = page.locator('#current-weather-title');
    await expect(currentWeatherSection).toBeVisible({ timeout: 15000 });

    // 8. Paso 3: Revisar Network - Validar que las coordenadas solo se enviaron a Open-Meteo
    const thirdPartyAnalyticsPatterns = [
      /google-analytics/i,
      /analytics/i,
      /mixpanel/i,
      /hotjar/i,
      /segment/i,
      /sentry/i,
      /clarity\.ms/i,
      /facebook/i
    ];

    const analyticsRequests = outgoingRequests.filter((url) =>
      thirdPartyAnalyticsPatterns.some((pattern) => pattern.test(url))
    );
    expect(analyticsRequests).toHaveLength(0);

    // Comprobar peticiones que contienen las coordenadas
    const requestsWithCoordinates = outgoingRequests.filter(
      (url) => url.includes('2.93') && url.includes('-75.28')
    );
    expect(requestsWithCoordinates.length).toBeGreaterThan(0);

    // Todas las peticiones con coordenadas deben ser hacia dominios oficiales de Open-Meteo
    for (const reqUrl of requestsWithCoordinates) {
      const parsedUrl = new URL(reqUrl);
      expect(parsedUrl.hostname).toMatch(/open-meteo\.com$/);
    }

    // 9. Paso 4: Revisar LocalStorage y SessionStorage - No deben contener las coordenadas
    const storageData = await page.evaluate(() => {
      const localItems: Record<string, string | null> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) localItems[key] = localStorage.getItem(key);
      }
      const sessionItems: Record<string, string | null> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) sessionItems[key] = sessionStorage.getItem(key);
      }
      return {
        localStorage: localItems,
        sessionStorage: sessionItems,
        localString: JSON.stringify(localItems),
        sessionString: JSON.stringify(sessionItems),
      };
    });

    expect(storageData.localString).not.toContain('2.93');
    expect(storageData.localString).not.toContain('-75.28');
    expect(storageData.sessionString).not.toContain('2.93');
    expect(storageData.sessionString).not.toContain('-75.28');

    // 10. Paso 5: Revisar consola - No deben existir logs con las coordenadas
    const logsWithCoordinates = consoleLogs.filter(
      (log) => log.includes('2.93') || log.includes('-75.28')
    );
    expect(logsWithCoordinates).toHaveLength(0);

    // 11. Capturar evidencia visual
    const screenshotPath = path.join(EVIDENCE_DIR, 'TC-JS-012__geolocation-privacy.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // 12. Guardar resumen de auditoría
    const summaryPath = path.join(EVIDENCE_DIR, 'privacy-audit-summary.txt');
    const summaryText = [
      `CASO: TC-JS-012 - Privacidad de Coordenadas en Geolocalización`,
      `Fecha: 2026-09-28`,
      `Coordenadas de prueba: lat=${TEST_LATITUDE}, lon=${TEST_LONGITUDE}`,
      `Aviso de privacidad previo: Presente y verificado`,
      `Peticiones a analítica o terceros: 0 detectadas`,
      `Peticiones con coordenadas a Open-Meteo: ${requestsWithCoordinates.length}`,
      `Peticiones examinadas con coordenadas:`,
      ...requestsWithCoordinates.map((url) => `  - ${url}`),
      `Contenido de localStorage: ${storageData.localString}`,
      `Contenido de sessionStorage: ${storageData.sessionString}`,
      `Coordenadas persistidas en storage: NO`,
      `Logs de consola totales: ${consoleLogs.length}`,
      `Logs con coordenadas filtradas: 0`,
      `Estado: Aprobado (Cumplimiento estricto de RNF-07)`
    ].join('\n');

    fs.writeFileSync(summaryPath, summaryText, 'utf8');
  });
});
