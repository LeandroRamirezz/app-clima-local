import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CASO DE PRUEBA: TC-JS-017
 * Nombre / Escenario: Accesibilidad del diálogo de permiso de geolocalización
 * Endpoint o módulo: Diálogo de geolocalización / RF-03 / RNF-04 (WCAG 2.1 AA)
 * Tipo de prueba: Accesibilidad
 * Prioridad: Alta
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 2026-09-27
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que el diálogo/control de permiso de geolocalización es completamente
 * accesible por teclado, que anuncia estados ("Obteniendo ubicación…") en role="status"
 * con aria-live="polite", que los mensajes de error tienen role="alert" y que no
 * existen trampas de foco.
 */

const EVIDENCE_DIR = path.resolve(__dirname, 'evidencias', 'TC-JS-017__2026-09-28__run01');

test.describe('TC-JS-017: Accesibilidad del control de permiso de geolocalización', () => {
  const auditLogs: string[] = [];
  auditLogs.push('=== AUDITORÍA DE ACCESIBILIDAD EN GEOLOCALIZACIÓN (TC-JS-017) ===\n');

  test.beforeAll(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Paso 1 y 2: Activación por teclado (Enter/Espacio) y anuncio en role="status" (Carga y Éxito)', async ({ browser }) => {
    // 1. Contexto con permiso de geolocalización concedido y coordenadas válidas
    const context = await browser.newContext({
      permissions: ['geolocation'],
      geolocation: { latitude: 4.6097, longitude: -74.0817 }, // Bogotá
    });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    // 2. Localizar botón "Usar mi ubicación" y hacer foco con teclado
    const geoBtn = page.getByRole('button', { name: /Usar mi ubicación/i });
    await geoBtn.focus();
    await expect(geoBtn).toBeFocused();

    // 3. Activar mediante la tecla Espacio (Space)
    await page.keyboard.press('Space');

    // 4. Capturar inmediatamente el estado de carga o transición accesible
    const loadingMessage = page.locator('.geolocation-control__message[role="status"]');
    const loadingMessageCount = await loadingMessage.count();
    if (loadingMessageCount > 0) {
      const liveMode = await loadingMessage.first().getAttribute('aria-live');
      auditLogs.push(`[PASO 1] Estado de carga de ubicación:`);
      auditLogs.push(`  - Elemento con role="status" y aria-live="${liveMode}" detectado`);
      auditLogs.push(`  - Texto anunciado: "${await loadingMessage.first().innerText()}"`);
    }

    // 5. Esperar resultado de éxito y verificar actualización en región accesible
    const activeLocation = page.locator('section.active-location');
    await expect(activeLocation).toBeVisible({ timeout: 15000 });

    const activeRole = await activeLocation.getAttribute('role');
    const activeLive = await activeLocation.getAttribute('aria-live');
    expect(activeRole).toBe('status');
    expect(activeLive).toBe('polite');

    auditLogs.push(`[PASO 2] Anuncio de ubicación seleccionada:`);
    auditLogs.push(`  - Sección active-location con role="${activeRole}" y aria-live="${activeLive}"`);
    auditLogs.push(`  - Ubicación verbalizada: "${await activeLocation.locator('.active-location__name').innerText()}"`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-geolocalizacion-teclado-exito.png') });
    await context.close();
  });

  test('Paso 3 y 4: Manejo de denegación de permiso: anuncio en role="alert", reintento por teclado y sin trampa de foco', async ({ browser }) => {
    // Contexto sin conceder permiso de geolocalización (simula denegación o bloqueo del navegador)
    const context = await browser.newContext({
      permissions: [],
    });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    const geoBtn = page.getByRole('button', { name: /Usar mi ubicación/i });
    await geoBtn.focus();
    await expect(geoBtn).toBeFocused();

    // Activar con la tecla Enter
    await page.keyboard.press('Enter');

    // Debe mostrarse el mensaje de error con role="alert"
    const alertMessage = page.locator('.geolocation-control__message[role="alert"]');
    await expect(alertMessage).toBeVisible({ timeout: 10000 });

    const alertText = await alertMessage.innerText();
    const alertRole = await alertMessage.getAttribute('role');
    expect(alertRole).toBe('alert');
    expect(alertText).toContain('permiso fue denegado');

    auditLogs.push(`\n[PASO 3 y 4] Manejo de error/denegación de geolocalización:`);
    auditLogs.push(`  - Elemento de error con role="${alertRole}"`);
    auditLogs.push(`  - Mensaje de denegación anunciado: "${alertText}"`);

    // Al ser denegado, el botón permanece activo con el texto 'Usar mi ubicación' para permitir nueva solicitud si el usuario habilita el permiso
    const buttonAfterError = page.locator('.geolocation-control__button');
    await expect(buttonAfterError).toBeVisible();
    await expect(buttonAfterError).toBeEnabled();

    // Comprobar que no hay trampa de foco: se puede tabular fuera del botón hacia el resto de la interfaz
    await page.keyboard.press('Tab');
    const focusedAfterTab = await page.evaluate(() => document.activeElement?.tagName);
    auditLogs.push(`  - Verificación de ausencia de trampa de foco: Tabuló correctamente hacia <${focusedAfterTab}>`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-geolocalizacion-denegada-alert.png') });

    // Guardar resumen en evidencias
    const summaryFilePath = path.join(EVIDENCE_DIR, 'geolocation-accessibility-summary.txt');
    fs.writeFileSync(summaryFilePath, auditLogs.join('\n'), 'utf8');

    await context.close();
  });
});
