# Informe de ejecución de pruebas

**Corte:** 29/09/2026, árbol local posterior a `66860ed`. Las cifras son ejecuciones observadas; pruebas con mocks, contrato en vivo y auditorías se reportan por separado.

Una repetición de `npm test` posterior a añadir Playwright falló: Vitest recogió por defecto `tests/e2e/qa-smoke.spec.ts` (Playwright no puede ejecutarse en Vitest) y dos workers agotaron el tiempo de inicio en esa corrida. Se corrigió la selección con `include: ['src/**/*.test.{ts,tsx}']` en `vite.config.ts`. El E2E conserva su runner separado. La repetición completa tras la corrección se registra abajo; el fallo previo no se elimina del historial.

| Validación | Resultado observado | Estado |
|---|---|---|
| `npm test` | Última corrida: 16/16 archivos; **348/348** pruebas; 66.17 s; exit code 0. La primera corrida tras la carga diferida falló 3/348 por esperas síncronas en pruebas; se adaptaron a la aparición visible de los módulos y la repetición completa pasó. | APROBADO en repetición |
| `npm run test:coverage -- --reporter=dot` | 16/16 archivos; **348/348** pruebas; exit code 0. V8: statements **93.52 % (1185/1267)**, branches **87.59 % (1116/1274)**, functions **98.27 % (341/347)**, lines **97.01 % (1039/1071)**. | APROBADO |
| `npm run lint` | Sin diagnósticos; exit code 0. | APROBADO |
| TypeScript | No hay `typecheck` separado; `tsc -b` pasó dentro de `npm run build`. | APROBADO en build |
| `npm run build` | TypeScript/Vite; 56 módulos; JS inicial **267.21 kB**, CSS 43.77 kB y cuatro chunks de vistas bajo demanda (4.81, 9.20, 10.63 y 16.72 kB); exit code 0. | APROBADO |
| `npm run test:e2e` | Última corrida: **2/2** casos en Edge, 17.5 s, exit code 0, con APIs interceptadas. Flujo funcional completo y clima a 320 px con axe. Un intento anterior se interrumpió por bloqueo del webServer propio del runner; la repetición con `vite preview` ya activo terminó correctamente. | APROBADO en repetición |
| `npm run test:contract` | Primer intento en sandbox sin red: 9/9 fallaron con E-01; repetición con acceso de red: **9/9 aprobaron**, 1/1 archivo, 7.46 s, exit code 0. | APROBADO en repetición con red |
| `npm audit --audit-level=high` | Primer intento sin red: error del endpoint; repetición con acceso de red: `found 0 vulnerabilities`, exit code 0. Variante offline: también 0. | APROBADO con red |

## Auditorías Lighthouse y axe

| Perfil | Performance | Accessibility | Best Practices | FCP | TBT |
|---|---:|---:|---:|---:|---:|
| Móvil, build anterior a división de vistas, 1 | 66 | 100 | 96 | 2.0 s | 1560 ms |
| Móvil, build anterior a división de vistas, 2 | 69 | 100 | 96 | 1.8 s | 1640 ms |
| Móvil, build anterior a división de vistas, 3 | 71 | 100 | 96 | 2.0 s | 1249 ms |
| Móvil, build actual con vistas bajo demanda, 1 | 100 | 100 | 96 | 1.4 s | 7 ms |
| Móvil, build actual con vistas bajo demanda, 2 | 68 | 100 | 96 | 1.8 s | 1759 ms |
| Escritorio, build anterior | 100 | 100 | 96 | 0.4 s | 0 ms |

Los JSON de Lighthouse se generaron sin `runtimeError`; el CLI terminó con error `EPERM` al limpiar el perfil temporal en Windows **después** de escribir los resultados. Por tanto, las puntuaciones se reportan como mediciones válidas con limitación de ejecución, no como comandos exitosos. El build actual produjo tanto 100 como 68 en Performance móvil bajo la misma emulación y throttling: **RNF-04 no se demuestra de manera estable**. axe en E2E a 320 px no encontró infracciones WCAG 2.0/2.1 A/AA en la vista de clima cargada. Un intento adicional de auditar las otras tres secciones se bloqueó y se interrumpió; **NO EJECUTADA** para esas vistas.

## Alcance y límites

La suite local cubre servicio, utilidades, componentes, integración simulada, errores E-01 a E-05, cancelación y reintento. El E2E prueba los flujos principales con respuestas deterministas; no demuestra disponibilidad externa ni precisión de valores en vivo. El contrato **9/9** usa API real y fue repetido en este corte. El [ensayo HTTP previo](performance.md) registró p95 >500 ms en los cuatro endpoints y cinco 429 en ráfaga; el solicitante aprobó la [desviación RNF-01](rnf-01-approved-deviation.md). Los reportes anteriores de 341/341 y el smoke real de Vercel del 28/09/2026 corresponden al artefacto **anterior**; no se atribuyen a este árbol local.

Memoria de dos horas, 50 usuarios, compatibilidad completa entre navegadores, lector de pantalla y UAT: **NO EJECUTADA** o **SIN EVIDENCIA**. La [trazabilidad](traceability.md) precisa el estado por RF/RNF.
