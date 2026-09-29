# Matriz de trazabilidad RF/RNF vigente

**Corte:** 29/09/2026. `APROBADO` se limita al escenario y entorno indicados; la aceptación independiente corresponde a QA. Ver [resultados](test-results.md) y [acta](qa-handoff.md).

## Requisitos funcionales

| RF | Evidencia interna localizada | Resultado y límite |
|---|---|---|
| RF-01 — Clima actual y pronóstico | `forecast.test.ts`, `CurrentWeather.test.tsx`; E2E clima actual, diario y horario. | **APROBADO** con mocks y Edge E2E; precisión en vivo completa pendiente de QA. |
| RF-02 — Búsqueda de ciudad | `geocoding.test.ts`, `CitySearch.test.tsx`; E2E selección. | **APROBADO** con mocks/E2E; lectores de pantalla pendientes. |
| RF-03 — Geolocalización | `GeolocationControl.test.tsx`, `CurrentWeather.test.tsx`. | **APROBADO** con geolocalización simulada; matriz de permisos/dispositivos reales pendiente. |
| RF-04 — Comparación entre ciudades | `CityComparison.test.tsx`, `location-identity.test.ts`; E2E dos ciudades. | **APROBADO** con mocks/E2E; revisión visual multiplataforma pendiente. |
| RF-05 — Históricos | `historical.test.ts`, `HistoricalWeather.test.tsx`, `historical-dates.test.ts`, `historical-comparison.test.ts`; E2E consulta y comparación de dos fechas. | **APROBADO** con mocks/E2E. QA-01 cerrado localmente. |
| RF-06 — Calidad del aire | `air-quality.test.ts`, `AirQualityPanel.test.tsx`, `air-quality.test.ts` de utilidades; E2E AQI/PM2.5. | **APROBADO** con mocks/E2E; precisión en vivo pendiente. |
| RF-07 — Selección de modelo | `forecast.test.ts`, `CurrentWeather.test.tsx`; E2E GFS. | **APROBADO** con mocks/E2E; descripciones añadidas; variantes con API real pendientes de QA. |
| RF-08 — Elevación | `forecast.test.ts`, `CurrentWeather.test.tsx`, `CityComparison.test.tsx`. | **APROBADO** con mocks; contraste en vivo pendiente. |
| RF-09 — Amanecer/atardecer/duración | `forecast.test.ts`, `daylight.test.ts`, `CurrentWeather.test.tsx`. | **APROBADO** con mocks; verificación de husos en otros navegadores pendiente. |
| RF-10 — Conversión de unidades | `forecast.test.ts`, `historical.test.ts`, componentes de clima/comparación/históricos; E2E °F. | **APROBADO** con mocks/E2E; resto de combinaciones en navegador queda a QA. |
| RF-11 — Accesibilidad, responsive e internacionalización | Pruebas de componentes, `App.test.tsx`, axe a 320 px, Lighthouse Accessibility 100, `src/i18n/es.ts`. | **PARCIAL**: base automática aprobada; lector de pantalla, zoom y matriz de navegadores sin evidencia formal. |

## Casos críticos y errores

La suite local aprobó **348/348** pruebas en **16/16** archivos. Incluye requests de las cuatro APIs, validación, nulos, fechas locales, homónimos, cancelación y respuestas obsoletas, E-01 a E-05, reintento, unidades/modelo y comparación histórica. El E2E determinista aprobado cubre búsqueda → clima actual/diario/horario → comparación de dos ciudades → histórico/comparación → AQI → °F → GFS. Esto **no** define por sí solo el denominador completo del RNF-15.

## Requisitos no funcionales

| RNF | Evidencia y estado al corte |
|---|---|
| RNF-01 — p95 API < 500 ms | **INCUMPLIDO en medición previa**; desviación aprobada por el solicitante, documentada en [decisión](rnf-01-approved-deviation.md). No se convierte en medición aprobada. |
| RNF-02 — FCP < 3 s | Lighthouse local: móvil 2.0/1.8 s, escritorio 0.4 s; **APROBADO en esas corridas**. |
| RNF-03 — resultados visibles < 2 s | **SIN EVIDENCIA** de medida de extremo a extremo con API real. |
| RNF-04 — Lighthouse Performance/Accessibility/Best Practices > 90 | **NO DEMOSTRADO de forma estable**: build actual móvil 100 y 68 bajo el mismo perfil; Accessibility 100, Best Practices 96. QA-06 abierto. |
| RNF-05 — cobertura código > 80 % | V8: sentencias 93.52 %, ramas 87.59 %, funciones 98.27 %, líneas 97.01 %; **APROBADO** para métrica de sentencias/líneas. |
| RNF-06 — seguridad básica | Tests XSS; `npm audit --audit-level=high` con red encontró 0 vulnerabilidades. Auditoría completa de cabeceras **SIN EVIDENCIA** en este corte. |
| RNF-07 — privacidad de coordenadas | Tests de no persistencia; auditoría de tráfico/retención completa **SIN EVIDENCIA**. |
| RNF-08 — compatibilidad entre navegadores | Edge E2E; matriz completa Chrome/Firefox/Safari/Edge escritorio/móvil **NO EJECUTADA**. |
| RNF-09 — dos horas sin fugas | **NO EJECUTADA**. |
| RNF-10 — 50 usuarios simultáneos | **NO EJECUTADA**; 50 requests por endpoint no equivalen a 50 usuarios. |
| RNF-11 — precisión 100 % | Normalización y contrato estructural cubiertos; comparación numérica exhaustiva UI/API en vivo **SIN EVIDENCIA**. |
| RNF-12 — estados de red/error | E-01 a E-05, cancelación/reintento cubiertos; espera temporal de 429 **SIN EVIDENCIA** específica. |
| RNF-13 — atribución/licencia | Enlaces de fuente presentes; revisión integral de vistas/licencias **SIN EVIDENCIA**. |
| RNF-14 — HTTPS | Vercel HTTPS verificado para el artefacto anterior; nueva versión local aún no identificada en despliegue al corte. |
| RNF-15 — casos críticos 100 %, total ≥ 95 % | **SIN EVIDENCIA** de inventario completo y denominador vigente; 348 tests no son un porcentaje de criterios. |
| RNF-16 — cero defectos críticos/bloqueantes abiertos | Ninguno identificado en registro interno; no hay inventario externo exhaustivo. Ver [hallazgos](defects-summary.md). |
| RNF-17 — aprobación UAT | **NO EJECUTADA**; no hay acta de aceptación. |

Los resultados pendientes no se consideran aprobados por inferencia. La decisión de habilitación de QA se rige por los criterios mínimos del [acta](qa-handoff.md), distintos de la aprobación final de producto.
