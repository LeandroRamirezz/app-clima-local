# Dictamen de preparación QA interna

**Corte:** 29/09/2026. **Estado de entrega sin observaciones: NO ALCANZADO.** Este documento no es una aprobación de QA. Ver [acta](qa-handoff.md).

## Avances verificables

- RF-05 dispone ahora de comparación de dos fechas históricas; RF-07 muestra descripciones de modelo; RF-11 incorpora salto al contenido y recursos de texto para los componentes principales.
- La suite local pasó **348/348** casos, lint y build/TypeScript terminaron con código 0. Cobertura V8: **93.52 %** de sentencias, **97.01 %** de líneas.
- Playwright en Edge pasó **2/2** recorridos con APIs simuladas, incluido el smoke de las funciones principales y axe en clima a 320 px sin infracciones de las reglas WCAG 2.0/2.1 A/AA seleccionadas.
- El contrato en vivo aprobó **9/9** y `npm audit --audit-level=high` reportó **0 vulnerabilidades**. Lighthouse Accessibility fue **100** en móvil/escritorio y Best Practices **96**. RNF-01 mantiene sus p95 fallidos históricos, con [desviación aprobada](rnf-01-approved-deviation.md) por el solicitante.

## Condiciones que impiden el estado «sin observaciones»

1. **RNF-04:** el build actual produjo **100 y 68** en dos corridas móviles equivalentes tras la optimización; no se demuestra de forma estable el objetivo >90. Los resultados anteriores fueron 66, 69 y 71. [QA-06](defects-summary.md) permanece abierto.
2. La versión corregida permanece en el árbol local al corte de esta revisión; la URL Vercel verificada antes corresponde al artefacto anterior. La identidad del nuevo despliegue y su smoke deben verificarse antes de ofrecer esa URL como entorno QA de esta versión.
3. RF-11 y varios RNF aún carecen de evidencia formal en lectores de pantalla, zoom 200 %, matriz de navegadores, memoria prolongada, 50 usuarios, precisión numérica exhaustiva y UAT. Estos puntos no se marcan aprobados por la existencia de tests unitarios.

La decisión de **inicio** de QA se toma solo después de verificar el entorno accesible y los gates mínimos del acta. La aprobación final del producto requerirá evaluación independiente y cierre de criterios vigentes. No se debe convertir una desviación o una ausencia de medición en un resultado verde.
