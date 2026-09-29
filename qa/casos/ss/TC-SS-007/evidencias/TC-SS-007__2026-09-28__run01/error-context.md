# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ss\TC-SS-007\TC-SS-007.spec.ts >> TC-SS-007: Calidad del aire con datos completos (RF-06, RNF-11) >> Bogotá: AQI, categoría, 6 contaminantes en µg/m³ y tendencia de 24 h iguales a la API
- Location: qa\casos\ss\TC-SS-007\TC-SS-007.spec.ts:57:3

# Error details

```
Error: RF-06: la categoría debe comunicarse también con un ícono

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
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
        - combobox "Nombre de la ciudad" [ref=e18]: Bogotá, Bogotá D.C., Colombia
        - button "Limpiar búsqueda" [ref=e19] [cursor=pointer]
      - paragraph [ref=e22]: Escriba al menos 2 caracteres para buscar.
    - region [ref=e23]:
      - heading "O use su ubicación" [level=2] [ref=e24]
      - button "Usar mi ubicación" [ref=e25] [cursor=pointer]
      - paragraph [ref=e26]: Tu ubicación se utilizará únicamente para consultar información meteorológica y no se guardará.
  - status [ref=e27]:
    - generic [ref=e28]:
      - heading "Ubicación seleccionada" [level=2] [ref=e29]
      - paragraph [ref=e30]: Bogotá, Bogotá D.C., Colombia
    - generic [ref=e31]:
      - paragraph [ref=e32]: "Latitud: 4.61"
      - paragraph [ref=e33]: "Longitud: -74.08"
  - generic [ref=e34]:
    - navigation "Áreas de consulta" [ref=e35]:
      - button "Clima" [ref=e36] [cursor=pointer]
      - button "Comparar ciudades" [ref=e37] [cursor=pointer]
      - button "Históricos" [ref=e38] [cursor=pointer]
      - button "Calidad del aire" [active] [pressed] [ref=e39] [cursor=pointer]
    - region [ref=e40]:
      - generic [ref=e42]:
        - paragraph [ref=e43]: Atmósfera
        - heading "Calidad del aire" [level=2] [ref=e44]
        - paragraph [ref=e45]: Bogotá, Bogotá D.C., Colombia
      - generic [ref=e46]:
        - 'group "Índice de calidad del aire: 58, categoría Moderada." [ref=e47]':
          - generic [ref=e48]: Índice de calidad del aire · US AQI
          - strong [ref=e49]: "58"
          - generic [ref=e50]: Moderada
          - paragraph [ref=e51]: La escala US AQI clasifica esta lectura dentro del rango moderado.
        - generic "Concentraciones actuales de contaminantes" [ref=e52]:
          - generic [ref=e53]:
            - term [ref=e54]:
              - generic [ref=e55]: PM2.5
              - generic [ref=e56]: Partículas finas
            - definition [ref=e57]: 42,3 μg/m³
          - generic [ref=e58]:
            - term [ref=e59]:
              - generic [ref=e60]: PM10
              - generic [ref=e61]: Partículas inhalables
            - definition [ref=e62]: 42,6 μg/m³
          - generic [ref=e63]:
            - term [ref=e64]:
              - generic [ref=e65]: Ozono (O₃)
              - generic [ref=e66]: Ozono
            - definition [ref=e67]: 12 μg/m³
          - generic [ref=e68]:
            - term [ref=e69]:
              - generic [ref=e70]: Dióxido de nitrógeno (NO₂)
              - generic [ref=e71]: Dióxido de nitrógeno
            - definition [ref=e72]: 37,7 μg/m³
          - generic [ref=e73]:
            - term [ref=e74]:
              - generic [ref=e75]: Dióxido de azufre (SO₂)
              - generic [ref=e76]: Dióxido de azufre
            - definition [ref=e77]: 32,3 μg/m³
          - generic [ref=e78]:
            - term [ref=e79]:
              - generic [ref=e80]: Monóxido de carbono (CO)
              - generic [ref=e81]: Monóxido de carbono
            - definition [ref=e82]: 1.457 μg/m³
      - paragraph [ref=e83]: El índice es información general y no constituye un diagnóstico ni consejo médico.
      - region [ref=e84]:
        - heading "Tendencia para las próximas 24 horas" [level=3] [ref=e85]
        - list [ref=e86]:
          - listitem [ref=e87]:
            - heading [level=4] [ref=e88]:
              - time [ref=e89]: 23:00
            - paragraph [ref=e90]: "AQI: 58"
            - paragraph [ref=e91]: Moderada
            - generic [ref=e92]:
              - generic [ref=e93]:
                - term [ref=e94]: PM2.5
                - definition [ref=e95]: 42,3 μg/m³
              - generic [ref=e96]:
                - term [ref=e97]: PM10
                - definition [ref=e98]: 42,6 μg/m³
          - listitem [ref=e99]:
            - heading [level=4] [ref=e100]:
              - time [ref=e101]: 00:00
            - paragraph [ref=e102]: "AQI: 59"
            - paragraph [ref=e103]: Moderada
            - generic [ref=e104]:
              - generic [ref=e105]:
                - term [ref=e106]: PM2.5
                - definition [ref=e107]: 41,4 μg/m³
              - generic [ref=e108]:
                - term [ref=e109]: PM10
                - definition [ref=e110]: 41,6 μg/m³
          - listitem [ref=e111]:
            - heading [level=4] [ref=e112]:
              - time [ref=e113]: 01:00
            - paragraph [ref=e114]: "AQI: 61"
            - paragraph [ref=e115]: Moderada
            - generic [ref=e116]:
              - generic [ref=e117]:
                - term [ref=e118]: PM2.5
                - definition [ref=e119]: 33,9 μg/m³
              - generic [ref=e120]:
                - term [ref=e121]: PM10
                - definition [ref=e122]: 34,1 μg/m³
          - listitem [ref=e123]:
            - heading [level=4] [ref=e124]:
              - time [ref=e125]: 02:00
            - paragraph [ref=e126]: "AQI: 63"
            - paragraph [ref=e127]: Moderada
            - generic [ref=e128]:
              - generic [ref=e129]:
                - term [ref=e130]: PM2.5
                - definition [ref=e131]: 25 μg/m³
              - generic [ref=e132]:
                - term [ref=e133]: PM10
                - definition [ref=e134]: 25,1 μg/m³
          - listitem [ref=e135]:
            - heading [level=4] [ref=e136]:
              - time [ref=e137]: 03:00
            - paragraph [ref=e138]: "AQI: 64"
            - paragraph [ref=e139]: Moderada
            - generic [ref=e140]:
              - generic [ref=e141]:
                - term [ref=e142]: PM2.5
                - definition [ref=e143]: 20,2 μg/m³
              - generic [ref=e144]:
                - term [ref=e145]: PM10
                - definition [ref=e146]: 20,3 μg/m³
          - listitem [ref=e147]:
            - heading [level=4] [ref=e148]:
              - time [ref=e149]: 04:00
            - paragraph [ref=e150]: "AQI: 65"
            - paragraph [ref=e151]: Moderada
            - generic [ref=e152]:
              - generic [ref=e153]:
                - term [ref=e154]: PM2.5
                - definition [ref=e155]: 13,9 μg/m³
              - generic [ref=e156]:
                - term [ref=e157]: PM10
                - definition [ref=e158]: 13,9 μg/m³
          - listitem [ref=e159]:
            - heading [level=4] [ref=e160]:
              - time [ref=e161]: 05:00
            - paragraph [ref=e162]: "AQI: 65"
            - paragraph [ref=e163]: Moderada
            - generic [ref=e164]:
              - generic [ref=e165]:
                - term [ref=e166]: PM2.5
                - definition [ref=e167]: 10,6 μg/m³
              - generic [ref=e168]:
                - term [ref=e169]: PM10
                - definition [ref=e170]: 10,7 μg/m³
          - listitem [ref=e171]:
            - heading [level=4] [ref=e172]:
              - time [ref=e173]: 06:00
            - paragraph [ref=e174]: "AQI: 65"
            - paragraph [ref=e175]: Moderada
            - generic [ref=e176]:
              - generic [ref=e177]:
                - term [ref=e178]: PM2.5
                - definition [ref=e179]: 10,9 μg/m³
              - generic [ref=e180]:
                - term [ref=e181]: PM10
                - definition [ref=e182]: 11 μg/m³
          - listitem [ref=e183]:
            - heading [level=4] [ref=e184]:
              - time [ref=e185]: 07:00
            - paragraph [ref=e186]: "AQI: 65"
            - paragraph [ref=e187]: Moderada
            - generic [ref=e188]:
              - generic [ref=e189]:
                - term [ref=e190]: PM2.5
                - definition [ref=e191]: 12,7 μg/m³
              - generic [ref=e192]:
                - term [ref=e193]: PM10
                - definition [ref=e194]: 12,7 μg/m³
          - listitem [ref=e195]:
            - heading [level=4] [ref=e196]:
              - time [ref=e197]: 08:00
            - paragraph [ref=e198]: "AQI: 65"
            - paragraph [ref=e199]: Moderada
            - generic [ref=e200]:
              - generic [ref=e201]:
                - term [ref=e202]: PM2.5
                - definition [ref=e203]: 14,9 μg/m³
              - generic [ref=e204]:
                - term [ref=e205]: PM10
                - definition [ref=e206]: 15,1 μg/m³
          - listitem [ref=e207]:
            - heading [level=4] [ref=e208]:
              - time [ref=e209]: 09:00
            - paragraph [ref=e210]: "AQI: 65"
            - paragraph [ref=e211]: Moderada
            - generic [ref=e212]:
              - generic [ref=e213]:
                - term [ref=e214]: PM2.5
                - definition [ref=e215]: 6,8 μg/m³
              - generic [ref=e216]:
                - term [ref=e217]: PM10
                - definition [ref=e218]: 7,2 μg/m³
          - listitem [ref=e219]:
            - heading [level=4] [ref=e220]:
              - time [ref=e221]: 10:00
            - paragraph [ref=e222]: "AQI: 65"
            - paragraph [ref=e223]: Moderada
            - generic [ref=e224]:
              - generic [ref=e225]:
                - term [ref=e226]: PM2.5
                - definition [ref=e227]: 5,1 μg/m³
              - generic [ref=e228]:
                - term [ref=e229]: PM10
                - definition [ref=e230]: 5,6 μg/m³
          - listitem [ref=e231]:
            - heading [level=4] [ref=e232]:
              - time [ref=e233]: 11:00
            - paragraph [ref=e234]: "AQI: 65"
            - paragraph [ref=e235]: Moderada
            - generic [ref=e236]:
              - generic [ref=e237]:
                - term [ref=e238]: PM2.5
                - definition [ref=e239]: 4,4 μg/m³
              - generic [ref=e240]:
                - term [ref=e241]: PM10
                - definition [ref=e242]: 4,8 μg/m³
          - listitem [ref=e243]:
            - heading [level=4] [ref=e244]:
              - time [ref=e245]: 12:00
            - paragraph [ref=e246]: "AQI: 65"
            - paragraph [ref=e247]: Moderada
            - generic [ref=e248]:
              - generic [ref=e249]:
                - term [ref=e250]: PM2.5
                - definition [ref=e251]: 4,4 μg/m³
              - generic [ref=e252]:
                - term [ref=e253]: PM10
                - definition [ref=e254]: 4,8 μg/m³
          - listitem [ref=e255]:
            - heading [level=4] [ref=e256]:
              - time [ref=e257]: 13:00
            - paragraph [ref=e258]: "AQI: 65"
            - paragraph [ref=e259]: Moderada
            - generic [ref=e260]:
              - generic [ref=e261]:
                - term [ref=e262]: PM2.5
                - definition [ref=e263]: 4,5 μg/m³
              - generic [ref=e264]:
                - term [ref=e265]: PM10
                - definition [ref=e266]: 4,9 μg/m³
          - listitem [ref=e267]:
            - heading [level=4] [ref=e268]:
              - time [ref=e269]: 14:00
            - paragraph [ref=e270]: "AQI: 65"
            - paragraph [ref=e271]: Moderada
            - generic [ref=e272]:
              - generic [ref=e273]:
                - term [ref=e274]: PM2.5
                - definition [ref=e275]: 5,2 μg/m³
              - generic [ref=e276]:
                - term [ref=e277]: PM10
                - definition [ref=e278]: 5,5 μg/m³
          - listitem [ref=e279]:
            - heading [level=4] [ref=e280]:
              - time [ref=e281]: 15:00
            - paragraph [ref=e282]: "AQI: 65"
            - paragraph [ref=e283]: Moderada
            - generic [ref=e284]:
              - generic [ref=e285]:
                - term [ref=e286]: PM2.5
                - definition [ref=e287]: 5,8 μg/m³
              - generic [ref=e288]:
                - term [ref=e289]: PM10
                - definition [ref=e290]: 6,1 μg/m³
          - listitem [ref=e291]:
            - heading [level=4] [ref=e292]:
              - time [ref=e293]: 16:00
            - paragraph [ref=e294]: "AQI: 65"
            - paragraph [ref=e295]: Moderada
            - generic [ref=e296]:
              - generic [ref=e297]:
                - term [ref=e298]: PM2.5
                - definition [ref=e299]: 7,2 μg/m³
              - generic [ref=e300]:
                - term [ref=e301]: PM10
                - definition [ref=e302]: 7,5 μg/m³
          - listitem [ref=e303]:
            - heading [level=4] [ref=e304]:
              - time [ref=e305]: 17:00
            - paragraph [ref=e306]: "AQI: 65"
            - paragraph [ref=e307]: Moderada
            - generic [ref=e308]:
              - generic [ref=e309]:
                - term [ref=e310]: PM2.5
                - definition [ref=e311]: 9,8 μg/m³
              - generic [ref=e312]:
                - term [ref=e313]: PM10
                - definition [ref=e314]: 10,1 μg/m³
          - listitem [ref=e315]:
            - heading [level=4] [ref=e316]:
              - time [ref=e317]: 18:00
            - paragraph [ref=e318]: "AQI: 65"
            - paragraph [ref=e319]: Moderada
            - generic [ref=e320]:
              - generic [ref=e321]:
                - term [ref=e322]: PM2.5
                - definition [ref=e323]: 14,4 μg/m³
              - generic [ref=e324]:
                - term [ref=e325]: PM10
                - definition [ref=e326]: 14,7 μg/m³
          - listitem [ref=e327]:
            - heading [level=4] [ref=e328]:
              - time [ref=e329]: 19:00
            - paragraph [ref=e330]: "AQI: 66"
            - paragraph [ref=e331]: Moderada
            - generic [ref=e332]:
              - generic [ref=e333]:
                - term [ref=e334]: PM2.5
                - definition [ref=e335]: 19,4 μg/m³
              - generic [ref=e336]:
                - term [ref=e337]: PM10
                - definition [ref=e338]: 19,6 μg/m³
          - listitem [ref=e339]:
            - heading [level=4] [ref=e340]:
              - time [ref=e341]: 20:00
            - paragraph [ref=e342]: "AQI: 65"
            - paragraph [ref=e343]: Moderada
            - generic [ref=e344]:
              - generic [ref=e345]:
                - term [ref=e346]: PM2.5
                - definition [ref=e347]: 22,2 μg/m³
              - generic [ref=e348]:
                - term [ref=e349]: PM10
                - definition [ref=e350]: 22,4 μg/m³
          - listitem [ref=e351]:
            - heading [level=4] [ref=e352]:
              - time [ref=e353]: 21:00
            - paragraph [ref=e354]: "AQI: 65"
            - paragraph [ref=e355]: Moderada
            - generic [ref=e356]:
              - generic [ref=e357]:
                - term [ref=e358]: PM2.5
                - definition [ref=e359]: 21,8 μg/m³
              - generic [ref=e360]:
                - term [ref=e361]: PM10
                - definition [ref=e362]: 21,9 μg/m³
          - listitem [ref=e363]:
            - heading [level=4] [ref=e364]:
              - time [ref=e365]: 22:00
            - paragraph [ref=e366]: "AQI: 64"
            - paragraph [ref=e367]: Moderada
            - generic [ref=e368]:
              - generic [ref=e369]:
                - term [ref=e370]: PM2.5
                - definition [ref=e371]: 15,4 μg/m³
              - generic [ref=e372]:
                - term [ref=e373]: PM10
                - definition [ref=e374]: 15,5 μg/m³
      - generic [ref=e375]:
        - text: Datos de CAMS ENSEMBLE, consultados y presentados por Open-Meteo.
        - link "CAMS ENSEMBLE" [ref=e376] [cursor=pointer]:
          - /url: https://atmosphere.copernicus.eu/
        - text: ·
        - link "Open-Meteo" [ref=e377] [cursor=pointer]:
          - /url: https://open-meteo.com/
```

# Test source

```ts
  123 |     const expectedPollutants = POLLUTANTS.map((v) => `${fmt(api.current[v])} ${api.current_units[v]}`);
  124 | 
  125 |     // Paso 5: tendencia de 24 h
  126 |     const hours = section.locator('.air-quality__hour');
  127 |     const hourCount = await hours.count();
  128 |     const trendShown: { time: string | null; aqi: string }[] = [];
  129 |     for (let i = 0; i < hourCount; i += 1) {
  130 |       trendShown.push({
  131 |         time: await hours.nth(i).locator('time').getAttribute('datetime'),
  132 |         aqi: (await hours.nth(i).locator('.air-quality__hour-aqi').innerText()).trim(),
  133 |       });
  134 |     }
  135 |     const currentHour = String(api.current.time).slice(0, 13);
  136 |     const startIndex = api.hourly.time.findIndex((t: string) => t.slice(0, 13) === currentHour);
  137 |     const expectedTrend = api.hourly.time.slice(startIndex, startIndex + 24).map((t: string, i: number) => ({
  138 |       time: t,
  139 |       aqi: `AQI: ${fmt(api.hourly.us_aqi[startIndex + i], 0)}`,
  140 |     }));
  141 | 
  142 |     await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso1-5-calidad-aire-unidades-imperiales.png'), fullPage: true });
  143 |     await aqiBlock.screenshot({ path: path.join(EVIDENCE_DIR, 'paso3-indicador-aqi.png') });
  144 | 
  145 |     // Paso 6: cambiar a °C / km/h / mm y verificar que los contaminantes no cambian
  146 |     const uiImperial = { aqi: aqiShown, contaminantes: pollutantValues, tendencia: trendShown };
  147 |     await setUnits(page, 'celsius', 'kmh', 'mm');
  148 |     const callsBefore = calls.length;
  149 |     await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
  150 |     await expect(aqiBlock).toBeVisible({ timeout: 20000 });
  151 |     await expect.poll(() => calls.length).toBeGreaterThan(callsBefore);
  152 |     const call2 = calls[calls.length - 1];
  153 |     const uiMetric = {
  154 |       aqi: (await aqiBlock.locator('strong').innerText()).trim(),
  155 |       contaminantes: (await section.locator('.air-quality__pollutant dd').allInnerTexts()).map((t) => t.trim()),
  156 |     };
  157 |     const sameApiHour = call2.body.current.time === api.current.time;
  158 |     await page.screenshot({ path: path.join(EVIDENCE_DIR, 'paso6-calidad-aire-unidades-metricas.png'), fullPage: true });
  159 | 
  160 |     const summary = {
  161 |       solicitud: {
  162 |         url: call.url.toString(),
  163 |         http: call.status,
  164 |         tiempo_respuesta_ms: call.ms,
  165 |         current: currentParam,
  166 |         hourly: hourlyParam,
  167 |         timezone: params.get('timezone'),
  168 |         parametros_de_unidades: UNIT_PARAMS.filter((p) => params.has(p)),
  169 |       },
  170 |       aqi: {
  171 |         api: api.current.us_aqi,
  172 |         mostrado: aqiShown,
  173 |         categoria_esperada: expectedCategory(api.current.us_aqi),
  174 |         categoria_mostrada: categoryShown,
  175 |         mensaje_mostrado: messageShown,
  176 |         clase_color: aqiClass,
  177 |         colores_calculados: aqiColors,
  178 |         aria_label: aqiAriaLabel,
  179 |         icono: { ...icon, presente: hasIcon },
  180 |       },
  181 |       contaminantes: POLLUTANTS.map((v, i) => ({
  182 |         variable: v,
  183 |         api: api.current[v],
  184 |         unidad_api: api.current_units[v],
  185 |         esperado: expectedPollutants[i],
  186 |         mostrado: pollutantValues[i],
  187 |         coincide: expectedPollutants[i] === pollutantValues[i],
  188 |       })),
  189 |       tendencia: {
  190 |         hora_actual_api: api.current.time,
  191 |         puntos_mostrados: hourCount,
  192 |         coincide_con_hourly_us_aqi: JSON.stringify(trendShown) === JSON.stringify(expectedTrend),
  193 |         mostrada: trendShown,
  194 |         esperada: expectedTrend,
  195 |       },
  196 |       cambio_de_unidades: {
  197 |         ui_con_F_mph_in: uiImperial,
  198 |         ui_con_C_kmh_mm: uiMetric,
  199 |         segunda_solicitud_sin_parametros_de_unidades: UNIT_PARAMS.every((p) => !call2.url.searchParams.has(p)),
  200 |         misma_hora_api: sameApiHour,
  201 |         valores_iguales: uiMetric.aqi === uiImperial.aqi && JSON.stringify(uiMetric.contaminantes) === JSON.stringify(uiImperial.contaminantes),
  202 |       },
  203 |     };
  204 |     fs.writeFileSync(path.join(EVIDENCE_DIR, 'respuesta-cruda-air-quality.json'), JSON.stringify({ url: call.url.toString(), status: call.status, body: api }, null, 2));
  205 |     fs.writeFileSync(path.join(EVIDENCE_DIR, 'resumen-calidad-aire.json'), JSON.stringify(summary, null, 2));
  206 | 
  207 |     // Verificaciones
  208 |     expect.soft(call.status).toBe(200);
  209 |     expect.soft(currentParam.sort()).toEqual([...CURRENT_VARS].sort());
  210 |     expect.soft(hourlyParam).toEqual(expect.arrayContaining(['us_aqi', 'pm2_5', 'pm10']));
  211 |     expect.soft(params.get('timezone')).toBe('auto');
  212 |     expect.soft(summary.solicitud.parametros_de_unidades, 'La solicitud no debe incluir parámetros de unidades').toEqual([]);
  213 |     expect.soft(aqiShown, 'AQI = current.us_aqi').toBe(fmt(api.current.us_aqi, 0));
  214 |     expect.soft(categoryShown, 'Categoría según tabla RF-06').toBe(expectedCategory(api.current.us_aqi));
  215 |     expect.soft(messageShown.length, 'Mensaje de la categoría').toBeGreaterThan(0);
  216 |     expect.soft(aqiClass).toMatch(/air-quality__aqi--(good|moderate|unhealthy-sensitive|unhealthy|very-unhealthy|hazardous)/);
  217 |     expect.soft(pollutantValues, 'Contaminantes = current.*').toEqual(expectedPollutants);
  218 |     for (const value of pollutantValues) expect.soft(value).toMatch(/[µμ]g\/m³$/);
  219 |     expect.soft(hourCount, 'Tendencia de 24 puntos').toBe(24);
  220 |     expect.soft(trendShown, 'Tendencia = hourly.us_aqi desde la hora actual').toEqual(expectedTrend);
  221 |     expect.soft(summary.cambio_de_unidades.segunda_solicitud_sin_parametros_de_unidades).toBe(true);
  222 |     if (sameApiHour) expect.soft(summary.cambio_de_unidades.valores_iguales, 'Valores sin cambio con °C/km/h/mm').toBe(true);
> 223 |     expect.soft(hasIcon, 'RF-06: la categoría debe comunicarse también con un ícono').toBe(true);
      |                                                                                       ^ Error: RF-06: la categoría debe comunicarse también con un ícono
  224 |     expect(pageErrors).toHaveLength(0);
  225 |   });
  226 | });
  227 | 
```