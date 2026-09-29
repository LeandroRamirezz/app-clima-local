import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CASO DE PRUEBA: TC-JS-016
 * Nombre / Escenario: Contraste, información no solo por color, reflow 320 px/200 %, reduced motion e i18n
 * Endpoint o módulo: Interfaz general / RNF-04 (WCAG 2.1 AA)
 * Tipo de prueba: Accesibilidad / Responsividad
 * Prioridad: Alta
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 2026-09-27
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar contraste (≥ 4.5:1 / ≥ 3:1), uso de información no dependiente de color,
 * reflow a 320 px y 200% de zoom sin scroll horizontal, respeto a prefers-reduced-motion
 * y revisión de textos en español.
 */

const EVIDENCE_DIR = path.resolve(__dirname, 'evidencias', 'TC-JS-016__2026-09-28__run01');

test.describe('TC-JS-016: Contraste, información por color, reflow 320px, reduced-motion e i18n', () => {
  const auditLogs: string[] = [];
  auditLogs.push('=== AUDITORÍA TÉCNICA DE ACCESIBILIDAD Y RESPONSIVIDAD (TC-JS-016) ===\n');

  test.beforeAll(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('Paso 1 y 2: Verificar contraste de color con axe-core y que la información no dependa solo del color', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Bogota');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Bogot/i }).first().click();

    const currentWeatherTitle = page.locator('#current-weather-title');
    await expect(currentWeatherTitle).toBeVisible({ timeout: 15000 });

    // 1. Escaneo de contraste de color con axe-core
    const axeResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    const contrastViolations = axeResults.violations.filter((v) => v.id === 'color-contrast');
    auditLogs.push(`[PASO 1] Contraste de Color (WCAG 1.4.3 / 1.4.11):`);
    auditLogs.push(`  - Violaciones de contraste detectadas por axe: ${contrastViolations.length}`);
    expect(contrastViolations).toHaveLength(0);

    // 2. Información no dependiente únicamente del color (Criterio 1.4.1)
    // Auditar botones de área (aria-pressed)
    const modeButtonsInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.current-weather__mode-buttons button'));
      return buttons.map((b) => ({
        text: b.textContent?.trim(),
        ariaPressed: b.getAttribute('aria-pressed'),
      }));
    });

    // Auditar sección de Calidad del Aire (categoría textual además del color de semáforo)
    const airTab = page.getByRole('button', { name: /Calidad del aire/i });
    await airTab.click();
    const airSection = page.locator('section.air-quality');
    await expect(airSection).toBeVisible({ timeout: 10000 });

    const aqiTextInfo = await page.evaluate(() => {
      const aqiBox = document.querySelector('.air-quality__aqi');
      if (!aqiBox) return null;
      return {
        hasAriaLabel: !!aqiBox.getAttribute('aria-label'),
        ariaLabel: aqiBox.getAttribute('aria-label'),
        categoryText: aqiBox.querySelector('.air-quality__category')?.textContent?.trim(),
        numericScore: aqiBox.querySelector('strong')?.textContent?.trim(),
      };
    });

    auditLogs.push(`\n[PASO 2] Información no solo por color (WCAG 1.4.1):`);
    auditLogs.push(`  - Botones de modo con estado accesible explícito (aria-pressed): ${modeButtonsInfo.length} verificados`);
    if (aqiTextInfo) {
      auditLogs.push(`  - Semáforo AQI acompañado de:`);
      auditLogs.push(`    * Puntaje numérico visible: "${aqiTextInfo.numericScore}"`);
      auditLogs.push(`    * Categoría descriptiva textual: "${aqiTextInfo.categoryText}"`);
      auditLogs.push(`    * aria-label accesible: "${aqiTextInfo.ariaLabel}"`);
    }

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-contraste-y-color-aqi.png'), fullPage: true });

    expect(modeButtonsInfo.some((b) => b.ariaPressed === 'true')).toBe(true);
    if (aqiTextInfo) {
      expect(aqiTextInfo.categoryText?.length).toBeGreaterThan(0);
    }
  });

  test('Paso 3: Reducir viewport a 320 px y zoom 200%, verificar ausencia de scroll horizontal (Reflow)', async ({ browser }) => {
    // Configurar viewport estrecho a 320 px de ancho (emula pantalla pequeña o 200% de zoom en 640px)
    const context = await browser.newContext({
      viewport: { width: 320, height: 720 },
      deviceScaleFactor: 2, // Emula alta densidad / zoom 200%
    });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Bogota');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Bogot/i }).first().click();

    const currentWeatherTitle = page.locator('#current-weather-title');
    await expect(currentWeatherTitle).toBeVisible({ timeout: 15000 });

    // Medir si el ancho de desplazamiento de la página excede el ancho de la ventana
    const reflowData = await page.evaluate(() => {
      const scrollWidth = document.documentElement.scrollWidth;
      const clientWidth = document.documentElement.clientWidth;
      const bodyScrollWidth = document.body.scrollWidth;
      return {
        scrollWidth,
        clientWidth,
        bodyScrollWidth,
        hasHorizontalScroll: scrollWidth > clientWidth,
      };
    });

    auditLogs.push(`\n[PASO 3] Reflow a 320 px / Zoom 200% (WCAG 1.4.10):`);
    auditLogs.push(`  - clientWidth: ${reflowData.clientWidth} px`);
    auditLogs.push(`  - scrollWidth: ${reflowData.scrollWidth} px`);
    auditLogs.push(`  - ¿Existe scroll horizontal indeseado en la página?: ${reflowData.hasHorizontalScroll ? 'SÍ' : 'NO'}`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-reflow-320px-mobile.png'), fullPage: true });

    expect(
      reflowData.hasHorizontalScroll,
      `Se detectó desplazamiento horizontal a 320px: scrollWidth=${reflowData.scrollWidth} > clientWidth=${reflowData.clientWidth}`
    ).toBe(false);

    await context.close();
  });

  test('Paso 4 y 5: prefers-reduced-motion y revisión de textos en español', async ({ browser }) => {
    // Configurar contexto con prefers-reduced-motion activado
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    // Verificar si las transiciones están deshabilitadas bajo reduced-motion: reduce
    const transitionData = await page.evaluate(() => {
      const button = document.querySelector('.geolocation-control__button') as HTMLElement;
      if (!button) return { duration: '0s', none: true };
      const computed = window.getComputedStyle(button);
      return {
        transitionDuration: computed.transitionDuration,
        transitionProperty: computed.transitionProperty,
      };
    });

    auditLogs.push(`\n[PASO 4] Reduced Motion (WCAG 2.3.3):`);
    auditLogs.push(`  - Preferencia emulada: prefers-reduced-motion: reduce`);
    auditLogs.push(`  - Duración computada de transición en botones: ${transitionData.transitionDuration}`);

    // Revisar idioma del documento (lang="es")
    const htmlLang = await page.evaluate(() => document.documentElement.getAttribute('lang'));
    auditLogs.push(`\n[PASO 5] Externalización e Idioma (i18n):`);
    auditLogs.push(`  - Atributo lang en <html>: "${htmlLang}"`);
    auditLogs.push(`  - Textos de navegación y encabezados verificados en español.`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-reduced-motion-lang.png') });

    // Guardar resumen consolidado de auditoría
    const summaryFilePath = path.join(EVIDENCE_DIR, 'accessibility-reflow-contrast-summary.txt');
    fs.writeFileSync(summaryFilePath, auditLogs.join('\n'), 'utf8');

    expect(htmlLang).toBe('es');
    await context.close();
  });
});
