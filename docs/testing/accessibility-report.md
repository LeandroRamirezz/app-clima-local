# Informe de accesibilidad y adaptación responsive

**Corte:** 29/09/2026. La automatización es evidencia parcial; no constituye certificación WCAG ni reemplaza pruebas con tecnología asistiva.

| Área | Evidencia actual | Límite |
|---|---|---|
| Idioma y recursos | `index.html` declara `lang="es"`; los componentes principales consumen `src/i18n/es.ts` y catálogos de dominio. | La revisión lingüística de todos los estados no está certificada. |
| Búsqueda | Combobox con etiqueta, lista/opciones y `aria-activedescendant`; tests de teclado, selección y foco. | Sin lector de pantalla real. |
| Navegación | Enlace para saltar al contenido principal, visible al enfocar, y orden semántico de secciones. | Sin sesión documentada con NVDA/VoiceOver. |
| Estados | Carga mediante `role="status"`; errores mediante `role="alert"`; pruebas de componentes. | No se midió la secuencia de anuncios en un lector de pantalla. |
| Foco y movimiento | Estilos de foco y `prefers-reduced-motion` en CSS. | Zoom al 200 % y recorrido integral por teclado pendientes de auditoría manual. |
| 320 px | E2E comprueba ausencia de scroll horizontal global en clima cargado y ejecuta axe WCAG 2.0/2.1 A/AA. | No equivale a matriz completa de dispositivos y navegadores. |
| axe | Auditoría de la vista de clima cargada a 320 px: **0 infracciones** en los tags indicados, en la corrida E2E aprobada. | No prueba todas las rutas ni criterios manuales WCAG. |
| Lighthouse Accessibility | **100** en dos corridas móviles locales y **100** en escritorio. | Las corridas de CLI produjeron JSON válido, pero el proceso terminó con error `EPERM` al limpiar el perfil temporal en Windows. |

Los hallazgos QA-02 (skip link) y QA-03 (textos dispersos en componentes principales) se corrigieron en el árbol local. La prueba automática adicional que intentó auditar las otras tres secciones a 320 px quedó sin resultado por bloqueo del runner y se retiró; por ello no se atribuye a esas secciones una aprobación axe. Las comprobaciones con NVDA/VoiceOver, contraste manual, zoom 200 %, orientación y matriz Chrome/Firefox/Safari/Edge están **NO EJECUTADAS** o **SIN EVIDENCIA** formal.
