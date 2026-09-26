# Resultados y defectos — Etapa 13

## Baseline previo a cambios QA

Fecha: 26/09/2026. Sin archivos funcionales modificados antes de esta línea base.

| Medida | Resultado |
|---|---|
| `npm test` | PASS — 14 archivos, 340/340 tests; 79,03 s en este runner Windows/OneDrive |
| `npm run lint` | PASS — sin errores |
| `npm run build` | PASS — `tsc -b` y Vite; 53 módulos transformados |
| `npm run typecheck` | No existe; `tsc -b` sí se ejecuta durante build |
| `npm run test:coverage` | No existe; proveedor de coverage no está instalado |
| `npm run test:e2e` | No existe; Playwright/Cypress no están instalados |
| Pruebas live/contrato | No estaban configuradas antes de esta etapa |
| P95 / concurrencia | No había script ni medición previa |

## Suite preexistente

14 archivos de test bajo `src`: servicios de Forecast, Geocoding, Archive e Air Quality; componentes de búsqueda, ubicación, comparación, históricos, clima y AQ; y utilidades de fecha histórica, AQI, luz diurna e identidad de ubicación. Vitest expande tests parametrizados a **340 casos ejecutados**. Los servicios reemplazan `fetch`; los datos y builders viven principalmente junto a los tests por servicio. No se eliminaron pruebas.

La ejecución de `npm test` sin reporter alternativo se quedó en espera prolongada durante el arranque de trabajadores y fue cancelada. La repetición con `--reporter=dot` completó 340/340; una ejecución por archivo de Forecast también pasó 64/64 y CurrentWeather 53/53. Esto se registra como comportamiento lento del runner, no como defecto funcional.

## Resultado final

Las pruebas contractuales y de rendimiento son opt-in y no se suman a la suite determinística.

| Medida | Resultado final |
|---|---|
| `npm test -- --reporter=dot` | PASS — 14 archivos, 340/340 tests; 160,94 s en corrida final concurrente con lint/build |
| `npm run test:contract` | PASS — 1 archivo, 9/9 tests live; 9,16 s |
| `npm run test:performance` (10×2) | EJECUTADO; criterio de rendimiento FAIL — 40/40 respuestas, 0 HTTP error, pero p95 >500 ms en 4/4 endpoints |
| `npm run test:performance -- --samples=50 --concurrency=50` | EJECUTADO; prueba concurrente FAIL — 192/200 respuestas; 8 fallos Forecast, 5 HTTP 429; ver performance.md |
| `npm run lint` | PASS — sin errores |
| `npm run build` | PASS — `tsc -b` + Vite; 53 módulos transformados |
| Code coverage | NO MEDIDA: no hay proveedor instalado ni script. Umbral RNF-05 >80% no verificado |
| Functional coverage | NO MEDIDA: los casos trazados se ejecutan, pero falta un inventario exhaustivo con denominador aceptado. RNF-15 ≥95% no verificado |
| Casos críticos definidos | 12 |
| Casos críticos PASS (suite baseline) | 12 trazados a tests existentes; no equivalen a contrato live |
| Casos críticos FAIL | 0 observados en baseline determinístico |
| Casos críticos BLOCKED/NOT RUN | E2E de navegador no ejecutado; cobertura de código y funcional no medida |
| Respuestas HTTP 429 observadas | Ninguna en tests mockeados; 5 en Forecast durante concurrencia 50 |

## Defectos

| ID | RF | Caso | Esperado / obtenido | Severidad | Causa / corrección | Estado |
|---|---|---|---|---|---|---|
| QA-ENV-01 | Transversal | Vitest full-suite en runner actual | Completar; una ejecución sin reporter quedó esperando el inicio de workers. Con dot finalizó 340/340 en 79,03 s | Media, entorno | Arranque/aislamiento de workers; no se cambió configuración productiva | Observación, no bug |
| QA-DOC-01 | Trazabilidad | Número de RF para modelo/elevación/sol | La fuente asigna RF-08/09/10; un bloque de la instrucción Etapa 13 desplaza estos números | Baja, documental | Matriz sigue la especificación fuente y marca RF-07 como retirado | Documentado |

No se detectaron defectos funcionales en la regresión determinística ni en los contratos live. El ensayo de concurrencia evidenció que la ráfaga Forecast supera la capacidad disponible en ese momento y activó 429; el servicio debe presentar E-03, ya cubierto por pruebas mockeadas. No se atribuye el p95 alto únicamente a la aplicación. E2E de navegador y umbrales de cobertura siguen sin verificarse.
