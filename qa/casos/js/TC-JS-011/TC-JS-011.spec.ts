import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CASO DE PRUEBA: TC-JS-011
 * Nombre / Escenario: Prevención de XSS reflejado en el buscador de ciudades
 * Módulo / Endpoint: Módulo de búsqueda / GET /v1/search (Geocoding API Open-Meteo)
 * Tipo de prueba: Seguridad
 * Prioridad: Crítica
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 2026-09-27
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que la entrada de texto no ejecuta código y se muestra escapada
 * al consultar o reflejar entradas maliciosas en el ambiente desplegado.
 */

test.describe('TC-JS-011: Prevención de XSS reflejado en el buscador de ciudades (Seguridad)', () => {
  const EVIDENCE_DIR = path.resolve(__dirname, 'evidencias', 'TC-JS-011__2026-09-28__run01');

  test.beforeAll(async () => {
    if (!fs.existsSync(EVIDENCE_DIR)) {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    }
  });

  test('no debe ejecutar script inyectado y debe escapar el texto reflejado en el DOM', async ({ page }) => {
    let dialogTriggered = false;
    let dialogMessage = '';

    // 1. Escuchar eventos de diálogo (alert, confirm, prompt)
    page.on('dialog', async (dialog) => {
      dialogTriggered = true;
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    // 2. Navegación al ambiente de QA desplegado
    await page.goto('/');
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();

    // 3. Preparar listener de la petición a la Geocoding API de Open-Meteo
    const payload = '<script>alert(1)</script>';
    let networkRequestCaptured = false;
    let requestedUrl = '';

    page.on('request', (request) => {
      if (request.url().includes('/v1/search')) {
        networkRequestCaptured = true;
        requestedUrl = request.url();
      }
    });

    // 4. Escribir el payload malicioso en el input del buscador
    await searchInput.fill(payload);

    // 5. Localizar y verificar el mensaje de estado cuando no hay resultados
    // Nota: Esperar a que pase el estado de "Buscando ubicaciones…" y se presente el texto de resultado vacío
    const emptyStatus = page.locator('.city-search__status[role="status"]');
    await expect(emptyStatus).toContainText(`No se encontraron ubicaciones para «${payload}»`, { timeout: 15000 });

    // 6. Verificar que ningún diálogo/alert fue disparado
    expect(dialogTriggered).toBeFalsy();
    expect(dialogMessage).toBe('');

    // 7. Verificar que el texto reflejado aparece de forma segura (escapado/texto plano)
    const statusText = await emptyStatus.innerText();
    expect(statusText).toContain(`No se encontraron ubicaciones para «${payload}»`);

    // 8. Verificar que no se inyectó una etiqueta <script> en el DOM
    const injectedScripts = await page.locator('.city-search script').count();
    expect(injectedScripts).toBe(0);

    // 9. Verificar que el elemento conserva su tipo seguro (HTMLParagraphElement sin nodos script hijos)
    const innerHtml = await emptyStatus.innerHTML();
    expect(innerHtml).not.toContain('<script>');
    // React escapa los caracteres especiales al renderizar en el DOM
    expect(innerHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');

    // 10. Tomar captura de pantalla como evidencia de la ejecución exitosa
    const screenshotPath = path.join(EVIDENCE_DIR, 'TC-JS-011__xss-escaped-status.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // 11. Guardar log contextual de la prueba
    const logPath = path.join(EVIDENCE_DIR, 'execution-summary.txt');
    const logContent = [
      `ID del caso: TC-JS-011`,
      `Fecha de prueba: 2026-09-28`,
      `URL evaluada: ${page.url()}`,
      `Payload probado: ${payload}`,
      `Dialog disparado: ${dialogTriggered}`,
      `Scripts inyectados detectados en el DOM: ${injectedScripts}`,
      `Petición a API capturada: ${networkRequestCaptured}`,
      `URL consultada: ${requestedUrl}`,
      `Texto obtenido en estado: ${statusText}`,
      `HTML interno en estado: ${innerHtml}`,
      `Resultado: Aprobado (Mitigación XSS efectiva por renderizado seguro de React)`
    ].join('\n');
    fs.writeFileSync(logPath, logContent, 'utf8');
  });
});
