import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CASO DE PRUEBA: TC-JS-013
 * Nombre / Escenario: Auditoría automática de accesibilidad en todos los flujos
 * Endpoint o módulo: Todos los flujos principales / RNF-04 (WCAG 2.1 AA)
 * Tipo de prueba: Accesibilidad
 * Prioridad del caso: Alta
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 2026-09-27
 * Bloque: js
 * Herramienta: Playwright (@axe-core/playwright)
 *
 * Objetivo:
 * Verificar el cumplimiento de umbrales automáticos de accesibilidad (RNF-04).
 * Criterio: 0 violaciones de impacto "critical" o "serious" en cada flujo.
 */

interface FlowAuditSummary {
  flow: string;
  violationsCount: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  violations: Array<{
    id: string;
    impact: string | null | undefined;
    description: string;
    helpUrl: string;
    nodesCount: number;
  }>;
}

test.describe('TC-JS-013: Auditoría automática de accesibilidad en todos los flujos (RNF-04)', () => {
  const EVIDENCE_DIR = path.resolve(__dirname, 'evidencias', 'TC-JS-013__2026-09-28__run01');
  const auditSummaries: FlowAuditSummary[] = [];

  test.beforeAll(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  async function auditCurrentFlow(page: import('@playwright/test').Page, flowName: string, screenshotName: string) {
    // Tomar screenshot del estado del flujo
    const screenshotPath = path.join(EVIDENCE_DIR, `${screenshotName}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Ejecutar escaneo Axe con etiquetas WCAG 2.0 y 2.1 niveles A y AA
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter((v) => v.impact === 'critical');
    const seriousViolations = accessibilityScanResults.violations.filter((v) => v.impact === 'serious');
    const moderateViolations = accessibilityScanResults.violations.filter((v) => v.impact === 'moderate');
    const minorViolations = accessibilityScanResults.violations.filter((v) => v.impact === 'minor');

    const summary: FlowAuditSummary = {
      flow: flowName,
      violationsCount: accessibilityScanResults.violations.length,
      criticalCount: criticalViolations.length,
      seriousCount: seriousViolations.length,
      moderateCount: moderateViolations.length,
      minorCount: minorViolations.length,
      violations: accessibilityScanResults.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        helpUrl: v.helpUrl,
        nodesCount: v.nodes.length,
      })),
    };

    auditSummaries.push(summary);

    // Criterio de aceptación: 0 violaciones de impacto serious o critical
    const highSeverityViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(
      highSeverityViolations,
      `Flujo "${flowName}" contiene ${highSeverityViolations.length} violaciones de severidad critical/serious: ${JSON.stringify(highSeverityViolations, null, 2)}`
    ).toHaveLength(0);
  }

  test('debe cumplir con 0 violaciones critical/serious en todos los flujos interactivos de la aplicación', async ({ page }) => {
    // 1. Flujo Carga Inicial y Búsqueda
    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();
    await auditCurrentFlow(page, 'Carga inicial y buscador', '01-inicio-y-busqueda');

    // 2. Flujo Clima Actual y Pronóstico
    await searchInput.fill('Bogotá');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    const option = listbox.getByRole('option', { name: /Bogotá/i }).first();
    await option.click();

    const currentWeatherTitle = page.locator('#current-weather-title');
    await expect(currentWeatherTitle).toBeVisible({ timeout: 15000 });
    await auditCurrentFlow(page, 'Clima actual y pronóstico', '02-clima-y-pronostico');

    // 3. Flujo Preferencias y Unidades
    const preferencesDetails = page.locator('details.current-weather__preferences');
    if (await preferencesDetails.isVisible()) {
      await preferencesDetails.locator('summary').first().click();
      await page.waitForTimeout(300);
      await auditCurrentFlow(page, 'Preferencias de unidades y modelos', '03-unidades-preferencias');
    }

    // 4. Flujo Comparar Ciudades
    const compareTab = page.getByRole('button', { name: /Comparar ciudades/i });
    await compareTab.click();
    const compareSetup = page.locator('.current-weather__comparison-setup');
    await expect(compareSetup).toBeVisible({ timeout: 5000 });
    await auditCurrentFlow(page, 'Comparación de ciudades', '04-comparacion-ciudades');

    // 5. Flujo Históricos
    const historyTab = page.getByRole('button', { name: /Históricos/i });
    await historyTab.click();
    const historySection = page.locator('.historical-weather');
    await expect(historySection).toBeVisible({ timeout: 5000 });
    await auditCurrentFlow(page, 'Históricos meteorológicos', '05-historicos');

    // 6. Flujo Calidad del Aire
    const airQualityTab = page.getByRole('button', { name: /Calidad del aire/i });
    await airQualityTab.click();
    const airSection = page.locator('section.air-quality');
    await expect(airSection).toBeVisible({ timeout: 10000 });
    await auditCurrentFlow(page, 'Calidad del aire', '06-calidad-aire');

    // Guardar reporte consolidado de auditoría
    const reportPath = path.join(EVIDENCE_DIR, 'axe-audit-summary.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditSummaries, null, 2), 'utf8');

    const summaryTextPath = path.join(EVIDENCE_DIR, 'axe-audit-summary.txt');
    const summaryLines = [
      '=======================================================',
      'AUDITORÍA DE ACCESIBILIDAD AXE-CORE (TC-JS-013 / RNF-04)',
      '=======================================================',
      `Fecha: 2026-09-28`,
      `Estándares evaluados: WCAG 2.0 A/AA, WCAG 2.1 A/AA`,
      `Flujos evaluados: ${auditSummaries.length}`,
      '',
      ...auditSummaries.map((s) => [
        `Flujo: ${s.flow}`,
        `  Total Violaciones: ${s.violationsCount}`,
        `  Críticas: ${s.criticalCount}`,
        `  Serias: ${s.seriousCount}`,
        `  Moderadas: ${s.moderateCount}`,
        `  Menores: ${s.minorCount}`,
        s.violations.length > 0
          ? `  Detalle:\n${s.violations.map((v) => `    - [${v.impact?.toUpperCase()}] ${v.id}: ${v.description} (${v.nodesCount} nodo(s))`).join('\n')}`
          : '  Sin violaciones detectadas.',
        '-------------------------------------------------------',
      ].join('\n')),
      'Resultado Global: Aprobado (0 violaciones critical / serious en todos los flujos)',
    ];
    fs.writeFileSync(summaryTextPath, summaryLines.join('\n'), 'utf8');
  });
});
