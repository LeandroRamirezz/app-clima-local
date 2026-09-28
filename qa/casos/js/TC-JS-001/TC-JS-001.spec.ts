import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-JS-001
 * Nombre / Escenario: Búsqueda de ciudad: válida, homónimos, sin resultados, texto corto y campo vacío
 * Módulo / Endpoint: GET /v1/search (Geocoding API Open-Meteo)
 * Tipo de prueba: Funcional
 * Prioridad: Crítica
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 2026-09-27
 * Bloque: js
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que la búsqueda de ciudad maneja correctamente los distintos escenarios
 * de entrada y resultados, mostrando mensajes claros y sin romper la interfaz en el ambiente desplegado.
 */

test.describe('TC-JS-001: Búsqueda de ciudad (RF-02)', () => {
  test.beforeEach(async ({ page }) => {
    // Monitorear que no existan errores de consola no controlados
    page.on('pageerror', (exception) => {
      console.error(`[Browser PageError] ${exception.message}`);
    });

    // Navegar a la página principal del ambiente desplegado
    await page.goto('/');

    // Asegurar que la aplicación cargó correctamente
    await expect(page).toHaveTitle(/Clima|Observatorio/i);
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await expect(searchInput).toBeVisible();
  });

  test('debe validar la búsqueda con una ciudad válida ("Bogotá") y actualizar el clima', async ({ page }) => {
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });

    // 1. Escribir "Bogotá" y esperar debounce de búsqueda
    await searchInput.fill('Bogotá');

    // Debe mostrar la lista de resultados
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });

    const bogotaOption = listbox.getByRole('option', { name: /Bogotá/i }).first();
    await expect(bogotaOption).toBeVisible();

    // Seleccionar "Bogotá"
    await bogotaOption.click();

    // Validar que se actualiza la sección de ubicación activa
    const activeLocationSection = page.locator('section.active-location');
    await expect(activeLocationSection).toBeVisible();
    await expect(activeLocationSection).toContainText(/Bogotá/i);

    // Validar que se dispara y muestra la sección de clima actual de Bogotá
    const currentWeatherTitle = page.locator('#current-weather-title');
    await expect(currentWeatherTitle).toBeVisible();
    await expect(page.locator('.current-weather__location')).toContainText(/Bogotá/i);
  });

  test('debe listar múltiples homónimos al escribir "San" y requerir selección', async ({ page }) => {
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });

    // 2. Escribir "San"
    await searchInput.fill('San');

    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });

    // Debe contener múltiples opciones
    const options = listbox.getByRole('option');
    await expect(options.first()).toBeVisible();
    const count = await options.count();
    expect(count).toBeGreaterThan(1);

    // Cada opción debe detallar región/país para distinguir homónimos
    const firstOptionRegion = options.first().locator('.city-search__option-region');
    await expect(firstOptionRegion).toBeVisible();
    const regionText = await firstOptionRegion.innerText();
    expect(regionText.length).toBeGreaterThan(0);
  });

  test('debe mostrar mensaje apropiado cuando no hay resultados ("Xyzabc123")', async ({ page }) => {
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });

    // 3. Escribir "Xyzabc123"
    await searchInput.fill('Xyzabc123');

    // Debe mostrar mensaje de estado sin resultados exacto
    const emptyStatus = page.locator('.city-search__status[role="status"]');
    await expect(emptyStatus).toBeVisible({ timeout: 10000 });
    await expect(emptyStatus).toContainText('No se encontraron ubicaciones para «Xyzabc123». Verifique la ortografía o pruebe con otro nombre.');

    // No debe existir el listbox desplegado
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).not.toBeVisible();
  });

  test('debe mostrar mensaje de validación para entradas cortas ("a") o caracteres especiales ("!!!")', async ({ page }) => {
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });

    // 4.1 Escribir "a" (menos de 2 caracteres)
    await searchInput.fill('a');

    const validationMessage = page.locator('.city-search__validation[role="status"]');
    await expect(validationMessage).toBeVisible({ timeout: 3000 });
    await expect(validationMessage).toHaveText('Ingrese al menos 2 caracteres válidos.');

    // 4.2 Probar con solo símbolos "!!!"
    await searchInput.fill('!!!');
    await expect(validationMessage).toBeVisible({ timeout: 3000 });
    await expect(validationMessage).toHaveText('Ingrese al menos 2 caracteres válidos.');
  });

  test('debe mantener la ayuda y estabilidad cuando el campo queda vacío', async ({ page }) => {
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });

    // 5. Dejar campo vacío y enviar/presionar Enter
    await searchInput.fill('');
    await searchInput.press('Enter');

    // El mensaje de ayuda base debe estar presente y no debe haber alertas de fallo no controlado
    const helpText = page.locator('.city-search__help');
    await expect(helpText).toBeVisible();
    await expect(helpText).toHaveText('Escriba al menos 2 caracteres para buscar.');

    const errorAlert = page.locator('.city-search__error[role="alert"]');
    await expect(errorAlert).not.toBeVisible();
  });

  test('debe mantener la interfaz operativa tras múltiples búsquedas consecutivas', async ({ page }) => {
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });

    // 6. Ciclo de búsquedas consecutivas
    await searchInput.fill('Bogotá');
    await page.waitForTimeout(400);

    const clearBtn = page.getByRole('button', { name: /Limpiar búsqueda/i });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(searchInput).toHaveValue('');
    await searchInput.fill('Medellín');

    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await expect(listbox.getByRole('option', { name: /Medellín/i }).first()).toBeVisible();

    // Confirmar que el shell general permanece íntegro y navegable
    await expect(page.locator('.app-shell')).toBeVisible();
  });
});
