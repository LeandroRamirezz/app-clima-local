import fs from 'node:fs';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

/**
 * CASO DE PRUEBA: TC-SS-007
 * Nombre / Escenario: Consulta de calidad del aire con datos completos (camino feliz) y coincidencia con la API
 * Módulo / Endpoint: GET /v1/air-quality
 * Tipo de prueba: Funcional
 * Prioridad: Alta
 * Diseñado por: Sara Sofía González Gómez – 2026-09-27
 * Bloque: ss
 * Herramienta: Playwright
 *
 * Objetivo:
 * Verificar que, para una ubicación con cobertura, el sistema muestre AQI (us_aqi) con su categoría,
 * PM2.5, PM10, ozono, NO₂, SO₂ y CO con unidad µg/m³ y la tendencia de las próximas 24 horas, con
 * valores 100 % iguales a la respuesta de la API (RF-06, RNF-11).
 */

const RUN_ID = process.env.QA_RUN_ID ?? 'TC-SS-007__2026-09-28__run01';
const EVIDENCE_DIR = path.join('qa', 'casos', 'ss', 'TC-SS-007', 'evidencias', RUN_ID);

const CURRENT_VARS = ['us_aqi', 'pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide'];
const POLLUTANTS = ['pm2_5', 'pm10', 'ozone', 'nitrogen_dioxide', 'sulphur_dioxide', 'carbon_monoxide'];
const UNIT_PARAMS = ['temperature_unit', 'wind_speed_unit', 'precipitation_unit'];

// Tabla de categorías US AQI de RF-06 (independiente de la implementación)
function expectedCategory(aqi: number): string {
  if (aqi >= 301) return 'Peligrosa';
  if (aqi >= 201) return 'Muy dañina';
  if (aqi >= 151) return 'Dañina';
  if (aqi >= 101) return 'Dañina para grupos sensibles';
  if (aqi >= 51) return 'Moderada';
  return 'Buena';
}

function fmt(value: unknown, fractionDigits = 1): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/D';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: fractionDigits }).format(value);
}

async function setUnits(page: Page, temperature: string, wind: string, precipitation: string) {
  await page.getByRole('button', { name: 'Clima', exact: true }).click();
  const prefs = page.locator('details.current-weather__preferences');
  await expect(prefs).toBeVisible({ timeout: 15000 });
  if (!(await prefs.evaluate((el) => (el as HTMLDetailsElement).open))) await prefs.locator('summary').first().click();
  await page.locator('#temperature-unit').selectOption(temperature);
  await page.locator('#wind-unit').selectOption(wind);
  await page.locator('#precipitation-unit').selectOption(precipitation);
}

test.describe('TC-SS-007: Calidad del aire con datos completos (RF-06, RNF-11)', () => {
  test.use({ timezoneId: 'America/Bogota' });
  test.setTimeout(90000);

  test('Bogotá: AQI, categoría, 6 contaminantes en µg/m³ y tendencia de 24 h iguales a la API', async ({ page }) => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Captura de la respuesta cruda de /v1/air-quality (equivalente a DevTools > Network)
    const calls: { url: URL; status: number; body: any; ms: number }[] = [];
    await page.route('**/air-quality-api.open-meteo.com/v1/air-quality**', async (route) => {
      const started = Date.now();
      const response = await route.fetch();
      const ms = Date.now() - started;
      const text = await response.text();
      calls.push({ url: new URL(route.request().url()), status: response.status(), body: JSON.parse(text), ms });
      await route.fulfill({ response, body: text });
    });

    await page.goto('/');
    const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
    await searchInput.fill('Bogotá');
    const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
    await expect(listbox).toBeVisible({ timeout: 10000 });
    await listbox.getByRole('option', { name: /Bogotá.*Colombia/i }).first().click();
    await expect(page.locator('section.active-location')).toContainText(/Bogotá/i);

    // Precondición: unidades en °F / mph / in
    await setUnits(page, 'fahrenheit', 'mph', 'inch');

    // Paso 1: abrir la sección de calidad del aire
    await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
    const section = page.locator('section.air-quality');
    const aqiBlock = section.locator('.air-quality__aqi');
    await expect(aqiBlock).toBeVisible({ timeout: 20000 });
    expect(calls.length).toBeGreaterThan(0);
    const call = calls[calls.length - 1];
    const api = call.body;

    // Paso 2: parámetros de la solicitud
    const params = call.url.searchParams;
    const currentParam = params.get('current')?.split(',') ?? [];
    const hourlyParam = params.get('hourly')?.split(',') ?? [];

    // Paso 3: AQI y categoría
    const aqiShown = (await aqiBlock.locator('strong').innerText()).trim();
    const categoryShown = (await aqiBlock.locator('.air-quality__category').innerText()).trim();
    const messageShown = (await aqiBlock.locator('p').innerText().catch(() => '')).trim();
    const aqiClass = (await aqiBlock.getAttribute('class')) ?? '';
    const aqiAriaLabel = (await aqiBlock.getAttribute('aria-label')) ?? '';
    const aqiColors = await aqiBlock.evaluate((el) => {
      const s = getComputedStyle(el);
      return { fondo: s.backgroundColor, borde: s.borderColor, texto: s.color };
    });
    // Ícono: svg/img/role=img dentro del indicador, o contenido gráfico en ::before/::after
    const icon = await aqiBlock.evaluate((el) => {
      const nodes = el.querySelectorAll('svg, img, [role="img"], i, [class*="icon"]');
      const pseudo = [el, ...Array.from(el.querySelectorAll('*'))].flatMap((node) => ['::before', '::after'].map((p) => {
        const content = getComputedStyle(node, p).content;
        const bg = getComputedStyle(node, p).backgroundImage;
        return (content && content !== 'none' && content !== 'normal' && content !== '""') || (bg && bg !== 'none') ? `${node.className}${p}: ${content} ${bg}` : null;
      })).filter(Boolean);
      return { elementos_icono: nodes.length, pseudo_elementos_con_contenido: pseudo };
    });
    const hasIcon = icon.elementos_icono > 0 || icon.pseudo_elementos_con_contenido.length > 0;

    // Paso 4: contaminantes y unidades
    const pollutantValues = (await section.locator('.air-quality__pollutant dd').allInnerTexts()).map((t) => t.trim());
    const expectedPollutants = POLLUTANTS.map((v) => `${fmt(api.current[v])} ${api.current_units[v]}`);

    // Paso 5: tendencia de 24 h
    const hours = section.locator('.air-quality__hour');
    const hourCount = await hours.count();
    const trendShown: { time: string | null; aqi: string }[] = [];
    for (let i = 0; i < hourCount; i += 1) {
      trendShown.push({
        time: await hours.nth(i).locator('time').getAttribute('datetime'),
        aqi: (await hours.nth(i).locator('.air-quality__hour-aqi').innerText()).trim(),
      });
    }
    const currentHour = String(api.current.time).slice(0, 13);
    const startIndex = api.hourly.time.findIndex((t: string) => t.slice(0, 13) === currentHour);
    const expectedTrend = api.hourly.time.slice(startIndex, startIndex + 24).map((t: string, i: number) => ({
      time: t,
      aqi: `AQI: ${fmt(api.hourly.us_aqi[startIndex + i], 0)}`,
    }));

    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso1-5-calidad-aire-unidades-imperiales.png'), fullPage: true });
    await aqiBlock.screenshot({ path: path.join(EVIDENCE_DIR, 'paso3-indicador-aqi.png') });

    // Paso 6: cambiar a °C / km/h / mm y verificar que los contaminantes no cambian
    const uiImperial = { aqi: aqiShown, contaminantes: pollutantValues, tendencia: trendShown };
    await setUnits(page, 'celsius', 'kmh', 'mm');
    const callsBefore = calls.length;
    await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
    await expect(aqiBlock).toBeVisible({ timeout: 20000 });
    await expect.poll(() => calls.length).toBeGreaterThan(callsBefore);
    const call2 = calls[calls.length - 1];
    const uiMetric = {
      aqi: (await aqiBlock.locator('strong').innerText()).trim(),
      contaminantes: (await section.locator('.air-quality__pollutant dd').allInnerTexts()).map((t) => t.trim()),
    };
    const sameApiHour = call2.body.current.time === api.current.time;
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso6-calidad-aire-unidades-metricas.png'), fullPage: true });

    const summary = {
      solicitud: {
        url: call.url.toString(),
        http: call.status,
        tiempo_respuesta_ms: call.ms,
        current: currentParam,
        hourly: hourlyParam,
        timezone: params.get('timezone'),
        parametros_de_unidades: UNIT_PARAMS.filter((p) => params.has(p)),
      },
      aqi: {
        api: api.current.us_aqi,
        mostrado: aqiShown,
        categoria_esperada: expectedCategory(api.current.us_aqi),
        categoria_mostrada: categoryShown,
        mensaje_mostrado: messageShown,
        clase_color: aqiClass,
        colores_calculados: aqiColors,
        aria_label: aqiAriaLabel,
        icono: { ...icon, presente: hasIcon },
      },
      contaminantes: POLLUTANTS.map((v, i) => ({
        variable: v,
        api: api.current[v],
        unidad_api: api.current_units[v],
        esperado: expectedPollutants[i],
        mostrado: pollutantValues[i],
        coincide: expectedPollutants[i] === pollutantValues[i],
      })),
      tendencia: {
        hora_actual_api: api.current.time,
        puntos_mostrados: hourCount,
        coincide_con_hourly_us_aqi: JSON.stringify(trendShown) === JSON.stringify(expectedTrend),
        mostrada: trendShown,
        esperada: expectedTrend,
      },
      cambio_de_unidades: {
        ui_con_F_mph_in: uiImperial,
        ui_con_C_kmh_mm: uiMetric,
        segunda_solicitud_sin_parametros_de_unidades: UNIT_PARAMS.every((p) => !call2.url.searchParams.has(p)),
        misma_hora_api: sameApiHour,
        valores_iguales: uiMetric.aqi === uiImperial.aqi && JSON.stringify(uiMetric.contaminantes) === JSON.stringify(uiImperial.contaminantes),
      },
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'respuesta-cruda-air-quality.json'), JSON.stringify({ url: call.url.toString(), status: call.status, body: api }, null, 2));
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'resumen-calidad-aire.json'), JSON.stringify(summary, null, 2));

    // Verificaciones
    expect.soft(call.status).toBe(200);
    expect.soft(currentParam.sort()).toEqual([...CURRENT_VARS].sort());
    expect.soft(hourlyParam).toEqual(expect.arrayContaining(['us_aqi', 'pm2_5', 'pm10']));
    expect.soft(params.get('timezone')).toBe('auto');
    expect.soft(summary.solicitud.parametros_de_unidades, 'La solicitud no debe incluir parámetros de unidades').toEqual([]);
    expect.soft(aqiShown, 'AQI = current.us_aqi').toBe(fmt(api.current.us_aqi, 0));
    expect.soft(categoryShown, 'Categoría según tabla RF-06').toBe(expectedCategory(api.current.us_aqi));
    expect.soft(messageShown.length, 'Mensaje de la categoría').toBeGreaterThan(0);
    expect.soft(aqiClass).toMatch(/air-quality__aqi--(good|moderate|unhealthy-sensitive|unhealthy|very-unhealthy|hazardous)/);
    expect.soft(pollutantValues, 'Contaminantes = current.*').toEqual(expectedPollutants);
    for (const value of pollutantValues) expect.soft(value).toMatch(/[µμ]g\/m³$/);
    expect.soft(hourCount, 'Tendencia de 24 puntos').toBe(24);
    expect.soft(trendShown, 'Tendencia = hourly.us_aqi desde la hora actual').toEqual(expectedTrend);
    expect.soft(summary.cambio_de_unidades.segunda_solicitud_sin_parametros_de_unidades).toBe(true);
    if (sameApiHour) expect.soft(summary.cambio_de_unidades.valores_iguales, 'Valores sin cambio con °C/km/h/mm').toBe(true);
    expect.soft(hasIcon, 'RF-06: la categoría debe comunicarse también con un ícono').toBe(true);
    expect(pageErrors).toHaveLength(0);
  });
});
