import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-008
 * Nombre / Escenario: Categoría del AQI en valores límite, interpretación y no dependencia exclusiva del color
 * Módulo / Endpoint: GET /v1/air-quality (respuesta interceptada)
 * Tipo de prueba: Funcional
 * Prioridad: Alta
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar, con análisis de valores límite, que cada valor de us_aqi se asigne a la categoría correcta
 * de la escala de EE. UU. (S-02), con texto, color, ícono y mensaje de salud, y que los valores fuera de
 * rango se traten según el flujo alterno.
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-008__2026-09-28__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-008', 'evidencias', RUN_ID);

const CASES: { value: number | string; category: string | null }[] = [
  { value: 0, category: 'Buena' },
  { value: 50, category: 'Buena' },
  { value: 51, category: 'Moderada' },
  { value: 100, category: 'Moderada' },
  { value: 101, category: 'Dañina para grupos sensibles' },
  { value: 150, category: 'Dañina para grupos sensibles' },
  { value: 151, category: 'Dañina' },
  { value: 200, category: 'Dañina' },
  { value: 201, category: 'Muy dañina' },
  { value: 300, category: 'Muy dañina' },
  { value: 301, category: 'Peligrosa' },
  { value: 500, category: 'Peligrosa' },
  { value: -1, category: null },
  { value: 'abc', category: null },
];
const ALL_CATEGORIES = ['Buena', 'Moderada', 'Dañina para grupos sensibles', 'Dañina', 'Muy dañina', 'Peligrosa'];

test.describe('TC-SS-008: Categoría del AQI en valores límite (RF-06, S-02)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(60000);

  for (const c of CASES) {
    test(`us_aqi = ${JSON.stringify(c.value)} → ${c.category ?? 'N/D (sin categoría)'}`, async ({ page }) => {
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      const slug = `aqi_${String(c.value).replace('-', 'menos')}`;

      const pageErrors: string[] = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      // Mock: respuesta real de /v1/air-quality con current.us_aqi reemplazado por el valor bajo prueba
      let requestUrl: string | null = null;
      await page.route('**/air-quality-api.open-meteo.com/v1/air-quality**', async (route) => {
        requestUrl = route.request().url();
        const response = await route.fetch();
        const body = await response.json();
        body.current.us_aqi = c.value;
        await route.fulfill({ response, json: body });
      });

      await page.goto('/');
      const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
      await searchInput.fill('Neiva');
      const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
      await expect(listbox).toBeVisible({ timeout: 10000 });
      await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
      await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);

      // Paso 1: cargar la sección de calidad del aire
      await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
      const section = page.locator('section.air-quality');
      const current = section.locator('.air-quality__current');
      await expect(current).toBeVisible({ timeout: 20000 });

      // Paso 2: número, categoría, ícono y mensaje
      const aqiBlock = current.locator('.air-quality__aqi');
      const hasBlock = (await aqiBlock.count()) > 0;
      const shown = {
        bloque_aqi_presente: hasBlock,
        numero: hasBlock ? (await aqiBlock.locator('strong').innerText()).trim() : null,
        categoria: hasBlock ? (await aqiBlock.locator('.air-quality__category').innerText()).trim() : null,
        mensaje: hasBlock && (await aqiBlock.locator('p').count()) > 0 ? (await aqiBlock.locator('p').innerText()).trim() : null,
        clase_color: hasBlock ? await aqiBlock.getAttribute('class') : null,
        aria_label: hasBlock ? await aqiBlock.getAttribute('aria-label') : null,
        texto_no_disponible: (await current.locator('.air-quality__unavailable').count()) > 0
          ? (await current.locator('.air-quality__unavailable').innerText()).trim() : null,
      };
      const colors = hasBlock ? await aqiBlock.evaluate((el) => {
        const s = getComputedStyle(el);
        return { fondo: s.backgroundColor, borde: s.borderColor };
      }) : null;

      // Paso 3: ícono con texto alternativo
      const icon = hasBlock ? await aqiBlock.evaluate((el) => {
        const nodes = Array.from(el.querySelectorAll('svg, img, [role="img"], i, [class*="icon"]'));
        const pseudo = [el, ...Array.from(el.querySelectorAll('*'))].flatMap((node) => ['::before', '::after'].map((p) => {
          const st = getComputedStyle(node, p);
          return (st.content && !['none', 'normal', '""'].includes(st.content)) || st.backgroundImage !== 'none' ? p : null;
        })).filter(Boolean);
        return {
          elementos: nodes.length,
          pseudo_elementos: pseudo.length,
          con_texto_alternativo: nodes.filter((n) => n.getAttribute('alt') || n.getAttribute('aria-label') || n.querySelector('title')).length,
        };
      }) : { elementos: 0, pseudo_elementos: 0, con_texto_alternativo: 0 };
      const hasIcon = icon.elementos + icon.pseudo_elementos > 0;

      await current.screenshot({ path: path.join(EVIDENCE_DIR, `${slug}.png`) });

      // Paso 4: con 151, emular acromatopsia (escala de grises)
      let grayscale: string | null = null;
      if (c.value === 151) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'achromatopsia' });
        grayscale = `${slug}__acromatopsia.png`;
        await current.screenshot({ path: path.join(EVIDENCE_DIR, grayscale) });
        await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' });
      }

      const record = {
        us_aqi_simulado: c.value,
        categoria_esperada: c.category ?? 'N/D (sin categoría)',
        solicitud: requestUrl,
        mostrado: shown,
        colores: colors,
        icono: { ...icon, presente: hasIcon },
        captura: `${slug}.png`,
        captura_escala_grises: grayscale,
        errores_consola: pageErrors,
      };
      fs.writeFileSync(path.join(EVIDENCE_DIR, `${slug}.json`), JSON.stringify(record, null, 2));

      if (c.category) {
        expect.soft(shown.numero, 'Número = us_aqi').toBe(String(c.value));
        expect.soft(shown.categoria, 'Categoría en texto').toBe(c.category);
        expect.soft(shown.mensaje?.length ?? 0, 'Mensaje de la categoría').toBeGreaterThan(0);
        expect.soft(shown.clase_color ?? '').not.toContain('--unavailable');
        expect.soft(hasIcon, 'Ícono de la categoría').toBe(true);
        expect.soft(icon.con_texto_alternativo, 'Ícono con alt/aria-label').toBeGreaterThan(0);
      } else {
        const currentText = await current.innerText();
        expect.soft(ALL_CATEGORIES.some((cat) => shown.categoria === cat), 'Sin categoría para valores fuera de rango').toBe(false);
        expect.soft(currentText, 'Debe mostrarse "N/D"').toContain('N/D');
      }
      expect(pageErrors).toHaveLength(0);
    });
  }
});
