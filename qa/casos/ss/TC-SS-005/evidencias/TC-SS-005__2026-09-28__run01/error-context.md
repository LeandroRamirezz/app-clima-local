# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ss\TC-SS-005\TC-SS-005.spec.ts >> TC-SS-005: Comparación de fecha histórica (RF-05) >> Neiva 15/09/2026: comparar contra 15/09/2025 y contra el clima actual
- Location: qa\casos\ss\TC-SS-005\TC-SS-005.spec.ts:28:3

# Error details

```
Error: La sección de históricos no ofrece un control para "Comparar" con otra fecha o con el clima actual

expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - generic [ref=e9]:
      - paragraph [ref=e10]: Open-Meteo · Datos en tiempo local
      - heading "Observatorio del clima" [level=1] [ref=e11]
    - paragraph [ref=e12]: Consulta condiciones, pronósticos y registros de una ubicación.
  - generic [ref=e13]:
    - region [ref=e14]:
      - heading "Buscar una ciudad" [level=2] [ref=e15]
      - generic [ref=e16]: Nombre de la ciudad
      - generic [ref=e17]:
        - combobox "Nombre de la ciudad" [ref=e18]: Neiva, Huila, Colombia
        - button "Limpiar búsqueda" [ref=e19] [cursor=pointer]
      - paragraph [ref=e22]: Escriba al menos 2 caracteres para buscar.
    - region [ref=e23]:
      - heading "O use su ubicación" [level=2] [ref=e24]
      - button "Usar mi ubicación" [ref=e25] [cursor=pointer]
      - paragraph [ref=e26]: Tu ubicación se utilizará únicamente para consultar información meteorológica y no se guardará.
  - status [ref=e27]:
    - generic [ref=e28]:
      - heading "Ubicación seleccionada" [level=2] [ref=e29]
      - paragraph [ref=e30]: Neiva, Huila, Colombia
    - generic [ref=e31]:
      - paragraph [ref=e32]: "Latitud: 2.93"
      - paragraph [ref=e33]: "Longitud: -75.28"
  - generic [ref=e34]:
    - navigation "Áreas de consulta" [ref=e35]:
      - button "Clima" [ref=e36] [cursor=pointer]
      - button "Comparar ciudades" [ref=e37] [cursor=pointer]
      - button "Históricos" [pressed] [ref=e38] [cursor=pointer]
      - button "Calidad del aire" [ref=e39] [cursor=pointer]
    - region [ref=e40]:
      - generic [ref=e42]:
        - paragraph [ref=e43]: Registro climático
        - heading "Históricos" [level=2] [ref=e44]
        - paragraph [ref=e45]: Consulta datos diarios de temperatura, precipitación, viento y humedad.
      - generic [ref=e46]:
        - generic [ref=e47]:
          - generic [ref=e48]: Fecha inicial
          - textbox "Fecha inicial" [ref=e49]: 2026-09-15
          - generic [ref=e50]: "Formato: DD/MM/AAAA"
        - generic [ref=e51]:
          - generic [ref=e52]: Fecha final
          - textbox "Fecha final" [ref=e53]: 2026-09-15
          - generic [ref=e54]: "Formato: DD/MM/AAAA"
        - button "Consultar histórico" [active] [ref=e55] [cursor=pointer]
      - generic [ref=e56]:
        - generic [ref=e57]:
          - generic [ref=e58]:
            - heading "Histórico — 15/09/2026" [level=3] [ref=e59]
            - paragraph [ref=e60]: Neiva, Huila, Colombia · 1 día
          - generic [ref=e61]: °C · km/h · mm
        - status [ref=e62]: Se encontraron 1 día de datos históricos.
        - region "Resultados meteorológicos históricos" [ref=e63]:
          - table [ref=e64]:
            - caption [ref=e65]: Datos meteorológicos diarios de Neiva, Huila, Colombia entre 15/09/2026
            - rowgroup [ref=e66]:
              - row [ref=e67]:
                - columnheader "Fecha" [ref=e68]
                - columnheader "Máxima" [ref=e69]
                - columnheader "Mínima" [ref=e70]
                - columnheader "Media" [ref=e71]
                - columnheader "Precipitación" [ref=e72]
                - columnheader "Viento máx." [ref=e73]
                - columnheader "Humedad media" [ref=e74]
            - rowgroup [ref=e75]:
              - row [ref=e76]:
                - rowheader "15/09/2026" [ref=e77]
                - cell "37,8 °C" [ref=e78]
                - cell "26,8 °C" [ref=e79]
                - cell "32,6 °C" [ref=e80]
                - cell "0 mm" [ref=e81]
                - cell "16,3 km/h" [ref=e82]
                - cell "40 %" [ref=e83]
```

# Test source

```ts
  1  | import fs from 'node:fs';
  2  | import path from 'node:path';
  3  | import { test, expect } from '@playwright/test';
  4  | 
  5  | /**
  6  |  * CASO DE PRUEBA: TC-SS-005
  7  |  * Nombre / Escenario: Comparación de una fecha histórica contra otra fecha histórica y contra el clima actual
  8  |  * Módulo / Endpoint: GET /v1/archive + GET /v1/forecast (RF-01)
  9  |  * Tipo de prueba: Integración
  10 |  * Prioridad: Alta
  11 |  * Diseñado por: Sara Sofía González Gómez – 2026-09-27
  12 |  * Bloque: ss
  13 |  * Herramienta: Playwright
  14 |  *
  15 |  * Objetivo:
  16 |  * Verificar que el usuario pueda comparar la fecha consultada contra otra fecha histórica o contra el
  17 |  * clima actual, y que el sistema muestre ambos conjuntos lado a lado con la diferencia por variable
  18 |  * calculada correctamente.
  19 |  */
  20 | 
  21 | const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-005__2026-09-28__run01';
  22 | const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-005', 'evidencias', RUN_ID);
  23 | 
  24 | test.describe('TC-SS-005: Comparación de fecha histórica (RF-05)', () => {
  25 |   test.use({ timezoneId: 'America/Bogota' });
  26 |   test.setTimeout(60000);
  27 | 
  28 |   test('Neiva 15/09/2026: comparar contra 15/09/2025 y contra el clima actual', async ({ page }) => {
  29 |     fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  30 | 
  31 |     const pageErrors: string[] = [];
  32 |     page.on('pageerror', (err) => pageErrors.push(err.message));
  33 |     const archiveRequests: string[] = [];
  34 |     const forecastRequests: string[] = [];
  35 |     page.on('request', (req) => {
  36 |       if (req.url().includes('archive-api.open-meteo.com/v1/archive')) archiveRequests.push(req.url());
  37 |       if (req.url().includes('api.open-meteo.com/v1/forecast')) forecastRequests.push(req.url());
  38 |     });
  39 | 
  40 |     await page.goto('/');
  41 |     const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  42 |     await searchInput.fill('Neiva');
  43 |     const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  44 |     await expect(listbox).toBeVisible({ timeout: 10000 });
  45 |     await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
  46 |     await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);
  47 | 
  48 |     await page.getByRole('button', { name: 'Históricos', exact: true }).click();
  49 |     const section = page.locator('section.historical-weather');
  50 |     await expect(section).toBeVisible();
  51 | 
  52 |     // Paso 1 (primera parte): consultar la fecha base 15/09/2026
  53 |     await page.locator('#historical-start-date').fill('2026-09-15');
  54 |     await page.locator('#historical-end-date').fill('2026-09-15');
  55 |     await page.getByRole('button', { name: 'Consultar histórico' }).click();
  56 |     await expect(section.locator('.historical-weather__results h3')).toHaveText('Histórico — 15/09/2026', { timeout: 20000 });
  57 | 
  58 |     // Inventario de los controles disponibles en la sección de históricos (evidencia)
  59 |     const controls = await section.locator('button, input, select, textarea, [role="switch"], [role="checkbox"], [role="tab"], [role="radio"]').evaluateAll((els) =>
  60 |       els.map((el) => ({
  61 |         tag: el.tagName.toLowerCase(),
  62 |         type: (el as HTMLInputElement).type || null,
  63 |         id: el.id || null,
  64 |         role: el.getAttribute('role'),
  65 |         texto_o_etiqueta: (el.getAttribute('aria-label') || (el as HTMLElement).innerText || (el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent : '') || '').trim(),
  66 |       })),
  67 |     );
  68 |     const sectionText = await section.innerText();
  69 |     const comparisonControls = section.getByRole('button', { name: /compar/i })
  70 |       .or(section.getByRole('checkbox', { name: /compar/i }))
  71 |       .or(section.getByRole('switch', { name: /compar/i }))
  72 |       .or(section.getByRole('combobox', { name: /compar/i }))
  73 |       .or(section.getByLabel(/compar|clima actual/i));
  74 |     const comparisonCount = await comparisonControls.count();
  75 | 
  76 |     await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso1-sin-control-comparar.png'), fullPage: true });
  77 |     fs.writeFileSync(
  78 |       path.join(EVIDENCE_DIR, 'inventario-controles-historicos.json'),
  79 |       JSON.stringify({
  80 |         controles_en_seccion: controls,
  81 |         controles_de_comparacion_encontrados: comparisonCount,
  82 |         texto_menciona_comparar: /compar/i.test(sectionText),
  83 |         solicitudes_archive: archiveRequests,
  84 |         solicitudes_forecast_rf01_al_seleccionar_ubicacion: forecastRequests,
  85 |       }, null, 2),
  86 |     );
  87 | 
  88 |     // Paso 1 (segunda parte): debe existir la opción "Comparar" (otra fecha / clima actual)
> 89 |     expect(comparisonCount, 'La sección de históricos no ofrece un control para "Comparar" con otra fecha o con el clima actual').toBeGreaterThan(0);
     |                                                                                                                                   ^ Error: La sección de históricos no ofrece un control para "Comparar" con otra fecha o con el clima actual
  90 | 
  91 |     // Los pasos 2 a 7 dependen del control de comparación; si existiera, se continuaría aquí.
  92 |     expect(pageErrors).toHaveLength(0);
  93 |   });
  94 | });
  95 | 
```