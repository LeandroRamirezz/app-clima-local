# Matriz de trazabilidad funcional

Estado de las pruebas existentes al 26/09/2026: **PASS en mocks/componentes**, suite completa 340/340. “Contrato live” es independiente y se informa en [test-results.md](test-results.md); no se infiere de los mocks.

| RF | Criterios representados | Casos / evidencia automatizada | Tipo | Resultado y límite |
|---|---|---|---|---|
| RF-01 | Request único current/hourly/daily; rangos 1–16; unidades/modelos; timezone local; nulos, errores, cancelación y UI | `src/services/forecast.test.ts`; `src/components/CurrentWeather.test.tsx` | Unit/contrato mock/componentes | PASS. Live Forecast/modelos/zonas separado |
| RF-02 | parámetros Geocoding; trim/codificación; validación; resultados vacíos; homónimos y selección; teclado/IME; XSS | `src/services/geocoding.test.ts`; `src/components/CitySearch.test.tsx` | Unit/contrato mock/componentes/seguridad | PASS. Live búsqueda separado |
| RF-03 | permiso concedido/denegado, timeout, posición no disponible, navegador/contexto inseguro, carreras y privacidad | `src/components/GeolocationControl.test.tsx`; `src/components/CurrentWeather.test.tsx` | Componentes/resiliencia | PASS en mocks; permisos/navegadores reales no automatizados |
| RF-04 | 2–4 ciudades, llamadas concurrentes, configuración común, datos nulos, E-01…E-05 aislados y retry individual, elevación | `src/components/CityComparison.test.tsx`; integración en `src/components/CitySearch.test.tsx`; `src/utils/location-identity.test.ts` | Componentes/unitarias | PASS en mocks; consistencia live no comparada |
| RF-05 | Archive daily y unidades; fechas válidas/inválidas, límite 1940, rango 31/32, orden, día único, timezone/fecha exacta, error y retry | `src/services/historical.test.ts`; `src/utils/historical-dates.test.ts`; `src/components/HistoricalWeather.test.tsx` | Unit/contrato mock/componentes | PASS en mocks. Archive live separado |
| RF-06 | `us_aqi`, contaminantes, categorías y límites, null independiente, ventana 24 h, errores/cancelación/retry | `src/services/air-quality.test.ts`; `src/utils/air-quality.test.ts`; `src/components/AirQualityPanel.test.tsx` | Unit/contrato mock/componentes | PASS en mocks. AQ live separado |
| RF-07 | Mapas/radar | Sin casos | Fuera de alcance según especificación; funcionalidad retirada |
| RF-08 | best_match e IDs ICON/GFS/ECMWF; cambio de modelo, datos parciales, error 400 y sin loops | `src/services/forecast.test.ts`; `src/components/CurrentWeather.test.tsx` | Contrato mock/componentes | PASS en mocks; aceptación live separada |
| RF-09 | elevación válida, 0, null/ausente, coincidencia de ciudad y umbral de diferencia >300 m | `src/services/forecast.test.ts`; `src/components/CurrentWeather.test.tsx`; `src/components/CityComparison.test.tsx`; `src/utils/location-identity.test.ts` | Contrato mock/componentes/unitarias | PASS en mocks; no se deriva elevación |
| RF-10 | sunrise/sunset local, nulls, daylight en horas/minutos, fecha sin conversión UTC | `src/utils/daylight.test.ts`; `src/services/forecast.test.ts`; `src/components/CurrentWeather.test.tsx` | Unit/contrato mock/componentes | PASS en mocks; valores reales cambian por fecha |

## Casos críticos trazados

| ID | Riesgo/caso crítico | Evidencia principal | Estado |
|---|---|---|---|
| TC-CR-01 | Forecast válido y parámetros esenciales | `forecast.test.ts` request único/current/hourly/daily | PASS |
| TC-CR-02 | Geocoding válido, parámetros y ubicación activa | `geocoding.test.ts`, `CitySearch.test.tsx` | PASS |
| TC-CR-03 | Coordenadas no persistidas | `GeolocationControl.test.tsx`, `CurrentWeather.test.tsx` | PASS |
| TC-CR-04 | Fechas Archive y contrato `daily.time` | `historical-dates.test.ts`, `historical.test.ts` | PASS |
| TC-CR-05 | Valor nulo distinto de cero | servicios Forecast/Archive/AQ + componentes | PASS |
| TC-CR-06 | Errores de red y respuesta malformada E-01/E-05 | servicios y componentes por API | PASS |
| TC-CR-07 | HTTP 429/400 | servicios y componentes por API | PASS |
| TC-CR-08 | Unidades enviadas a APIs meteorológicas y sin recálculo cliente | Forecast/Archive/CurrentWeather/HistoricalWeather tests | PASS |
| TC-CR-09 | US AQI y límites de categoría | `air-quality.test.ts`, `utils/air-quality.test.ts` | PASS |
| TC-CR-10 | `timezone=auto` y hora/fecha local sin conversión duplicada | servicios y utilidades de hora/fecha | PASS |
| TC-CR-11 | Request obsoleto no pisa contexto actual | CurrentWeather, CitySearch, HistoricalWeather, AirQualityPanel, CityComparison | PASS |
| TC-CR-12 | Elevación y datos solares no rompen vistas con null | forecast/current/comparison tests | PASS |

La cobertura funcional total en porcentaje **no está calculada**: el repositorio no tenía un catálogo previo numerado de todos los criterios de aceptación. La tabla prioriza trazabilidad verificable, no representa un denominador inventado.

## Tipos de prueba encontrados

Hay unitarias, contratos mockeados, componentes/integración, resiliencia y seguridad básica. No hay suite E2E, cross-browser, performance histórica ni auditoría WCAG automatizada. La suite usa mocks de `fetch` y builders en los tests; no usa MSW. Los casos reales no se incluyen en `npm test`.
