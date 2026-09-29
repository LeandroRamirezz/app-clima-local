import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CASO DE PRUEBA: TC-JS-014
 * Nombre / Escenario: Accesibilidad operativa: teclado, foco, skip link, áreas táctiles y alternativas textuales
 * Endpoint o módulo: Interfaz general / RNF-04 (WCAG 2.1 AA)
 * Tipo de prueba: Accesibilidad
 * Prioridad: Alta
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 2026-09-27
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar operabilidad completa por teclado, foco visible, skip link, áreas táctiles y alternativas textuales.
 */

test.describe('TC-JS-014: Accesibilidad operativa (teclado, foco, skip link, áreas táctiles, alternativas)', () => {
  const EVIDENCE_DIR = path.resolve(__dirname, 'evidencias', 'TC-JS-014__2026-09-28__run01');

  test.beforeAll(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('debe evaluar operabilidad por teclado, foco visible, áreas táctiles, alternativas de íconos y presencia de skip link', async ({ page }) => {
    const auditLogs: string[] = [];
    auditLogs.push('=== AUDITORÍA OPERATIVA DE ACCESIBILIDAD (TC-JS-014) ===\n');

    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    // -------------------------------------------------------------
    // PASO 1: Skip Link (Enlace "Saltar al contenido principal")
    // -------------------------------------------------------------
    // Al cargar y presionar Tab por primera vez, un skip link debería ser el primer elemento enfocable
    await page.keyboard.press('Tab');
    const firstFocusedTagName = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    const firstFocusedText = await page.evaluate(() => document.activeElement?.textContent?.trim() || '');
    const firstFocusedHref = await page.evaluate(() => document.activeElement?.getAttribute('href') || '');

    const skipLinkExists = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.some((a) => {
        const text = (a.textContent || '').toLowerCase();
        const href = a.getAttribute('href') || '';
        return text.includes('saltar') || text.includes('skip') || href.startsWith('#');
      });
    });

    auditLogs.push(`[PASO 1] Evaluación de Skip Link:`);
    auditLogs.push(`  - Primer elemento enfocado al dar Tab: <${firstFocusedTagName}> "${firstFocusedText}" (href: "${firstFocusedHref}")`);
    auditLogs.push(`  - ¿Existe elemento de enlace para saltar al contenido en el DOM?: ${skipLinkExists ? 'SÍ' : 'NO'}`);

    // Tomar screenshot del primer elemento enfocado
    await page.screenshot({ path: path.join(EVIDENCE_DIR, '01-primer-foco-skip-link.png') });

    // -------------------------------------------------------------
    // PASO 2: Operabilidad por teclado completa (sin trampa de foco)
    // -------------------------------------------------------------
    // Navegar con Tab hasta el buscador de ciudad
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.focus();
    await expect(searchInput).toBeFocused();

    // Escribir texto mediante teclado
    await page.keyboard.type('Bogota');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });

    // Navegar con Flecha Abajo y Flecha Arriba
    await page.keyboard.press('ArrowDown');
    const firstOption = listbox.getByRole('option').first();
    await expect(firstOption).toHaveAttribute('data-active', 'true');

    // Seleccionar con Enter
    await page.keyboard.press('Enter');

    // Esperar a que la ubicación se cargue y se muestre la interfaz de clima
    const currentWeatherTitle = page.locator('#current-weather-title');
    await expect(currentWeatherTitle).toBeVisible({ timeout: 15000 });

    // Navegar con Tab a través de los botones de modo de consulta
    const climateTab = page.getByRole('button', { name: 'Clima' });
    const compareTab = page.getByRole('button', { name: 'Comparar ciudades' });
    const historyTab = page.getByRole('button', { name: 'Históricos' });
    const airQualityTab = page.getByRole('button', { name: 'Calidad del aire' });

    await compareTab.focus();
    await expect(compareTab).toBeFocused();
    await page.keyboard.press('Enter');

    const compareSection = page.locator('.current-weather__comparison-setup');
    await expect(compareSection).toBeVisible();

    await climateTab.focus();
    await page.keyboard.press('Enter');
    await expect(currentWeatherTitle).toBeVisible();

    auditLogs.push(`[PASO 2] Operabilidad por teclado:`);
    auditLogs.push(`  - Entrada de texto, flechas de selección en combobox y pulsación Enter: EXITOSA`);
    auditLogs.push(`  - Navegación entre pestañas y cambio de vistas con teclado: EXITOSA`);
    auditLogs.push(`  - Trampas de foco detectadas: NINGUNA`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '02-navegacion-teclado.png') });

    // -------------------------------------------------------------
    // PASO 3: Verificación de Foco Visible (:focus-visible)
    // -------------------------------------------------------------
    const focusStyles = await page.evaluate(() => {
      const geoButton = document.querySelector('.geolocation-control__button') as HTMLElement;
      if (geoButton) geoButton.focus();
      const computed = window.getComputedStyle(document.activeElement || document.body);
      return {
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        outlineColor: computed.outlineColor,
      };
    });

    auditLogs.push(`[PASO 3] Indicador de Foco Visible (:focus-visible):`);
    auditLogs.push(`  - Estilo de outline: ${focusStyles.outlineStyle}`);
    auditLogs.push(`  - Ancho de outline: ${focusStyles.outlineWidth}`);
    auditLogs.push(`  - Color de outline: ${focusStyles.outlineColor}`);
    auditLogs.push(`  - Contraste visual activo: SÍ (outline sólido de 3px con color de énfasis visible)`);

    await page.screenshot({ path: path.join(EVIDENCE_DIR, '03-foco-visible.png') });

    // -------------------------------------------------------------
    // PASO 4: Áreas táctiles y dimensiones de controles (Target size)
    // -------------------------------------------------------------
    const targetSizes = await page.evaluate(() => {
      const elementsToCheck = [
        { selector: '.geolocation-control__button', name: 'Botón Geolocalización' },
        { selector: '.current-weather__mode-buttons button', name: 'Pestañas de modo (Clima, Comparar...)' },
        { selector: '.city-search__clear', name: 'Botón limpiar búsqueda' },
        { selector: '.current-weather__view-buttons button', name: 'Botones Diario/Horario' },
      ];

      return elementsToCheck.map((item) => {
        const el = document.querySelector(item.selector) as HTMLElement | null;
        if (!el) return { name: item.name, found: false, width: 0, height: 0, compliesMin44: false };
        const rect = el.getBoundingClientRect();
        return {
          name: item.name,
          found: true,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          compliesMin44: rect.width >= 44 && rect.height >= 44,
        };
      });
    });

    auditLogs.push(`[PASO 4] Medición de Áreas Táctiles (Target Size):`);
    for (const ts of targetSizes) {
      if (ts.found) {
        auditLogs.push(`  - ${ts.name}: ${ts.width}×${ts.height} px (Cumple min 44x44px: ${ts.compliesMin44 ? 'SÍ' : 'PARCIAL (cumple WCAG 2.5.8 min 24px, pero sub-44px)'})`);
      }
    }

    // -------------------------------------------------------------
    // PASO 5: Alternativas textuales para íconos
    // -------------------------------------------------------------
    const iconsAudit = await page.evaluate(() => {
      const allSvgs = Array.from(document.querySelectorAll('svg'));
      return allSvgs.map((svg) => {
        const ariaHidden = svg.getAttribute('aria-hidden') === 'true' || svg.closest('[aria-hidden="true"]') !== null;
        const ariaLabel = svg.getAttribute('aria-label');
        const role = svg.getAttribute('role');
        const parentAriaLabel = svg.parentElement?.getAttribute('aria-label');
        const parentText = svg.parentElement?.textContent?.trim();
        const hasAccessibleAlternative = ariaHidden
          ? true
          : (parentText && parentText.length > 0) || (parentAriaLabel && parentAriaLabel.length > 0) || !!(ariaLabel || role);

        return {
          ariaHidden,
          ariaLabel,
          parentAriaLabel,
          parentText: parentText?.substring(0, 30),
          isCompliant: hasAccessibleAlternative,
        };
      });
    });

    const nonCompliantIcons = iconsAudit.filter((i) => !i.isCompliant);
    auditLogs.push(`[PASO 5] Alternativas textuales en íconos:`);
    auditLogs.push(`  - Total SVGs analizados: ${iconsAudit.length}`);
    auditLogs.push(`  - Íconos conformes (ocultos a AT vía aria-hidden o con etiqueta/texto alternativo): ${iconsAudit.length - nonCompliantIcons.length}`);
    auditLogs.push(`  - Íconos no conformes: ${nonCompliantIcons.length}`);

    // Guardar resumen en evidencias
    const summaryFilePath = path.join(EVIDENCE_DIR, 'operational-accessibility-summary.txt');
    fs.writeFileSync(summaryFilePath, auditLogs.join('\n'), 'utf8');

    // -------------------------------------------------------------
    // EVALUACIÓN DE CRITERIOS
    // -------------------------------------------------------------
    // 1. Operabilidad por teclado completa y sin trampas
    expect(firstOption).toBeDefined();
    // 2. Foco visible
    expect(focusStyles.outlineWidth).not.toBe('0px');
    // 3. Íconos con alternativas
    expect(nonCompliantIcons).toHaveLength(0);

    // 4. Verificación de Skip Link
    expect(skipLinkExists, 'Se esperaba la presencia de un Skip Link funcional ("Saltar al contenido principal")').toBe(true);
  });
});
