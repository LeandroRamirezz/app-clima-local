# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ss\TC-SS-012\TC-SS-012.spec.ts >> TC-SS-012: Propagación del cambio de unidades (RF-10, RF-04, RF-05) >> Neiva: °C/km/h/mm → °F/mph/in en clima, pronóstico, comparación e histórico; error 500 al reconsultar
- Location: qa\casos\ss\TC-SS-012\TC-SS-012.spec.ts:56:3

# Error details

```
Error: Histórico conserva la fecha 15/09/2026

expect(received).toBe(expected) // Object.is equality

Expected: "2026-09-15|2026-09-15"
Received: "2026-09-18|2026-09-24"
```

```
Error: Reconsulta de /v1/archive con °F/mph/in

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Histórico visible para 15/09/2026

expect(received).toBe(expected) // Object.is equality

Expected: "Histórico — 15/09/2026"
Received: null
```

```
Error: Se conservan los últimos datos

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

```
Error: Últimos datos rotulados en °C

expect(received).toBe(expected) // Object.is equality

Expected: "24,6 °C"
Received: null
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
      - button "Clima" [pressed] [ref=e36] [cursor=pointer]
      - button "Comparar ciudades" [ref=e37] [cursor=pointer]
      - button "Históricos" [ref=e38] [cursor=pointer]
      - button "Calidad del aire" [ref=e39] [cursor=pointer]
    - generic [ref=e40]:
      - generic [ref=e41]:
        - generic [ref=e42]: Días de pronóstico
        - spinbutton "Días de pronóstico" [ref=e43]: "7"
      - group "Vista del pronóstico" [ref=e44]:
        - generic [ref=e45]: Vista
        - generic [ref=e46]:
          - button "Diario" [pressed] [ref=e47] [cursor=pointer]
          - button "Horario" [ref=e48] [cursor=pointer]
    - group "Preferencias del pronóstico" [ref=e49]:
      - generic "Preferencias del pronóstico Automático" [active] [ref=e50] [cursor=pointer]: Preferencias del pronóstico · Automático
      - generic [ref=e51]:
        - group "Unidades" [ref=e52]:
          - generic [ref=e54]:
            - generic [ref=e55]:
              - generic [ref=e56]: Temperatura
              - combobox "Temperatura" [ref=e57]:
                - option "°C"
                - option "°F" [selected]
            - generic [ref=e58]:
              - generic [ref=e59]: Viento
              - combobox "Viento" [ref=e60]:
                - option "km/h" [selected]
                - option "mph"
            - generic [ref=e61]:
              - generic [ref=e62]: Precipitación
              - combobox "Precipitación" [ref=e63]:
                - option "mm" [selected]
                - option "in"
        - generic [ref=e64]:
          - group [ref=e65]:
            - generic "Opciones avanzadas" [ref=e66] [cursor=pointer]
            - option "Automático" [selected]
            - option "ICON"
            - option "GFS"
            - option "ECMWF"
          - paragraph [ref=e67]: "Modelo: Automático"
    - alert [ref=e68]:
      - generic [ref=e69]: El servicio meteorológico no está disponible en este momento. Intente más tarde.
      - button "Reintentar" [ref=e70] [cursor=pointer]
```

# Test source

```ts
  127 |       sensacion: await comparisonRow(page, 'Sensación térmica'),
  128 |       precipitacion: await comparisonRow(page, 'Precipitación'),
  129 |       viento: await comparisonRow(page, 'Viento'),
  130 |     };
  131 |     await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso1-3-comparacion-fahrenheit.png'), fullPage: true });
  132 |     const cmpRequests = forecast.filter((r) => r.t >= changeAt && unitsOf(r.url) === 'fahrenheit/mph/inch');
  133 |     const cmpExpected = cmpRequests.slice(-2).map((r) => ({
  134 |       lat: r.url.searchParams.get('latitude'),
  135 |       temperatura: `${fmt(r.body?.current?.temperature_2m)} °F`,
  136 |       viento: `${fmt(r.body?.current?.wind_speed_10m)} mph`,
  137 |       precipitacion: `${fmt(r.body?.current?.precipitation)} in`,
  138 |     }));
  139 | 
  140 |     // ---- Clima actual y pronóstico (al volver a la pestaña Clima)
  141 |     const climaAt = Date.now();
  142 |     await page.getByRole('button', { name: 'Clima', exact: true }).click();
  143 |     await expect(page.locator('.current-weather__temperature strong')).toContainText('°F', { timeout: 15000 });
  144 |     const climaUpdateMs = Date.now() - climaAt;
  145 |     const climaReq = forecast.filter((r) => r.t >= climaAt && unitsOf(r.url) === 'fahrenheit/mph/inch').at(-1);
  146 |     const clima = {
  147 |       ubicacion: (await page.locator('section.active-location').innerText()).replace(/\s+/g, ' ').trim(),
  148 |       temperatura: (await page.locator('.current-weather__temperature strong').innerText()).trim(),
  149 |       esperado_temperatura: climaReq ? `${fmt(climaReq.body.current.temperature_2m)} °F` : null,
  150 |       pronostico_max: (await page.locator('.forecast-panel__day').first().locator('.forecast-panel__metrics div').first().locator('dd').innerText()).trim(),
  151 |       esperado_pronostico_max: climaReq ? `${fmt(climaReq.body.daily.temperature_2m_max[0])} °F` : null,
  152 |       texto_panel: await page.locator('.current-weather__card').innerText() + '\n' + await page.locator('.forecast-panel__days').innerText(),
  153 |     };
  154 |     await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso1-3-clima-y-pronostico-fahrenheit.png'), fullPage: true });
  155 | 
  156 |     // ---- Histórico (al volver a la pestaña Históricos)
  157 |     const histAt = Date.now();
  158 |     await page.getByRole('button', { name: 'Históricos', exact: true }).click();
  159 |     await expect(page.locator('section.historical-weather')).toBeVisible();
  160 |     await page.waitForTimeout(2000);
  161 |     const hist = {
  162 |       fecha_inicial: await page.locator('#historical-start-date').inputValue(),
  163 |       fecha_final: await page.locator('#historical-end-date').inputValue(),
  164 |       resultados_visibles: (await page.locator('.historical-weather__results').count()) > 0,
  165 |       encabezado: (await page.locator('.historical-weather__results h3').count()) > 0 ? (await page.locator('.historical-weather__results h3').innerText()).trim() : null,
  166 |       valores: (await page.locator('.historical-weather__table tbody tr td').allInnerTexts()).map((t) => t.trim()),
  167 |       solicitudes_archive_tras_cambio: archive.filter((r) => r.t >= changeAt).map((r) => ({ start_date: r.url.searchParams.get('start_date'), unidades: unitsOf(r.url), http: r.status })),
  168 |       tiempo_desde_apertura_ms: Date.now() - histAt,
  169 |     };
  170 |     await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso4-historico-tras-cambio.png'), fullPage: true });
  171 | 
  172 |     // ---- Pasos 5 y 6: volver a °C/km/h/mm, HTTP 500 en la reconsulta y cambiar a °F
  173 |     await page.getByRole('button', { name: 'Clima', exact: true }).click();
  174 |     await setUnits(page, 'celsius', 'kmh', 'mm');
  175 |     await expect(page.locator('.current-weather__temperature strong')).toContainText('°C', { timeout: 15000 });
  176 |     const celsiusShown = (await page.locator('.current-weather__temperature strong').innerText()).trim();
  177 |     fail500OnFahrenheit = true;
  178 |     const errorAt = Date.now();
  179 |     await page.locator('#temperature-unit').selectOption('fahrenheit');
  180 |     const alert = page.locator('.current-weather__error[role="alert"]');
  181 |     await expect(alert).toBeVisible({ timeout: 15000 });
  182 |     const err = {
  183 |       tiempo_hasta_error_ms: Date.now() - errorAt,
  184 |       solicitud_fallida: forecast.filter((r) => r.t >= errorAt).map((r) => ({ unidades: unitsOf(r.url), http: r.status })),
  185 |       mensaje: (await alert.locator('span').innerText()).trim(),
  186 |       boton_reintentar: await alert.getByRole('button', { name: 'Reintentar' }).isVisible(),
  187 |       tarjeta_clima_visible: await page.locator('.current-weather__card').isVisible(),
  188 |       pronostico_visible: (await page.locator('.forecast-panel__day').count()) > 0,
  189 |       temperatura_visible: (await page.locator('.current-weather__temperature strong').count()) > 0 ? (await page.locator('.current-weather__temperature strong').innerText()).trim() : null,
  190 |       ultima_temperatura_en_celsius: celsiusShown,
  191 |       selector_temperatura: await page.locator('#temperature-unit').inputValue(),
  192 |     };
  193 |     await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso5-6-error-500-reconsulta.png'), fullPage: true });
  194 |     fail500OnFahrenheit = false;
  195 | 
  196 |     const summary = {
  197 |       precondiciones: { clima_celsius: climateBefore, historico_celsius: historyBefore, ciudades_comparadas: comparisonCities },
  198 |       comparacion: { ...cmp, esperado_por_solicitud: cmpExpected, solicitudes_fahrenheit: cmpRequests.map((r) => r.url.searchParams.get('latitude')), tiempo_actualizacion_ms: comparisonUpdateMs },
  199 |       clima: { ...clima, texto_panel: undefined, unidades_celsius_visibles: /°C/.test(clima.texto_panel), tiempo_actualizacion_ms: climaUpdateMs, solicitud: climaReq?.url.toString() ?? null },
  200 |       historico: hist,
  201 |       error_reconsulta: err,
  202 |       errores_consola: pageErrors,
  203 |     };
  204 |     fs.writeFileSync(path.join(EVIDENCE_DIR, 'resumen-propagacion-unidades.json'), JSON.stringify(summary, null, 2));
  205 | 
  206 |     // Comparación
  207 |     expect.soft(cmp.ciudades, 'Comparación conserva sus ciudades').toEqual(comparisonCities);
  208 |     expect.soft(cmpRequests.length, 'Reconsulta de cada ciudad con °F/mph/in').toBeGreaterThanOrEqual(2);
  209 |     expect.soft(cmp.temperatura, 'Comparación = API').toEqual(cmpExpected.map((e) => e.temperatura));
  210 |     expect.soft(cmp.viento.every((v) => v.endsWith('mph'))).toBe(true);
  211 |     expect.soft(cmp.precipitacion.every((v) => v.endsWith('in'))).toBe(true);
  212 |     expect.soft(comparisonUpdateMs, 'Comparación actualizada < 2 s').toBeLessThan(2000);
  213 |     // Clima y pronóstico
  214 |     expect.soft(clima.ubicacion).toContain('Neiva, Huila');
  215 |     expect.soft(clima.temperatura).toBe(clima.esperado_temperatura);
  216 |     expect.soft(clima.pronostico_max).toBe(clima.esperado_pronostico_max);
  217 |     expect.soft(summary.clima.unidades_celsius_visibles, 'Sin °C en clima').toBe(false);
  218 |     expect.soft(climaUpdateMs, 'Clima actualizado < 2 s').toBeLessThan(2000);
  219 |     // Histórico
  220 |     expect.soft(`${hist.fecha_inicial}|${hist.fecha_final}`, 'Histórico conserva la fecha 15/09/2026').toBe('2026-09-15|2026-09-15');
  221 |     expect.soft(hist.solicitudes_archive_tras_cambio.some((r) => r.start_date === '2026-09-15' && r.unidades === 'fahrenheit/mph/inch'), 'Reconsulta de /v1/archive con °F/mph/in').toBe(true);
  222 |     expect.soft(hist.encabezado, 'Histórico visible para 15/09/2026').toBe('Histórico — 15/09/2026');
  223 |     // Error al reconsultar
  224 |     expect.soft(err.mensaje).toBe(E05);
  225 |     expect.soft(err.boton_reintentar).toBe(true);
  226 |     expect.soft(err.tarjeta_clima_visible, 'Se conservan los últimos datos').toBe(true);
> 227 |     expect.soft(err.temperatura_visible, 'Últimos datos rotulados en °C').toBe(celsiusShown);
      |                                                                           ^ Error: Últimos datos rotulados en °C
  228 |     expect(pageErrors).toHaveLength(0);
  229 |   });
  230 | });
  231 | 
```