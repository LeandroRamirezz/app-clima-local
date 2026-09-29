# Resumen de hallazgos y defectos

**Corte:** 29/09/2026. Clasificación interna basada en código, pruebas y auditorías disponibles. No sustituye el triage independiente de QA ni prueba la inexistencia de incidencias no registradas.

| ID | Requisito | Evidencia y resolución | Estado |
|---|---|---|---|
| QA-01 | RF-05 | La comparación de dos fechas históricas utiliza Archive, muestra valores A/B y diferencia; pruebas de componente y E2E. | **Cerrado en el árbol local actual**. |
| QA-02 | RF-11 | Se agregó enlace visible al enfocar para saltar al contenido principal; prueba automatizada. | **Cerrado en el árbol local actual**. |
| QA-03 | RF-11 | Los textos visibles de los componentes principales se centralizaron en `src/i18n/es.ts`; los catálogos de errores y descripciones del dominio permanecen en sus módulos de recursos. | **Cerrado en el árbol local actual**, pendiente revisión lingüística independiente. |
| QA-04 | RF-07 | Cada opción de modelo tiene una descripción breve asociada al selector; pruebas de componente. | **Cerrado en el árbol local actual**. |
| QA-05 | RNF-01 | El ensayo del 26/09/2026 superó p95 < 500 ms para los cuatro endpoints. El solicitante aprobó revisar el criterio mediante una desviación documentada; el incumplimiento observado no se borra. | **Desviación aprobada**; ver [decisión](rnf-01-approved-deviation.md). |
| QA-06 | RNF-04 | El build anterior obtuvo Performance móvil 66, 69 y 71. Tras cargar vistas secundarias bajo demanda, dos corridas del build actual dieron **100 y 68** con el mismo perfil móvil y throttling; Accessibility 100 y Best Practices 96 en ambas. | **Abierto**: resultado inestable, no se puede demostrar de forma reproducible >90. Requiere medición en entorno controlado y, si corresponde, más optimización. |

No se identificó un defecto bloqueante o crítico de los flujos principales en los tests disponibles. La ausencia de un registro de incidencias exhaustivo impide afirmar que no existan otros defectos. QA-06 es una desviación de calidad medible que impide entregar esta versión **sin observaciones**. También faltan evidencias formales de lector de pantalla, compatibilidad completa entre navegadores, zoom al 200 %, memoria prolongada, 50 usuarios simultáneos y UAT. Estas ausencias se registran como **NO EJECUTADA** o **SIN EVIDENCIA**, no como pruebas aprobadas.
