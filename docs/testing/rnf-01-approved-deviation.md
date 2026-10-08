# Desviación aprobada de RNF-01 — latencia del proveedor

**Fecha de aprobación:** 28/09/2026.
**Aprobación:** responsable del proyecto, mediante respuesta explícita en la conversación de trabajo: «Revisar el criterio con una desviación aprobada».
**Alcance:** este corte de entrega interna a QA; la especificación vigente conserva su texto original para trazabilidad.

## Motivo y evidencia

RNF-01 fijó p95 < 500 ms para las respuestas de Open-Meteo. Las mediciones conservadas en [performance.md](performance.md) superaron ese umbral en Forecast, Geocoding, Archive y Air Quality. El cliente ejecuta las consultas directamente desde el navegador; la latencia de red y procesamiento del proveedor no puede ser garantizada por este proyecto. Esta desviación **no convierte las mediciones fallidas en aprobadas** ni implica que Open-Meteo cumpla p95 < 500 ms.

## Criterio revisado para habilitación a QA

Para este corte, la latencia externa p95 < 500 ms se registra como **desviación aprobada**, fuera del gate de habilitación interna. En su lugar se exige evidencia verificable de comportamiento bajo control del cliente:

1. cada servicio HTTP aplica timeout de 10 segundos y diferencia E-02 de cancelación voluntaria;
2. la interfaz presenta estado de carga y permite reintentar manualmente tras E-01 a E-05;
3. cambios de ubicación o parámetros invalidan respuestas anteriores, sin mezclar datos;
4. los cuatro endpoints tienen pruebas de servicio y al menos un smoke funcional de los flujos principales en el entorno entregado.

Estos controles se evalúan con pruebas automatizadas y smoke; sus resultados concretos deben figurar en el acta del corte. Si alguno falla, la desviación no justifica la habilitación. La latencia real seguirá midiéndose y reportándose a QA como dependencia externa. No se prometen tiempos del proveedor ni se elimina la evidencia de las mediciones previas.

## Seguimiento

QA debe comparar cualquier incidencia de rendimiento con la red, el endpoint y el momento de la ejecución. Un tiempo sostenido cercano o superior a 10 segundos, una interfaz sin progreso visible, o una cancelación convertida en error visible sí constituyen posibles defectos del flujo entregado. Una renegociación permanente del RNF requiere actualizar la especificación formal por su propietario.
