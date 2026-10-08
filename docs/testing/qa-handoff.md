# Acta de habilitación para QA

**Dictamen al corte: HABILITADO PARA QA CON OBSERVACIONES.**
**Fecha:** 29/09/2026. **Naturaleza:** validación interna previa a evaluación independiente. Esta acta no representa aprobación del equipo de QA.

## 1. Información general

| Campo | Información verificable |
|---|---|
| Proyecto | `app-clima-local`, aplicación React/Vite/TypeScript que consume Open-Meteo desde el navegador. |
| Versión | `0.1.0` según `package.json`. |
| Rama | `main`. |
| Commit funcional evaluado | `0ac57094752304fa6e8f9309810466886067246f`, publicado en `origin/main`. |
| Entorno validado | Local Windows, Node 24.18.0 y npm 11.16.0; build estático en `dist/`; E2E Edge sobre `127.0.0.1:4173`; smoke con APIs reales en Vercel. |
| URL de QA | [https://app-clima-local.vercel.app/](https://app-clima-local.vercel.app/), HTTP 200 y smoke funcional comprobados el 29/09/2026. |
| Identidad del despliegue | El HTML público referencia el JS `index-DfFhtoO7.js` y el CSS `index-CzEB7rhj.css`; ambos archivos publicados tienen SHA-256 idéntico a `dist/`. El commit interno informado por Vercel no se obtuvo de forma independiente. |

El SHA-256 del JS es `555158D16C44BDB717B4C5151E32F3D0EADB6E78BF7C3EAA85EEE4DC85BDF60C`; el del CSS es `6B8AE62EB173312D976116F43C469ADA0B65B9F64A0D5D361DB909A8C7D1DC54`. Esto identifica el artefacto funcional publicado frente al build evaluado.

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
| Buscar → seleccionar → clima actual → diario → horario | E2E local con mocks y smoke Edge en Vercel con Open-Meteo real. | APROBADO local y publicado |
| Agregar dos ciudades → comparar | E2E local y smoke publicado con Neiva y Bogotá. | APROBADO local y publicado |
| Fecha válida → Archive → resultado → comparar fechas | E2E local y smoke publicado con Archive real para 10/08/2026 frente a 09/08/2026. | APROBADO local y publicado |
| Ubicación → AQI y contaminantes | E2E local y smoke publicado con API real. | APROBADO local y publicado |
| °C → °F | E2E local y smoke publicado con nueva consulta y unidad visible. | APROBADO local y publicado |
| Automático → GFS | E2E local y smoke publicado con modelo visible; parámetro `models` comprobado en E2E/contrato. | APROBADO local y publicado |

E-01 a E-05, timeout, cancelación y reintento están cubiertos en pruebas automatizadas de servicios y componentes. No se provocaron errores reales en producción para este corte.

## 5. Defectos y brechas

| Severidad | Estado interno verificable |
|---|---|
| Bloqueantes | **0 identificados** en el inventario interno disponible; no equivale a un inventario externo exhaustivo. |
| Críticos | **0 identificados** que impidan los flujos principales en el entorno publicado. |
| Altos | **1 abierto:** QA-06, Performance móvil Lighthouse <90. |
| Medios | **0 defectos de código abiertos** en el registro interno; QA-05 se tramita como desviación aprobada de RNF-01. |
| Bajos | **0 registrados**. |

QA-01 a QA-04 se corrigieron y probaron en el artefacto publicado. El incumplimiento observado de RNF-01 permanece en el [informe](performance.md), junto con la [desviación autorizada por el solicitante](rnf-01-approved-deviation.md). QA-06 sigue abierto. Ver [resumen](defects-summary.md).

## 6. Precondiciones para QA

- Utilizar la URL HTTPS indicada, cuyo HTML, JS y CSS se contrastaron con el build local; el smoke publicado aprobó los flujos principales. La disponibilidad de Open-Meteo debe comprobarse durante cada sesión real.
- Navegador moderno y conexión a internet. Las cuatro APIs públicas de Open-Meteo deben estar disponibles para pruebas reales. Geolocalización exige contexto seguro y permiso del navegador.
- No hay login, backend propio, base de datos ni credenciales. Se conserva únicamente la preferencia de unidades en el navegador; la ubicación no se persiste.
- Seleccionar ubicación antes de clima, históricos o aire. Para Archive, elegir fechas desde 01/01/1940 hasta la fecha disponible calculada con cinco días de margen y un rango máximo de 31 días.
- Datos definidos en `tests/contract/open-meteo.contract.ts`: Neiva, Bogotá (4.711, -74.0721), Londres (51.5072, -0.1276) y Tokio (35.6762, 139.6503). La fecha Archive se calcula respecto al día local.

## 7. Dependencias y limitaciones

La aplicación depende de Open-Meteo Forecast API, Geocoding API, Archive API y Air Quality API. Disponibilidad, límites y valores cambian con el tiempo; la precisión debe compararse contra una respuesta contemporánea con los mismos parámetros, permitiendo solo redondeo de presentación. La desviación de RNF-01 no significa que las APIs cumplan p95 <500 ms.

Lighthouse móvil Performance fluctúa entre 100 y 68 en el build actual: RNF-04 no se demuestra de forma estable. No hay evidencia formal suficiente de lector de pantalla, zoom 200 %, matriz completa de navegadores, estabilidad de dos horas, 50 usuarios simultáneos, precisión numérica exhaustiva, cobertura funcional RNF-15 con denominador completo ni UAT. Estas ausencias no se anotan como resultados aprobados y deberán formar parte de la evaluación independiente.

## 8. Dictamen

**HABILITADO PARA QA CON OBSERVACIONES.** El build y TypeScript pasan, lint termina sin errores, la suite principal aprueba 348/348, el E2E 2/2, el contrato real 9/9 y la cobertura de sentencias supera 80 %. El artefacto funcional está publicado por HTTPS, coincide por hash con el build evaluado y los flujos principales se ejecutaron en Vercel con APIs reales. Entre los hallazgos internos disponibles no se identificó un defecto bloqueante o crítico que impida iniciar la evaluación independiente.

La versión está habilitada para iniciar las pruebas de QA **con las observaciones indicadas**. QA-06 permanece abierto: Lighthouse Performance móvil del build actual fue 100 y 68 en dos corridas equivalentes, de modo que el umbral >90 no se demuestra de manera reproducible. Además, el lector de pantalla, zoom, matriz completa de navegadores, resistencia prolongada, concurrencia de usuarios y UAT carecen de evidencia formal y deben evaluarse sin presuponer aprobación. La desviación RNF-01 está aprobada, pero sus mediciones originales continúan registradas como fallidas. Esta habilitación **no es aprobación final del producto por QA**.

## 9. Mensaje breve para el equipo QA

> Equipo QA: la versión 0.1.0 está **habilitada con observaciones** para iniciar su evaluación independiente en https://app-clima-local.vercel.app/. El artefacto publicado coincide con el build validado; la regresión aprobó 348/348 casos, el E2E 2/2, el contrato real 9/9, lint y build pasaron, y el smoke publicado cubrió los flujos principales. Consulten el acta y QA-06, la variabilidad de Lighthouse Performance móvil. El alcance es RF-01 a RF-11; mapas/radar, compartir/exportar y offline están fuera de alcance. La habilitación para comenzar pruebas no implica aprobación final del producto.
