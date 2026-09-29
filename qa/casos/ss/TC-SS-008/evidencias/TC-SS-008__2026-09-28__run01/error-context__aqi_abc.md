# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ss\TC-SS-008\TC-SS-008.spec.ts >> TC-SS-008: Categoría del AQI en valores límite (RF-06, S-02) >> us_aqi = "abc" → N/D (sin categoría)
- Location: qa\casos\ss\TC-SS-008\TC-SS-008.spec.ts:47:5

# Error details

```
Error: Debe mostrarse "N/D"

expect(received).toContain(expected) // indexOf

Expected substring: "N/D"
Received string:    "La calidad del aire no está disponible para esta ubicación.·
PM2.5
Partículas finas
6,3 μg/m³
PM10
Partículas inhalables
6,3 μg/m³
Ozono (O₃)
Ozono
6 μg/m³
Dióxido de nitrógeno (NO₂)
Dióxido de nitrógeno
16,4 μg/m³
Dióxido de azufre (SO₂)
Dióxido de azufre
1,5 μg/m³
Monóxido de carbono (CO)
Monóxido de carbono
561 μg/m³"
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
      - button "Históricos" [ref=e38] [cursor=pointer]
      - button "Calidad del aire" [active] [pressed] [ref=e39] [cursor=pointer]
    - region [ref=e40]:
      - generic [ref=e42]:
        - paragraph [ref=e43]: Atmósfera
        - heading "Calidad del aire" [level=2] [ref=e44]
        - paragraph [ref=e45]: Neiva, Huila, Colombia
      - generic [ref=e46]:
        - paragraph [ref=e47]: La calidad del aire no está disponible para esta ubicación.
        - generic "Concentraciones actuales de contaminantes" [ref=e48]:
          - generic [ref=e49]:
            - term [ref=e50]:
              - generic [ref=e51]: PM2.5
              - generic [ref=e52]: Partículas finas
            - definition [ref=e53]: 6,3 μg/m³
          - generic [ref=e54]:
            - term [ref=e55]:
              - generic [ref=e56]: PM10
              - generic [ref=e57]: Partículas inhalables
            - definition [ref=e58]: 6,3 μg/m³
          - generic [ref=e59]:
            - term [ref=e60]:
              - generic [ref=e61]: Ozono (O₃)
              - generic [ref=e62]: Ozono
            - definition [ref=e63]: 6 μg/m³
          - generic [ref=e64]:
            - term [ref=e65]:
              - generic [ref=e66]: Dióxido de nitrógeno (NO₂)
              - generic [ref=e67]: Dióxido de nitrógeno
            - definition [ref=e68]: 16,4 μg/m³
          - generic [ref=e69]:
            - term [ref=e70]:
              - generic [ref=e71]: Dióxido de azufre (SO₂)
              - generic [ref=e72]: Dióxido de azufre
            - definition [ref=e73]: 1,5 μg/m³
          - generic [ref=e74]:
            - term [ref=e75]:
              - generic [ref=e76]: Monóxido de carbono (CO)
              - generic [ref=e77]: Monóxido de carbono
            - definition [ref=e78]: 561 μg/m³
      - paragraph [ref=e79]: El índice es información general y no constituye un diagnóstico ni consejo médico.
      - region [ref=e80]:
        - heading "Tendencia para las próximas 24 horas" [level=3] [ref=e81]
        - list [ref=e82]:
          - listitem [ref=e83]:
            - heading [level=4] [ref=e84]:
              - time [ref=e85]: 23:00
            - paragraph [ref=e86]: "AQI: 23"
            - paragraph [ref=e87]: Buena
            - generic [ref=e88]:
              - generic [ref=e89]:
                - term [ref=e90]: PM2.5
                - definition [ref=e91]: 6,3 μg/m³
              - generic [ref=e92]:
                - term [ref=e93]: PM10
                - definition [ref=e94]: 6,3 μg/m³
          - listitem [ref=e95]:
            - heading [level=4] [ref=e96]:
              - time [ref=e97]: 00:00
            - paragraph [ref=e98]: "AQI: 22"
            - paragraph [ref=e99]: Buena
            - generic [ref=e100]:
              - generic [ref=e101]:
                - term [ref=e102]: PM2.5
                - definition [ref=e103]: 6,8 μg/m³
              - generic [ref=e104]:
                - term [ref=e105]: PM10
                - definition [ref=e106]: 6,9 μg/m³
          - listitem [ref=e107]:
            - heading [level=4] [ref=e108]:
              - time [ref=e109]: 01:00
            - paragraph [ref=e110]: "AQI: 21"
            - paragraph [ref=e111]: Buena
            - generic [ref=e112]:
              - generic [ref=e113]:
                - term [ref=e114]: PM2.5
                - definition [ref=e115]: 7 μg/m³
              - generic [ref=e116]:
                - term [ref=e117]: PM10
                - definition [ref=e118]: 7,1 μg/m³
          - listitem [ref=e119]:
            - heading [level=4] [ref=e120]:
              - time [ref=e121]: 02:00
            - paragraph [ref=e122]: "AQI: 21"
            - paragraph [ref=e123]: Buena
            - generic [ref=e124]:
              - generic [ref=e125]:
                - term [ref=e126]: PM2.5
                - definition [ref=e127]: 7,1 μg/m³
              - generic [ref=e128]:
                - term [ref=e129]: PM10
                - definition [ref=e130]: 7,1 μg/m³
          - listitem [ref=e131]:
            - heading [level=4] [ref=e132]:
              - time [ref=e133]: 03:00
            - paragraph [ref=e134]: "AQI: 22"
            - paragraph [ref=e135]: Buena
            - generic [ref=e136]:
              - generic [ref=e137]:
                - term [ref=e138]: PM2.5
                - definition [ref=e139]: 7 μg/m³
              - generic [ref=e140]:
                - term [ref=e141]: PM10
                - definition [ref=e142]: 7,1 μg/m³
          - listitem [ref=e143]:
            - heading [level=4] [ref=e144]:
              - time [ref=e145]: 04:00
            - paragraph [ref=e146]: "AQI: 22"
            - paragraph [ref=e147]: Buena
            - generic [ref=e148]:
              - generic [ref=e149]:
                - term [ref=e150]: PM2.5
                - definition [ref=e151]: 7,2 μg/m³
              - generic [ref=e152]:
                - term [ref=e153]: PM10
                - definition [ref=e154]: 7,3 μg/m³
          - listitem [ref=e155]:
            - heading [level=4] [ref=e156]:
              - time [ref=e157]: 05:00
            - paragraph [ref=e158]: "AQI: 22"
            - paragraph [ref=e159]: Buena
            - generic [ref=e160]:
              - generic [ref=e161]:
                - term [ref=e162]: PM2.5
                - definition [ref=e163]: 7,7 μg/m³
              - generic [ref=e164]:
                - term [ref=e165]: PM10
                - definition [ref=e166]: 7,8 μg/m³
          - listitem [ref=e167]:
            - heading [level=4] [ref=e168]:
              - time [ref=e169]: 06:00
            - paragraph [ref=e170]: "AQI: 22"
            - paragraph [ref=e171]: Buena
            - generic [ref=e172]:
              - generic [ref=e173]:
                - term [ref=e174]: PM2.5
                - definition [ref=e175]: 8,8 μg/m³
              - generic [ref=e176]:
                - term [ref=e177]: PM10
                - definition [ref=e178]: 8,9 μg/m³
          - listitem [ref=e179]:
            - heading [level=4] [ref=e180]:
              - time [ref=e181]: 07:00
            - paragraph [ref=e182]: "AQI: 22"
            - paragraph [ref=e183]: Buena
            - generic [ref=e184]:
              - generic [ref=e185]:
                - term [ref=e186]: PM2.5
                - definition [ref=e187]: 11,1 μg/m³
              - generic [ref=e188]:
                - term [ref=e189]: PM10
                - definition [ref=e190]: 11,2 μg/m³
          - listitem [ref=e191]:
            - heading [level=4] [ref=e192]:
              - time [ref=e193]: 08:00
            - paragraph [ref=e194]: "AQI: 25"
            - paragraph [ref=e195]: Buena
            - generic [ref=e196]:
              - generic [ref=e197]:
                - term [ref=e198]: PM2.5
                - definition [ref=e199]: 4,8 μg/m³
              - generic [ref=e200]:
                - term [ref=e201]: PM10
                - definition [ref=e202]: 4,9 μg/m³
          - listitem [ref=e203]:
            - heading [level=4] [ref=e204]:
              - time [ref=e205]: 09:00
            - paragraph [ref=e206]: "AQI: 25"
            - paragraph [ref=e207]: Buena
            - generic [ref=e208]:
              - generic [ref=e209]:
                - term [ref=e210]: PM2.5
                - definition [ref=e211]: 3,9 μg/m³
              - generic [ref=e212]:
                - term [ref=e213]: PM10
                - definition [ref=e214]: 4 μg/m³
          - listitem [ref=e215]:
            - heading [level=4] [ref=e216]:
              - time [ref=e217]: 10:00
            - paragraph [ref=e218]: "AQI: 26"
            - paragraph [ref=e219]: Buena
            - generic [ref=e220]:
              - generic [ref=e221]:
                - term [ref=e222]: PM2.5
                - definition [ref=e223]: 3,3 μg/m³
              - generic [ref=e224]:
                - term [ref=e225]: PM10
                - definition [ref=e226]: 3,5 μg/m³
          - listitem [ref=e227]:
            - heading [level=4] [ref=e228]:
              - time [ref=e229]: 11:00
            - paragraph [ref=e230]: "AQI: 27"
            - paragraph [ref=e231]: Buena
            - generic [ref=e232]:
              - generic [ref=e233]:
                - term [ref=e234]: PM2.5
                - definition [ref=e235]: 3 μg/m³
              - generic [ref=e236]:
                - term [ref=e237]: PM10
                - definition [ref=e238]: 3,3 μg/m³
          - listitem [ref=e239]:
            - heading [level=4] [ref=e240]:
              - time [ref=e241]: 12:00
            - paragraph [ref=e242]: "AQI: 27"
            - paragraph [ref=e243]: Buena
            - generic [ref=e244]:
              - generic [ref=e245]:
                - term [ref=e246]: PM2.5
                - definition [ref=e247]: 2,9 μg/m³
              - generic [ref=e248]:
                - term [ref=e249]: PM10
                - definition [ref=e250]: 3,3 μg/m³
          - listitem [ref=e251]:
            - heading [level=4] [ref=e252]:
              - time [ref=e253]: 13:00
            - paragraph [ref=e254]: "AQI: 27"
            - paragraph [ref=e255]: Buena
            - generic [ref=e256]:
              - generic [ref=e257]:
                - term [ref=e258]: PM2.5
                - definition [ref=e259]: 3 μg/m³
              - generic [ref=e260]:
                - term [ref=e261]: PM10
                - definition [ref=e262]: 3,4 μg/m³
          - listitem [ref=e263]:
            - heading [level=4] [ref=e264]:
              - time [ref=e265]: 14:00
            - paragraph [ref=e266]: "AQI: 28"
            - paragraph [ref=e267]: Buena
            - generic [ref=e268]:
              - generic [ref=e269]:
                - term [ref=e270]: PM2.5
                - definition [ref=e271]: 3,1 μg/m³
              - generic [ref=e272]:
                - term [ref=e273]: PM10
                - definition [ref=e274]: 3,5 μg/m³
          - listitem [ref=e275]:
            - heading [level=4] [ref=e276]:
              - time [ref=e277]: 15:00
            - paragraph [ref=e278]: "AQI: 28"
            - paragraph [ref=e279]: Buena
            - generic [ref=e280]:
              - generic [ref=e281]:
                - term [ref=e282]: PM2.5
                - definition [ref=e283]: 3,2 μg/m³
              - generic [ref=e284]:
                - term [ref=e285]: PM10
                - definition [ref=e286]: 3,6 μg/m³
          - listitem [ref=e287]:
            - heading [level=4] [ref=e288]:
              - time [ref=e289]: 16:00
            - paragraph [ref=e290]: "AQI: 30"
            - paragraph [ref=e291]: Buena
            - generic [ref=e292]:
              - generic [ref=e293]:
                - term [ref=e294]: PM2.5
                - definition [ref=e295]: 3,5 μg/m³
              - generic [ref=e296]:
                - term [ref=e297]: PM10
                - definition [ref=e298]: 3,9 μg/m³
          - listitem [ref=e299]:
            - heading [level=4] [ref=e300]:
              - time [ref=e301]: 17:00
            - paragraph [ref=e302]: "AQI: 31"
            - paragraph [ref=e303]: Buena
            - generic [ref=e304]:
              - generic [ref=e305]:
                - term [ref=e306]: PM2.5
                - definition [ref=e307]: 4,1 μg/m³
              - generic [ref=e308]:
                - term [ref=e309]: PM10
                - definition [ref=e310]: 4,4 μg/m³
          - listitem [ref=e311]:
            - heading [level=4] [ref=e312]:
              - time [ref=e313]: 18:00
            - paragraph [ref=e314]: "AQI: 31"
            - paragraph [ref=e315]: Buena
            - generic [ref=e316]:
              - generic [ref=e317]:
                - term [ref=e318]: PM2.5
                - definition [ref=e319]: 5,4 μg/m³
              - generic [ref=e320]:
                - term [ref=e321]: PM10
                - definition [ref=e322]: 5,7 μg/m³
          - listitem [ref=e323]:
            - heading [level=4] [ref=e324]:
              - time [ref=e325]: 19:00
            - paragraph [ref=e326]: "AQI: 30"
            - paragraph [ref=e327]: Buena
            - generic [ref=e328]:
              - generic [ref=e329]:
                - term [ref=e330]: PM2.5
                - definition [ref=e331]: 6,8 μg/m³
              - generic [ref=e332]:
                - term [ref=e333]: PM10
                - definition [ref=e334]: 7,1 μg/m³
          - listitem [ref=e335]:
            - heading [level=4] [ref=e336]:
              - time [ref=e337]: 20:00
            - paragraph [ref=e338]: "AQI: 30"
            - paragraph [ref=e339]: Buena
            - generic [ref=e340]:
              - generic [ref=e341]:
                - term [ref=e342]: PM2.5
                - definition [ref=e343]: 7,2 μg/m³
              - generic [ref=e344]:
                - term [ref=e345]: PM10
                - definition [ref=e346]: 7,4 μg/m³
          - listitem [ref=e347]:
            - heading [level=4] [ref=e348]:
              - time [ref=e349]: 21:00
            - paragraph [ref=e350]: "AQI: 31"
            - paragraph [ref=e351]: Buena
            - generic [ref=e352]:
              - generic [ref=e353]:
                - term [ref=e354]: PM2.5
                - definition [ref=e355]: 7,6 μg/m³
              - generic [ref=e356]:
                - term [ref=e357]: PM10
                - definition [ref=e358]: 7,9 μg/m³
          - listitem [ref=e359]:
            - heading [level=4] [ref=e360]:
              - time [ref=e361]: 22:00
            - paragraph [ref=e362]: "AQI: 32"
            - paragraph [ref=e363]: Buena
            - generic [ref=e364]:
              - generic [ref=e365]:
                - term [ref=e366]: PM2.5
                - definition [ref=e367]: 8,6 μg/m³
              - generic [ref=e368]:
                - term [ref=e369]: PM10
                - definition [ref=e370]: 8,9 μg/m³
      - generic [ref=e371]:
        - text: Datos de CAMS ENSEMBLE, consultados y presentados por Open-Meteo.
        - link "CAMS ENSEMBLE" [ref=e372] [cursor=pointer]:
          - /url: https://atmosphere.copernicus.eu/
        - text: ·
        - link "Open-Meteo" [ref=e373] [cursor=pointer]:
          - /url: https://open-meteo.com/
```

# Test source

```ts
  46  |   for (const c of CASES) {
  47  |     test(`us_aqi = ${JSON.stringify(c.value)} → ${c.category ?? 'N/D (sin categoría)'}`, async ({ page }) => {
  48  |       fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  49  |       const slug = `aqi_${String(c.value).replace('-', 'menos')}`;
  50  | 
  51  |       const pageErrors: string[] = [];
  52  |       page.on('pageerror', (err) => pageErrors.push(err.message));
  53  | 
  54  |       // Mock: respuesta real de /v1/air-quality con current.us_aqi reemplazado por el valor bajo prueba
  55  |       let requestUrl: string | null = null;
  56  |       await page.route('**/air-quality-api.open-meteo.com/v1/air-quality**', async (route) => {
  57  |         requestUrl = route.request().url();
  58  |         const response = await route.fetch();
  59  |         const body = await response.json();
  60  |         body.current.us_aqi = c.value;
  61  |         await route.fulfill({ response, json: body });
  62  |       });
  63  | 
  64  |       await page.goto('/');
  65  |       const searchInput = page.getByRole('combobox', { name: /Nombre de la ciudad/i });
  66  |       await searchInput.fill('Neiva');
  67  |       const listbox = page.getByRole('listbox', { name: /Ubicaciones encontradas/i });
  68  |       await expect(listbox).toBeVisible({ timeout: 10000 });
  69  |       await listbox.getByRole('option', { name: /Neiva.*Huila/i }).first().click();
  70  |       await expect(page.locator('section.active-location')).toContainText(/Neiva, Huila/i);
  71  | 
  72  |       // Paso 1: cargar la sección de calidad del aire
  73  |       await page.getByRole('button', { name: 'Calidad del aire', exact: true }).click();
  74  |       const section = page.locator('section.air-quality');
  75  |       const current = section.locator('.air-quality__current');
  76  |       await expect(current).toBeVisible({ timeout: 20000 });
  77  | 
  78  |       // Paso 2: número, categoría, ícono y mensaje
  79  |       const aqiBlock = current.locator('.air-quality__aqi');
  80  |       const hasBlock = (await aqiBlock.count()) > 0;
  81  |       const shown = {
  82  |         bloque_aqi_presente: hasBlock,
  83  |         numero: hasBlock ? (await aqiBlock.locator('strong').innerText()).trim() : null,
  84  |         categoria: hasBlock ? (await aqiBlock.locator('.air-quality__category').innerText()).trim() : null,
  85  |         mensaje: hasBlock && (await aqiBlock.locator('p').count()) > 0 ? (await aqiBlock.locator('p').innerText()).trim() : null,
  86  |         clase_color: hasBlock ? await aqiBlock.getAttribute('class') : null,
  87  |         aria_label: hasBlock ? await aqiBlock.getAttribute('aria-label') : null,
  88  |         texto_no_disponible: (await current.locator('.air-quality__unavailable').count()) > 0
  89  |           ? (await current.locator('.air-quality__unavailable').innerText()).trim() : null,
  90  |       };
  91  |       const colors = hasBlock ? await aqiBlock.evaluate((el) => {
  92  |         const s = getComputedStyle(el);
  93  |         return { fondo: s.backgroundColor, borde: s.borderColor };
  94  |       }) : null;
  95  | 
  96  |       // Paso 3: ícono con texto alternativo
  97  |       const icon = hasBlock ? await aqiBlock.evaluate((el) => {
  98  |         const nodes = Array.from(el.querySelectorAll('svg, img, [role="img"], i, [class*="icon"]'));
  99  |         const pseudo = [el, ...Array.from(el.querySelectorAll('*'))].flatMap((node) => ['::before', '::after'].map((p) => {
  100 |           const st = getComputedStyle(node, p);
  101 |           return (st.content && !['none', 'normal', '""'].includes(st.content)) || st.backgroundImage !== 'none' ? p : null;
  102 |         })).filter(Boolean);
  103 |         return {
  104 |           elementos: nodes.length,
  105 |           pseudo_elementos: pseudo.length,
  106 |           con_texto_alternativo: nodes.filter((n) => n.getAttribute('alt') || n.getAttribute('aria-label') || n.querySelector('title')).length,
  107 |         };
  108 |       }) : { elementos: 0, pseudo_elementos: 0, con_texto_alternativo: 0 };
  109 |       const hasIcon = icon.elementos + icon.pseudo_elementos > 0;
  110 | 
  111 |       await current.screenshot({ path: path.join(EVIDENCE_DIR, `${slug}.png`) });
  112 | 
  113 |       // Paso 4: con 151, emular acromatopsia (escala de grises)
  114 |       let grayscale: string | null = null;
  115 |       if (c.value === 151) {
  116 |         const cdp = await page.context().newCDPSession(page);
  117 |         await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'achromatopsia' });
  118 |         grayscale = `${slug}__acromatopsia.png`;
  119 |         await current.screenshot({ path: path.join(EVIDENCE_DIR, grayscale) });
  120 |         await cdp.send('Emulation.setEmulatedVisionDeficiency', { type: 'none' });
  121 |       }
  122 | 
  123 |       const record = {
  124 |         us_aqi_simulado: c.value,
  125 |         categoria_esperada: c.category ?? 'N/D (sin categoría)',
  126 |         solicitud: requestUrl,
  127 |         mostrado: shown,
  128 |         colores: colors,
  129 |         icono: { ...icon, presente: hasIcon },
  130 |         captura: `${slug}.png`,
  131 |         captura_escala_grises: grayscale,
  132 |         errores_consola: pageErrors,
  133 |       };
  134 |       fs.writeFileSync(path.join(EVIDENCE_DIR, `${slug}.json`), JSON.stringify(record, null, 2));
  135 | 
  136 |       if (c.category) {
  137 |         expect.soft(shown.numero, 'Número = us_aqi').toBe(String(c.value));
  138 |         expect.soft(shown.categoria, 'Categoría en texto').toBe(c.category);
  139 |         expect.soft(shown.mensaje?.length ?? 0, 'Mensaje de la categoría').toBeGreaterThan(0);
  140 |         expect.soft(shown.clase_color ?? '').not.toContain('--unavailable');
  141 |         expect.soft(hasIcon, 'Ícono de la categoría').toBe(true);
  142 |         expect.soft(icon.con_texto_alternativo, 'Ícono con alt/aria-label').toBeGreaterThan(0);
  143 |       } else {
  144 |         const currentText = await current.innerText();
  145 |         expect.soft(ALL_CATEGORIES.some((cat) => shown.categoria === cat), 'Sin categoría para valores fuera de rango').toBe(false);
> 146 |         expect.soft(currentText, 'Debe mostrarse "N/D"').toContain('N/D');
      |                                                          ^ Error: Debe mostrarse "N/D"
  147 |       }
  148 |       expect(pageErrors).toHaveLength(0);
  149 |     });
  150 |   }
  151 | });
  152 | 
```