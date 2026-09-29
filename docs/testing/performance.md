# Rendimiento de APIs Open-Meteo

**Procedencia:** resultados registrados en el proyecto el 26/09/2026; no se repitió el ensayo para el corte QA del 28/09/2026. La metodología y los valores permanecen en este documento, pero no se conservaron logs crudos versionados. Por ello sirven como evidencia histórica de incumplimiento en aquella red y momento, no como medida actual de producción.

**Decisión posterior (29/09/2026):** el solicitante autorizó revisar el criterio mediante una [desviación aprobada](rnf-01-approved-deviation.md). Las cifras de este informe permanecen como mediciones fallidas del umbral original; la desviación no altera ni reinterpreta esos valores. La medición Lighthouse del frontend se registra por separado en [resultados](test-results.md).

Objetivo del requisito RNF-01: p95 < 500 ms por endpoint en condiciones normales de red. La medición comprende latencia desde `fetch` hasta consumir el cuerpo de respuesta; incluye red, procesamiento del proveedor y transferencia. No es un benchmark de renderizado ni atribuye latencia al frontend.

## Herramienta y seguridad del ensayo

`scripts/open-meteo-performance.mjs` usa Node y APIs nativas; no requiere instalar k6/JMeter. Es manual y no se ejecuta en CI. Mide por separado Forecast, Geocoding, Archive y Air Quality. Cada endpoint tiene una petición pequeña y reproducible; Archive usa una fecha fija pasada, válida desde 1940. El runner limita muestras y concurrencia a 50, no hace reintentos y termina tras un único lote. Por defecto realiza 40 requests (10 por endpoint, concurrencia 2). Máximo permitido por configuración: 200 requests (50 por endpoint), concurrencia 50.

La página de [límites oficiales](https://open-meteo.com/en/pricing) consultada el 26/09/2026 lista 600 llamadas/minuto, 5.000/hora y 10.000/día para acceso gratuito, además de uso no comercial. Un ensayo máximo de 200 llamadas queda bajo la cuota minutely documentada; sigue siendo opt-in y debe evitarse si ya hay otra carga sobre la cuenta/IP.

Ejecutar el ensayo conservador:

```bash
npm run test:performance -- --samples=10 --concurrency=2
```

Para 50 muestras concurrentes (200 solicitudes totales):

```bash
npm run test:performance -- --samples=50 --concurrency=50
```

El p95 usa el rango nearest-rank sobre respuestas exitosas; con 10 muestras se interpreta como una estimación corta. Una respuesta HTTP no 2xx aparece como fallo/429 si corresponde. No se oculta un p95 superior a 500 ms.

## Medidas observadas

| Endpoint | Muestras | Concurrencia | Exitosas | 429 | p95 ms | RNF-01 |
|---|---:|---:|---:|---:|---:|---|
| Forecast | 10 | 2 | 10 | 0 | 1557.9 | FAIL |
| Geocoding | 10 | 2 | 10 | 0 | 876.6 | FAIL |
| Archive | 10 | 2 | 10 | 0 | 948.0 | FAIL |
| Air Quality | 10 | 2 | 10 | 0 | 839.4 | FAIL |

## Ensayo concurrente (50 por endpoint)

Ejecución adicional: `npm run test:performance -- --samples=50 --concurrency=50` (200 solicitudes máximas, sin reintentos). Resultado:

| Endpoint | Muestras | Concurrencia | Exitosas | Fallos | 429 | p95 ms | RNF-01 |
|---|---:|---:|---:|---:|---:|---:|---|
| Forecast | 50 | 50 | 42 | 8 | 5 | 1031.1 | FAIL |
| Geocoding | 50 | 50 | 50 | 0 | 0 | 2571.3 | FAIL |
| Archive | 50 | 50 | 50 | 0 | 0 | 2145.7 | FAIL |
| Air Quality | 50 | 50 | 50 | 0 | 0 | 919.3 | FAIL |

El ensayo concurrente confirmó limitación de solicitudes: Forecast devolvió cinco HTTP 429 y tres fallos adicionales. Aunque 200 está por debajo de la cuota publicada por minuto, esa cuota no garantiza que una ráfaga simultánea sea aceptada. No se repitió el lote ni se hizo reintento automático. Las mediciones son específicas de esta máquina, ubicación de red y momento; no constituyen un SLO universal ni miden renderizado del cliente.

**Alcance RNF-10:** 50 peticiones HTTP concurrentes a un endpoint no representan 50 usuarios simultáneos navegando por la aplicación. Ese escenario permanece **NO EJECUTADA** como prueba de usuarios. Los requisitos de FCP, renderizado y Lighthouse tampoco fueron medidos por este script.
