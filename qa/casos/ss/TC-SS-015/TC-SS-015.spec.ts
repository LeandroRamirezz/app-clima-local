import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-015
 * Nombre / Escenario: Comunicación 100 % por HTTPS (sitio y llamadas a Open-Meteo)
 * Módulo / Endpoint: Despliegue / hosting estático — RNF-14
 * Tipo de prueba: Seguridad
 * Prioridad: Alta
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright (+ curl / openssl para los pasos 1 y 2, ver curl-http-https.txt)
 *
 * Objetivo:
 * Verificar que la aplicación se sirva completamente por HTTPS, que el acceso por HTTP redirija a HTTPS y que
 * las solicitudes a los 4 endpoints de Open-Meteo usen HTTPS, sin contenido mixto.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-015__2026-09-29__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-015', 'evidencias', RUN_ID);
const OPEN_METEO = {
  geocoding: 'geocoding-api.open-meteo.com/v1/search',
  forecast: 'api.open-meteo.com/v1/forecast',
  archive: 'archive-api.open-meteo.com/v1/archive',
  air_quality: 'air-quality-api.open-meteo.com/v1/air-quality',
};

// Chromium completo (headless nuevo): el shell headless por defecto no expone el dominio Security de DevTools
test.use({ channel: 'chromium' });

test.describe('TC-SS-015: Comunicación 100 % por HTTPS (RNF-14)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(90000);

  test('Flujo Bogotá → pronóstico → histórico 15/09/2026 → calidad del aire → comparar con Neiva', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

    const requests: { url: string; tipo: string }[] = [];
    const consoleMessages: { tipo: string; texto: string }[] = [];
    const securityStates: { estado: string; resumen: unknown }[] = [];
    page.on('request', (req) => requests.push({ url: req.url(), tipo: req.resourceType() }));
    page.on('console', (msg) => consoleMessages.push({ tipo: msg.type(), texto: msg.text() }));
    page.on('pageerror', (err) => consoleMessages.push({ tipo: 'pageerror', texto: err.message }));

    // Estado de seguridad (equivalente a DevTools > Security)
    const cdp = await page.context().newCDPSession(page);
    cdp.on('Security.visibleSecurityStateChanged', (e) => {
      const v = e.visibleSecurityState;
      securityStates.push({
        estado: v.securityState,
        resumen: {
          certificado: v.certificateSecurityState ? {
            protocolo: v.certificateSecurityState.protocol,
            cifrado: v.certificateSecurityState.cipher,
            emisor: v.certificateSecurityState.issuer,
            sujeto: v.certificateSecurityState.subjectName,
            valido_hasta: new Date(v.certificateSecurityState.validTo * 1000).toISOString(),
            certificado_con_errores: v.certificateSecurityState.certificateHasWeakSignature || v.certificateSecurityState.obsoleteSslProtocol,
          } : null,
          indicadores: v.securityStateIssueIds,
        },
      });
    });
    await cdp.send('Security.enable');

    // Paso 3: recorrer el flujo
    const mainResponse = await page.goto('/');
    const tls = await mainResponse!.securityDetails();
    const secureContext = await page.evaluate(() => ({ isSecureContext: window.isSecureContext, protocolo: location.protocol }));

    const mainSearch = page.locator('.location-options .city-search');
    await mainSearch.getByRole('combobox', { name: /Nombre de la ciudad/i }).fill('Bogotá');
    await mainSearch.getByRole('listbox', { name: /Ubicaciones encontradas/i }).getByRole('option', { name: /Bogotá.*Colombia/i }).first().click();
    await expect(page.locator('.current-weather__temperature strong')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.forecast-panel__day').first()).toBeVisible();
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso3-pronostico-bogota.png'), fullPage: true });

    await page.getByRole('button', { name: 'Históricos', exact: true }).click();
    await page.locator('#historical-start-date').fill('2026-09-15');
    await page.locator('#historical-end-date').fill('2026-09-15');
    await page.getByRole('button', { name: 'Consultar histórico' }).click();
    await expect(page.locator('.historical-weather__results h3')).toHaveText('Histórico — 15/09/2026', { timeout: 20000 });

    await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
    await expect(page.locator('.air-quality__current')).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Comparar ciudades', exact: true }).click();
    const setup = page.locator('.current-weather__comparison-setup');
    await setup.getByRole('button', { name: /Agregar ubicación seleccionada/ }).click();
    await setup.getByRole('combobox', { name: /Nombre de la ciudad/i }).fill('Neiva');
    await setup.getByRole('listbox', { name: /Ubicaciones encontradas/i }).getByRole('option', { name: /Neiva.*Huila/i }).first().click();
    await expect(page.locator('.city-comparison__table').first()).toBeVisible({ timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso3-comparacion-bogota-neiva.png'), fullPage: true });

    const finalState = await cdp.send('Security.disable').then(() => securityStates.at(-1) ?? null);

    // Pasos 4 a 6: análisis
    const nonHttps = requests.filter((r) => !r.url.startsWith('https://') && !r.url.startsWith('data:') && !r.url.startsWith('blob:'));
    const byEndpoint = Object.fromEntries(Object.entries(OPEN_METEO).map(([k, host]) => {
      const hits = requests.filter((r) => r.url.includes(host));
      return [k, { solicitudes: hits.length, todas_https: hits.every((r) => r.url.startsWith('https://')) }];
    }));
    const ownRequests = requests.filter((r) => r.url.includes('app-clima-local.vercel.app'));
    const mixedContent = consoleMessages.filter((m) => /mixed content/i.test(m.texto));
    const hosts = [...new Set(requests.map((r) => new URL(r.url).host))];

    const summary = {
      documento_principal: { url: mainResponse!.url(), http: mainResponse!.status(), tls, ...secureContext },
      total_solicitudes: requests.length,
      solicitudes_https: requests.length - nonHttps.length,
      solicitudes_no_https: nonHttps,
      solicitudes_propias: { total: ownRequests.length, todas_https: ownRequests.every((r) => r.url.startsWith('https://')) },
      open_meteo: byEndpoint,
      hosts_contactados: hosts,
      advertencias_contenido_mixto: mixedContent,
      mensajes_consola: consoleMessages,
      estado_seguridad_final: finalState,
      estados_seguridad_observados: [...new Set(securityStates.map((s) => s.estado))],
      solicitudes: requests,
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'resumen-https.json'), JSON.stringify(summary, null, 2));

    expect.soft(mainResponse!.url()).toMatch(/^https:\/\//);
    expect.soft(mainResponse!.status()).toBe(200);
    expect.soft(secureContext.isSecureContext, 'Contexto seguro (requisito de geolocalización)').toBe(true);
    expect.soft(nonHttps, '100 % de solicitudes por HTTPS').toEqual([]);
    for (const [k, v] of Object.entries(byEndpoint)) {
      expect.soft(v.solicitudes, `${k}: al menos una solicitud en el flujo`).toBeGreaterThan(0);
      expect.soft(v.todas_https, `${k}: HTTPS`).toBe(true);
    }
    expect.soft(mixedContent, '0 advertencias de contenido mixto').toEqual([]);
    expect.soft(finalState?.estado, 'Página reportada como segura').toBe('secure');
  });
});
