# Acta de habilitación para QA

**Dictamen al corte: NO HABILITADO PARA QA.**
**Fecha:** 29/09/2026. **Naturaleza:** validación interna previa a evaluación independiente. Esta acta no representa aprobación del equipo de QA.

## 1. Información general

| Campo | Información verificable |
|---|---|
| Proyecto | `app-clima-local`, aplicación React/Vite/TypeScript que consume Open-Meteo desde el navegador. |
| Versión | `0.1.0` según `package.json`. |
| Rama | `main`. |
| Commit base | `66860edb9482597573169822254b046aea5905a8`; las correcciones de este corte permanecen en el árbol local sin commit. |
| Entorno validado | Local Windows, Node 24.18.0 y npm 11.16.0; build estático en `dist/`; E2E Edge sobre `127.0.0.1:4173`. |
| URL candidata de QA | [https://app-clima-local.vercel.app/](https://app-clima-local.vercel.app/). Su artefacto fue verificado el 28/09/2026 para la versión **anterior**; no hay evidencia de publicación de las correcciones actuales. |
| Identidad de esta versión en Vercel | **No determinada**. |

## 2. Alcance entregable

RF-01 clima actual y pronóstico; RF-02 búsqueda de ciudad; RF-03 geolocalización; RF-04 comparación entre ciudades; RF-05 históricos; RF-06 calidad del aire; RF-07 selección de modelo; RF-08 elevación; RF-09 amanecer/atardecer/duración del día; RF-10 conversión de unidades; RF-11 accesibilidad, responsive e internacionalización. La [matriz](traceability.md) identifica pruebas y límites por requisito.

## 3. Fuera de alcance

Mapas/radar, compartir/exportar y caché/offline. No constituyen faltantes de esta entrega.

## 4. Validaciones internas

| Validación | Resultado al corte |
|---|---|
| Tests `npm test` | Última corrida completa: 16/16 archivos, **348/348** casos, 66.17 s, exit code 0. |
| Lint `npm run lint` | Exit code 0, sin diagnósticos. |
| Typecheck | No existe script independiente; `tsc -b` pasó en `npm run build`. |
| Build `npm run build` | Exit code 0, 56 módulos, JS inicial 267.21 kB, CSS 43.77 kB y cuatro vistas secundarias en chunks. |
| Coverage V8 | Sentencias **93.52 %**, ramas 87.59 %, funciones 98.27 %, líneas **97.01 %**; 348/348 pruebas. |
| E2E Playwright Edge | **2/2** aprobadas, 17.5 s en repetición final sobre el build actual. APIs simuladas. |
| Contrato Open-Meteo real | Primer intento sin red: 9/9 E-01; repetición con acceso de red: **9/9** aprobadas, exit code 0. |
| axe | **0 infracciones** de reglas WCAG 2.0/2.1 A/AA en clima cargado a 320 px; otras vistas sin resultado axe formal. |
| Lighthouse móvil | Build anterior: Performance **66, 69 y 71**. Build actual: **100 y 68** bajo el mismo perfil móvil; Accessibility **100** y Best Practices **96**. RNF-04 (>90) no se demuestra de manera estable. |
| Lighthouse escritorio | Build anterior: Performance **100**, Accessibility **100**, Best Practices **96**. JSON conservado; CLI reportó `EPERM` al limpiar perfil temporal después de escribir. |
| Seguridad de dependencias | `npm audit --audit-level=high`: **0 vulnerabilidades**, exit code 0 con red. |

Los detalles y la evidencia están en [resultados](test-results.md) y [evidence](evidence/README.md). La suite Vitest y el E2E usan mocks; el contrato sí depende de las APIs reales. Los resultados no se suman como si fueran casos únicos. La auditoría Lighthouse móvil no puede declararse aprobada por la puntuación de escritorio.

### Smoke funcional

| Flujo | Evidencia | Estado |
|---|---|---|
| Buscar → seleccionar → clima actual → diario → horario | E2E Edge con Geocoding/Forecast simulados. | APROBADO local |
| Agregar dos ciudades → comparar | E2E Edge, Neiva y Bogotá. | APROBADO local |
| Fecha válida → Archive → resultado → comparar fechas | E2E Edge con Archive simulado. | APROBADO local |
| Ubicación → AQI y contaminantes | E2E Edge con Air Quality simulada. | APROBADO local |
| °C → °F | E2E Edge; nueva consulta y unidad visible. | APROBADO local |
| Automático → GFS | E2E Edge; parámetro `models` verificado. | APROBADO local |

E-01 a E-05, timeout, cancelación y reintento están cubiertos en pruebas automatizadas de servicios y componentes. No se provocaron errores reales en producción para este corte.

## 5. Defectos y brechas

| Severidad | Estado interno verificable |
|---|---|
| Bloqueantes | **0 identificados** en el inventario interno disponible; no equivale a un inventario externo exhaustivo. |
| Críticos | **0 identificados** que impidan los flujos principales locales. |
| Altos | **1 abierto:** QA-06, Performance móvil Lighthouse <90. |
| Medios | **0 defectos de código abiertos** en el registro interno; QA-05 se tramita como desviación aprobada de RNF-01. |
| Bajos | **0 registrados**. |

QA-01 a QA-04 se corrigieron y probaron en el árbol local. El incumplimiento observado de RNF-01 permanece en el [informe](performance.md), junto con la [desviación autorizada por el solicitante](rnf-01-approved-deviation.md). QA-06 sigue abierto. Ver [resumen](defects-summary.md).

## 6. Precondiciones para QA

- Publicar esta versión exacta en un entorno HTTPS accesible para QA y verificar la identidad del artefacto publicado con el build evaluado. **Pendiente en este corte.**
- Navegador moderno y conexión a internet. Las cuatro APIs públicas de Open-Meteo deben estar disponibles para pruebas reales. Geolocalización exige contexto seguro y permiso del navegador.
- No hay login, backend propio, base de datos ni credenciales. Se conserva únicamente la preferencia de unidades en el navegador; la ubicación no se persiste.
- Seleccionar ubicación antes de clima, históricos o aire. Para Archive, elegir fechas desde 01/01/1940 hasta la fecha disponible calculada con cinco días de margen y un rango máximo de 31 días.
- Datos definidos en `tests/contract/open-meteo.contract.ts`: Neiva, Bogotá (4.711, -74.0721), Londres (51.5072, -0.1276) y Tokio (35.6762, 139.6503). La fecha Archive se calcula respecto al día local.

## 7. Dependencias y limitaciones

La aplicación depende de Open-Meteo Forecast API, Geocoding API, Archive API y Air Quality API. Disponibilidad, límites y valores cambian con el tiempo; la precisión debe compararse contra una respuesta contemporánea con los mismos parámetros, permitiendo solo redondeo de presentación. La desviación de RNF-01 no significa que las APIs cumplan p95 <500 ms.

Lighthouse móvil Performance fluctúa entre 100 y 68 en el build actual: RNF-04 no se demuestra de forma estable. No hay evidencia formal suficiente de lector de pantalla, zoom 200 %, matriz completa de navegadores, estabilidad de dos horas, 50 usuarios simultáneos, precisión numérica exhaustiva, cobertura funcional RNF-15 con denominador completo ni UAT. Estas ausencias no se anotan como resultados aprobados y deberán formar parte de la evaluación independiente.

## 8. Dictamen

**NO HABILITADO PARA QA** para la versión corregida de este árbol local, porque la aplicación aún no está identificada en la URL que utilizará QA. La versión anterior sí fue accesible, pero no contiene las correcciones aquí evaluadas. Además, el estado solicitado «sin observaciones» no está justificado: RNF-04 móvil falla y QA-06 permanece abierto. Las pruebas locales aprobadas permiten continuar hacia el despliegue y un nuevo smoke; no sustituyen la precondición de acceso de QA.

La versión no se encuentra habilitada para iniciar la evaluación formal por QA debido a la ausencia de un entorno verificado para **esta versión**. Para reconsiderar la habilitación se debe publicar e identificar el artefacto corregido y repetir el smoke publicado. El incumplimiento RNF-04 debe cerrarse o consignarse como observación explícita; no puede ocultarse.

## 9. Mensaje breve para el equipo QA

> Equipo QA: la versión corregida aún no está habilitada para iniciar su evaluación formal. La regresión local, E2E, contrato, lint, build y cobertura cuentan con evidencia, pero falta verificar su publicación en el entorno de QA. Además, Lighthouse Performance móvil permanece por debajo del umbral. Se emitirá un acta actualizada cuando el artefacto publicado y su smoke estén comprobados. El alcance vigente es RF-01 a RF-11; mapas/radar, compartir/exportar y offline están fuera de alcance.
