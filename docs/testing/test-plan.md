# Plan de pruebas internas — aplicación Open-Meteo

**Corte:** 29/09/2026. La especificación vigente es `requerimientos_app_clima_local v2.md`. Esta documentación distingue la verificación interna de la evaluación independiente de QA.

## Objetivo y alcance

Validar RF-01 a RF-11, consumo de Forecast, Geocoding, Historical Weather y Air Quality, errores E-01 a E-05, fechas/horas locales, unidades, precisión y comportamiento accesible/responsive. Mapas, compartir/exportar y offline no pertenecen al alcance vigente.

| API | Endpoint | Contratos relevantes |
|---|---|---|
| Forecast | `https://api.open-meteo.com/v1/forecast` | current, hourly, daily, modelo, unidades, nulos, zona horaria. |
| Geocoding | `https://geocoding-api.open-meteo.com/v1/search` | búsqueda, homónimos y coordenadas. |
| Historical Weather | `https://archive-api.open-meteo.com/v1/archive` | fechas calendario, rango, unidades y comparación histórica. |
| Air Quality | `https://air-quality-api.open-meteo.com/v1/air-quality` | US AQI, contaminantes y tendencia. |

## Entorno y herramientas

Frontend React 19, Vite 8 y TypeScript 6. Pruebas locales con Vitest 5, React Testing Library y happy-dom; mocks de `fetch` sin red para regresión. Cobertura V8. E2E en Edge instalado mediante Playwright, con cuatro endpoints interceptados; axe-core mediante Playwright para WCAG 2.0/2.1 A/AA. Lighthouse CLI audita el build servido localmente. ESLint y `tsc -b` forman parte del gate. El contrato en vivo está en `tests/contract/open-meteo.contract.ts`; las mediciones de API en `scripts/open-meteo-performance.mjs`. No se utiliza MSW, k6 ni backend propio.

## Estrategia

| Categoría | Método y evidencia |
|---|---|
| Unitarias | Validadores, normalización, fechas, UV/AQI, duración solar e identidad de ubicaciones; `npm test`. |
| Componentes/integración | React Testing Library cubre UI, estado, errores, cancelaciones, reintentos, modelos, unidades y comparación histórica; `npm test`. |
| Contrato | `npm run test:contract` usa Open-Meteo real; separar sus resultados de la suite simulada. |
| E2E | `npm run test:e2e` recorre los flujos principales con respuestas HTTP deterministas en Edge. |
| Accesibilidad/responsive | axe en vistas cargadas a 320 px; ancho del documento, Lighthouse Accessibility y revisión semántica. Lector de pantalla/zoom/otros navegadores requieren evaluación independiente. |
| Rendimiento | Lighthouse móvil/escritorio para frontend; script de latencia separado para Open-Meteo. RNF-01 tiene [desviación aprobada](rnf-01-approved-deviation.md). |
| Seguridad básica | Pruebas de texto como datos, `npm audit`, HTTPS y revisión de credenciales/cabeceras cuando exista evidencia. |

Los resultados y límites por fecha están en [ejecución](test-results.md), [trazabilidad](traceability.md), [accesibilidad](accessibility-report.md) y [acta](qa-handoff.md). Los tests con mocks no demuestran disponibilidad o precisión de Open-Meteo en un instante real; las comparaciones de valores deben usar una respuesta contemporánea con idénticos parámetros.
