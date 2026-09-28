# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: js\TC-JS-001\TC-JS-001.spec.ts >> TC-JS-001: Búsqueda de ciudad (RF-02) >> debe mostrar mensaje de validación para entradas cortas ("a") o caracteres especiales ("!!!")
- Location: qa\casos\js\TC-JS-001\TC-JS-001.spec.ts:99:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.city-search__validation[role="status"]')
Expected: visible
Timeout: 3000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.city-search__validation[role="status"]') with timeout 3000ms
  - waiting for locator('.city-search__validation[role="status"]')

```

```yaml
- main:
  - paragraph: Open-Meteo · Datos en tiempo local
  - heading "Observatorio del clima" [level=1]
  - paragraph: Consulta condiciones, pronósticos y registros de una ubicación.
  - region "Buscar una ciudad":
    - heading "Buscar una ciudad" [level=2]
    - text: Nombre de la ciudad
    - combobox "Nombre de la ciudad": "!!!"
    - button "Limpiar búsqueda"
    - paragraph: Escriba al menos 2 caracteres para buscar.
    - status: No se encontraron ubicaciones para «!!!». Verifique la ortografía o pruebe con otro nombre.
  - region "O use su ubicación":
    - heading "O use su ubicación" [level=2]
    - button "Usar mi ubicación"
    - paragraph: Tu ubicación se utilizará únicamente para consultar información meteorológica y no se guardará.
  - navigation "Áreas de consulta":
    - button "Clima" [pressed]
    - button "Comparar ciudades"
    - button "Históricos"
    - button "Calidad del aire"
  - paragraph: Busca una ciudad o utiliza tu ubicación para consultar el clima.
```

# Test source

```ts
  11  |  * Herramienta: Playwright
  12  |  *
  13  |  * Objetivo:
  14  |  * Verificar que la búsqueda de ciudad maneja correctamente los distintos escenarios
  15  |  * de entrada y resultados, mostrando mensajes claros y sin romper la interfaz en el ambiente desplegado.
  16  |  */
  17  | 
  18  | test.describe('TC-JS-001: Búsqueda de ciudad (RF-02)', () => {
  19  |   test.beforeEach(async ({ page }) => {
  20  |     // Monitorear que no existan errores de consola no controlados
  21  |     page.on('pageerror', (exception) => {
  22  |       console.error(`[Browser PageError] ${exception.message}`);
  23  |     });
  24  | 
  25  |     // Navegar a la página principal del ambiente desplegado
  26  |     await page.goto('/');
  27  | 
  28  |     // Asegurar que la aplicación cargó correctamente
  29  |     await expect(page).toHaveTitle(/Clima|Observatorio/i);
  30  |     const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  31  |     await expect(searchInput).toBeVisible();
  32  |   });
  33  | 
  34  |   test('debe validar la búsqueda con una ciudad válida ("Bogotá") y actualizar el clima', async ({ page }) => {
  35  |     const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  36  | 
  37  |     // 1. Escribir "Bogotá" y esperar debounce de búsqueda
  38  |     await searchInput.fill('Bogotá');
  39  | 
  40  |     // Debe mostrar la lista de resultados
  41  |     const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  42  |     await expect(listbox).toBeVisible({ timeout: 10000 });
  43  | 
  44  |     const bogotaOption = listbox.getByRole('option', { name: /Bogotá/i }).first();
  45  |     await expect(bogotaOption).toBeVisible();
  46  | 
  47  |     // Seleccionar "Bogotá"
  48  |     await bogotaOption.click();
  49  | 
  50  |     // Validar que se actualiza la sección de ubicación activa
  51  |     const activeLocationSection = page.locator('section.active-location');
  52  |     await expect(activeLocationSection).toBeVisible();
  53  |     await expect(activeLocationSection).toContainText(/Bogotá/i);
  54  | 
  55  |     // Validar que se dispara y muestra la sección de clima actual de Bogotá
  56  |     const currentWeatherTitle = page.locator('#current-weather-title');
  57  |     await expect(currentWeatherTitle).toBeVisible();
  58  |     await expect(page.locator('.current-weather__location')).toContainText(/Bogotá/i);
  59  |   });
  60  | 
  61  |   test('debe listar múltiples homónimos al escribir "San" y requerir selección', async ({ page }) => {
  62  |     const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  63  | 
  64  |     // 2. Escribir "San"
  65  |     await searchInput.fill('San');
  66  | 
  67  |     const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  68  |     await expect(listbox).toBeVisible({ timeout: 10000 });
  69  | 
  70  |     // Debe contener múltiples opciones
  71  |     const options = listbox.getByRole('option');
  72  |     await expect(options.first()).toBeVisible();
  73  |     const count = await options.count();
  74  |     expect(count).toBeGreaterThan(1);
  75  | 
  76  |     // Cada opción debe detallar región/país para distinguir homónimos
  77  |     const firstOptionRegion = options.first().locator('.city-search__option-region');
  78  |     await expect(firstOptionRegion).toBeVisible();
  79  |     const regionText = await firstOptionRegion.innerText();
  80  |     expect(regionText.length).toBeGreaterThan(0);
  81  |   });
  82  | 
  83  |   test('debe mostrar mensaje apropiado cuando no hay resultados ("Xyzabc123")', async ({ page }) => {
  84  |     const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  85  | 
  86  |     // 3. Escribir "Xyzabc123"
  87  |     await searchInput.fill('Xyzabc123');
  88  | 
  89  |     // Debe mostrar mensaje de estado sin resultados exacto
  90  |     const emptyStatus = page.locator('.city-search__status[role="status"]');
  91  |     await expect(emptyStatus).toBeVisible({ timeout: 10000 });
  92  |     await expect(emptyStatus).toContainText('No se encontraron ubicaciones para «Xyzabc123». Verifique la ortografía o pruebe con otro nombre.');
  93  | 
  94  |     // No debe existir el listbox desplegado
  95  |     const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  96  |     await expect(listbox).not.toBeVisible();
  97  |   });
  98  | 
  99  |   test('debe mostrar mensaje de validación para entradas cortas ("a") o caracteres especiales ("!!!")', async ({ page }) => {
  100 |     const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  101 | 
  102 |     // 4.1 Escribir "a" (menos de 2 caracteres)
  103 |     await searchInput.fill('a');
  104 | 
  105 |     const validationMessage = page.locator('.city-search__validation[role="status"]');
  106 |     await expect(validationMessage).toBeVisible({ timeout: 3000 });
  107 |     await expect(validationMessage).toHaveText('Ingrese al menos 2 caracteres válidos.');
  108 | 
  109 |     // 4.2 Probar con solo símbolos "!!!"
  110 |     await searchInput.fill('!!!');
> 111 |     await expect(validationMessage).toBeVisible({ timeout: 3000 });
      |                                     ^ Error: expect(locator).toBeVisible() failed
  112 |     await expect(validationMessage).toHaveText('Ingrese al menos 2 caracteres válidos.');
  113 |   });
  114 | 
  115 |   test('debe mantener la ayuda y estabilidad cuando el campo queda vacío', async ({ page }) => {
  116 |     const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  117 | 
  118 |     // 5. Dejar campo vacío y enviar/presionar Enter
  119 |     await searchInput.fill('');
  120 |     await searchInput.press('Enter');
  121 | 
  122 |     // El mensaje de ayuda base debe estar presente y no debe haber alertas de fallo no controlado
  123 |     const helpText = page.locator('.city-search__help');
  124 |     await expect(helpText).toBeVisible();
  125 |     await expect(helpText).toHaveText('Escriba al menos 2 caracteres para buscar.');
  126 | 
  127 |     const errorAlert = page.locator('.city-search__error[role="alert"]');
  128 |     await expect(errorAlert).not.toBeVisible();
  129 |   });
  130 | 
  131 |   test('debe mantener la interfaz operativa tras múltiples búsquedas consecutivas', async ({ page }) => {
  132 |     const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  133 | 
  134 |     // 6. Ciclo de búsquedas consecutivas
  135 |     await searchInput.fill('Bogotá');
  136 |     await page.waitForTimeout(400);
  137 | 
  138 |     const clearBtn = page.getByRole('button', { name: /Limpiar búsqueda/i });
  139 |     await expect(clearBtn).toBeVisible();
  140 |     await clearBtn.click();
  141 | 
  142 |     await expect(searchInput).toHaveValue('');
  143 |     await searchInput.fill('Medellín');
  144 | 
  145 |     const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  146 |     await expect(listbox).toBeVisible({ timeout: 10000 });
  147 |     await expect(listbox.getByRole('option', { name: /Medellín/i }).first()).toBeVisible();
  148 | 
  149 |     // Confirmar que el shell general permanece íntegro y navegable
  150 |     await expect(page.locator('.app-shell')).toBeVisible();
  151 |   });
  152 | });
  153 | 
```