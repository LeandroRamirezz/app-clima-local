import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenciasDir = path.join(__dirname, 'evidencias', 'TC-JC-013__2026-09-28__run01');

/**
 * CASO DE PRUEBA: TC-JC-013
 * Requerimiento: RNF-02, S-11 (Tiempo de carga inicial FCP < 3 s)
 * Diseñado por: Juan Camilo La Rotta - 27/09/2026
 */
test.describe('TC-JC-013: Tiempo de carga inicial (FCP) < 3 s', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(evidenciasDir)) {
      fs.mkdirSync(evidenciasDir, { recursive: true });
    }
  });

  test('Medición de FCP en 3 ejecuciones con throttling 4G simulado y viewport móvil', async ({ browser }) => {
    const fcpResults: number[] = [];
    const runs = 3;

    for (let i = 1; i <= runs; i++) {
      // Crear nuevo contexto emulando dispositivo móvil (Viewport 390x844)
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
      });

      const page = await context.newPage();

      // Emular perfil de red 4G utilizando Chrome DevTools Protocol (CDP)
      const client = await context.newCDPSession(page);
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: (4 * 1024 * 1024) / 8, // 4 Mbps
        uploadThroughput: (3 * 1024 * 1024) / 8,   // 3 Mbps
        latency: 40,                               // 40 ms RTT (4G)
      });

      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Extraer métricas de pintura desde la Navigation/Paint Timing API del navegador
      const fcpMs = await page.evaluate(() => {
        const entry = performance.getEntriesByName('first-contentful-paint')[0];
        if (entry) return entry.startTime;
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find((e) => e.name === 'first-contentful-paint');
        return fcp ? fcp.startTime : null;
      });

      // Si el navegador soporta Paint Timing, usar fcpMs; de lo contrario usar loadTime como fallback conservador
      const measuredFcp = fcpMs ?? loadTime;
      fcpResults.push(measuredFcp);

      console.log(`[Run ${i}] FCP medido: ${measuredFcp.toFixed(2)} ms (${(measuredFcp / 1000).toFixed(2)} s)`);

      // Tomar captura de pantalla de evidencia para cada ejecución
      await page.screenshot({
        path: path.join(evidenciasDir, `0${i}_run_0${i}_fcp.png`),
        fullPage: true,
      });

      await context.close();
    }

    // Calcular promedio de las 3 ejecuciones
    const sum = fcpResults.reduce((acc, val) => acc + val, 0);
    const avgFcpMs = sum / fcpResults.length;
    const avgFcpS = avgFcpMs / 1000;

    console.log(`=== RESULTADO TC-JC-013 ===`);
    console.log(`Ejecuciones (ms): ${fcpResults.map((v) => v.toFixed(2)).join(', ')}`);
    console.log(`Promedio FCP: ${avgFcpMs.toFixed(2)} ms (${avgFcpS.toFixed(2)} s)`);

    // Guardar resumen de mediciones en archivo auxiliar JSON
    fs.writeFileSync(
      path.join(evidenciasDir, 'mediciones_fcp.json'),
      JSON.stringify(
        {
          ejecuciones_ms: fcpResults,
          promedio_ms: avgFcpMs,
          promedio_s: avgFcpS,
          cumple_criterio: avgFcpMs < 3000,
        },
        null,
        2
      )
    );

    // Criterio de Aceptación: FCP Promedio < 3000 ms (3 segundos)
    expect(avgFcpMs).toBeLessThan(3000);
  });
});
