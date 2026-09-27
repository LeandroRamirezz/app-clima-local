import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA DE EJEMPLO / PLANTILLA ILUSTRATIVA
 * ID: TC-EJEMPLO-000
 * RF Relacionado: RF-01 (Carga inicial y visualización de interfaz)
 * Bloque: ejemplo
 * Herramienta: Playwright
 *
 * NOTA: Este archivo es únicamente un ejemplo demostrativo de la estructura
 * y convención de nombres para los casos de prueba del equipo de QA.
 */
test.describe('TC-EJEMPLO-000: Verificación de carga inicial de la aplicación (Plantilla de ejemplo)', () => {
  test('debe cargar la página principal y verificar la estructura básica', async ({ page }) => {
    // 1. Navegación al ambiente bajo prueba
    await page.goto('/');

    // 2. Validación de disponibilidad y visibilidad
    await expect(page).toHaveTitle(/Clima|Observatorio/i);

    // 3. Verificación de presencia del contenedor principal
    const appContainer = page.locator('#root, main, .app-container');
    await expect(appContainer.first()).toBeVisible();
  });
});
