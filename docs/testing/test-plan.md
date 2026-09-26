# Plan de pruebas — Open-Meteo

## Objetivo y alcance

Verificar la integración client-side con Forecast, Geocoding, Archive y Air Quality, la normalización, las reglas RF vigentes y los estados de error. Se cubren regresiones funcionales de RF-01 a RF-10. RF-12 se revisa como preferencia transversal de unidades. El cambio visual/i18n reciente se cubre como regresión básica de presentación.

Fuera de alcance: RF-07 mapas/radar y RF-11 compartir/exportar, retirados del plan pendiente; OpenStreetMap y proveedores externos; backend, autenticación, almacenamiento de clima y modo offline. RF-13 se auditará en la etapa final.

## APIs y referencia contractual

| API | Endpoint | Aspectos revisados |
|---|---|---|
| Forecast | `https://api.open-meteo.com/v1/forecast` | current/hourly/daily, timezone, rango, unidades, modelo, normalización y nulos |
| Geocoding | `https://geocoding-api.open-meteo.com/v1/search` | query, idioma, límite, formato y ubicaciones ambiguas |
| Archive | `https://archive-api.open-meteo.com/v1/archive` | fechas calendario, daily, timezone y unidades |
| Air Quality | `https://air-quality-api.open-meteo.com/v1/air-quality` | US AQI, contaminantes, horas locales y tendencia |

La revisión documental vigente se realizó el 26/09/2026: [Forecast](https://open-meteo.com/en/docs), [Geocoding](https://open-meteo.com/en/docs/geocoding-api), [Historical Weather](https://open-meteo.com/en/docs/historical-weather-api), [Air Quality](https://open-meteo.com/en/docs/air-quality-api), [DWD ICON](https://open-meteo.com/en/docs/dwd-api), [GFS](https://open-meteo.com/en/docs/gfs-api), [ECMWF](https://open-meteo.com/en/docs/ecmwf-api) y [pricing/límites](https://open-meteo.com/en/pricing).

Documentación oficial confirma `timezone=auto`, unidades de Forecast/Archive, variables current/hourly/daily, Geocoding `name/count/language/format`, Archive desde 1940 con ERA5 con cinco días de retraso, y variables AQI/contaminantes. Los IDs de modelos del producto son `icon_seamless`, `ncep_gfs_seamless` y `ecmwf_ifs025`; sus pruebas determinísticas verifican el parámetro y la suite live intenta validar aceptación actual.

La especificación fuente [requerimientos_app_clima_local.md](C:/Users/leand/Downloads/requerimientos_app_clima_local.md) aclara la numeración: RF-07 = mapas (fuera de alcance), RF-08 = modelo, RF-09 = elevación, RF-10 = amanecer/atardecer. Una sección del texto de la Etapa 13 desplazó esos códigos; la trazabilidad de este plan sigue la especificación y el alcance vigente.

## Estrategia y clases de prueba

- **Unitarias:** validaciones y funciones puras (fechas, AQI, UV, identidad, duración solar).
- **Contrato mockeado:** endpoint, parámetros, normalización, nulls, arrays cortos y E-01 a E-05 mediante `fetch` sustituido. Estas pruebas no demuestran disponibilidad ni compatibilidad actual del servicio público.
- **Componentes/integración:** React Testing Library verifica accesibilidad, estados, reintentos, carreras, selección y flujo entre RF.
- **Contrato live:** `npm run test:contract`; usa solicitudes reales, no mocks. Excluido de `npm test` y de CI. Puede fallar por red, proveedor, datos recientes o límites.
- **Resiliencia/seguridad básica:** timeout, cancelación, respuesta malformada, HTML como texto, datos obsoletos y persistencia no deseada.
- **Rendimiento:** `npm run test:performance`, script finito, sin reintentos, por endpoint. No forma parte de CI.
- **E2E, compatibilidad amplia y accesibilidad automatizada:** no hay Playwright, Cypress, axe ni BrowserStack instalados; no se declaran ejecutados.

## Entorno, datos y herramientas

Node/npm del entorno de desarrollo, Vitest 5, TypeScript, Testing Library y navegador Chromium para smoke manual. Suite determinística usa fixtures/builders locales por servicio y `fetch` mockeado; no se encontró MSW. Las fechas históricas usan fechas de calendario y reloj congelado en tests cuando aplica. La suite no necesita internet.

Las pruebas live usan Neiva para las cuatro APIs; Forecast verifica además América/Bogotá, Europa/Londres y Asia/Tokio, y prueba los tres modelos explícitos. Archive calcula una fecha ya disponible diez días antes del día local. Rendimiento limita muestras a 50 y concurrencia a 50, con cuatro endpoints, una pasada por muestra y sin loops/reintentos. El nivel por defecto es 10 muestras y concurrencia 2.

## Criterios de entrada y salida

Entrada: dependencias instaladas y documentación oficial revisada. Salida: suite determinística completa y lint/build pasan; cada criterio crítico tiene un test trazable; resultados live y de rendimiento se anotan como PASS/FAIL/BLOCKED/NOT RUN sin presentar mocks como contrato real. Cobertura de código >80 % y cobertura funcional ≥95 % se informan solo si existen mediciones reproducibles.

## Riesgos y límites

Open-Meteo gratuito es para uso no comercial y no tiene garantía de uptime; documentación consultada indica límites de 600 llamadas/minuto, 5.000/hora y 10.000/día. Las pruebas de carga deben ser opt-in, cortas y dentro de esas cotas. El objetivo p95 <500 ms depende de red, región, proveedor y momento; no es una garantía del frontend. Cambios del clima y variación en cobertura de modelos hacen inadecuado fijar valores meteorológicos esperados en respuestas reales.

## Comandos disponibles

```bash
npm test
npm run lint
npm run build
npm run test:contract
npm run test:performance -- --samples=10 --concurrency=2
```

`npm run build` ejecuta `tsc -b` y sirve como verificación TypeScript. No existen `test:coverage`, `typecheck` ni `test:e2e`; no deben anunciarse como comandos disponibles.
