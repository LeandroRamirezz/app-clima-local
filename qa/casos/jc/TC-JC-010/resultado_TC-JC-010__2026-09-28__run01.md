# Resultado de Ejecucion — TC-JC-010

| Campo | Valor |
|---|---|
| **ID del caso** | TC-JC-010 |
| **Nombre** | Nota informativa por diferencia de elevacion > 300 m en comparacion de ciudades |
| **Requerimiento** | RF-08 + RF-04 |
| **Tipo** | Funcional |
| **Prioridad** | Media |
| **Disenado por / Fecha** | jc — 2026-09-27 |
| **Ejecutado por / Fecha** | jc — 2026-09-28 |
| **Ejecucion ID** | TC-JC-010__2026-09-28__run01 |
| **Estado global** | APROBADO |

---

## ESC-A — Bogota (2640 m) vs Neiva (442 m): diferencia > 300 m

**Datos de prueba:**
- Ciudad 1: Bogota — `elevation: 2640` (mock de `/v1/forecast`)
- Ciudad 2: Neiva — `elevation: 442` (mock de `/v1/forecast`)
- Diferencia mockeada: 2 198 m (> 300 m)

**Pasos ejecutados:**
1. Se mockearon `/v1/search` (devuelve Bogota) y `/v1/forecast` (discrimina por latitud y devuelve el payload de cada ciudad).
2. Se navego a `/`, se activo el modo comparacion haciendo clic en "Comparar ciudades".
3. Se verifico que `.current-weather__comparison-setup` fuera visible.
4. Se busco "Bogota" y se selecciono la opcion de la lista; se espero el clic confirmado.
5. Se reroutearon los mocks de `/v1/search` para devolver Neiva.
6. Se busco "Neiva" y se selecciono la opcion de la lista.
7. Se espero a que `.city-comparison__table` fuera visible (timeout 15 s).
8. Se verifico que la tabla contuviera `'2.640 m s. n. m.'` (Bogota) y `'442 m s. n. m.'` (Neiva).
9. Se verifico que `.city-comparison__elevation-note[role="note"]` fuera visible y contuviera el texto `'altitud'`.
10. Se capturo pantalla completa.

**Resultado esperado:**
Nota informativa visible con texto sobre la influencia de la altitud en la temperatura. Elevacion de cada ciudad visible en su columna.

**Resultado obtenido:**
Nota `'Existe una diferencia importante de altitud entre las ciudades comparadas; la altitud puede influir en la temperatura.'` visible. Columnas con `'2.640 m s. n. m.'` y `'442 m s. n. m.'` correctas.

**Estado:** APROBADO

**Evidencia:** `evidencias/TC-JC-010__2026-09-28__run01/01_bogota_vs_neiva_nota_visible.png`

---

## ESC-B (contraprueba) — Barranquilla (18 m) vs Valledupar (169 m): diferencia <= 300 m

**Datos de prueba:**
- Ciudad 1: Barranquilla — `elevation: 18` (mock de `/v1/forecast`)
- Ciudad 2: Valledupar — `elevation: 169` (mock de `/v1/forecast`)
- Diferencia mockeada: 151 m (<= 300 m)

**Pasos ejecutados:**
1. Se mockearon `/v1/search` (Barranquilla) y `/v1/forecast` (discriminado por latitud).
2. Se navego a `/` y se activo el modo comparacion.
3. Se agrego Barranquilla al comparador.
4. Se reroutearon los mocks de `/v1/search` para Valledupar.
5. Se agrego Valledupar al comparador.
6. Se espero a que `.city-comparison__table` fuera visible.
7. Se verifico que la tabla contuviera `'18 m s. n. m.'` y `'169 m s. n. m.'`.
8. Se verifico que `.city-comparison__elevation-note[role="note"]` NO fuera visible.
9. Se capturo pantalla completa.

**Resultado esperado:**
Nota informativa NO visible. Elevacion de cada ciudad visible en su columna.

**Resultado obtenido:**
`expect(note).not.toBeVisible()` paso sin errores. Columnas con `'18 m s. n. m.'` y `'169 m s. n. m.'` visibles.

**Estado:** APROBADO

**Evidencia:** `evidencias/TC-JC-010__2026-09-28__run01/02_barranquilla_vs_valledupar_nota_ausente.png`

---

## Resumen de ejecucion

| Metrica | Valor |
|---|---|
| Runner | Playwright |
| Browser | Chromium (Desktop Chrome) |
| Base URL | https://app-clima-local.vercel.app |
| Proyecto | jc |
| Total tests | 2 |
| Passed | 2 |
| Failed | 0 |
| Duracion total | ~10,3 s |

---

## Bugs detectados

Ninguno.

---

## Observaciones tecnicas

La nota informativa esta implementada en [`CityComparison.tsx`](../../../../../src/components/CityComparison.tsx) (linea 182):

```tsx
{elevationDifference !== null && elevationDifference > 300 && (
  <p className="city-comparison__elevation-note" role="note">
    Existe una diferencia importante de altitud entre las ciudades comparadas; la altitud puede influir en la temperatura.
  </p>
)}
```

El valor `elevationDifference` lo calcula `getElevationDifference()` de [`location-identity.ts`](../../../../../src/utils/location-identity.ts), que extrae las elevaciones numericas finitas de cada ciudad (ya resueltas desde su forecast) y devuelve `max - min`. Si alguna ciudad no tiene elevacion numerica finita, se excluye del calculo y si quedan menos de dos valores, se devuelve `null` (sin nota).

Los mocks de `/v1/forecast` del spec discriminan la ciudad por latitud (tolerancia 0.01 grados) para servir el payload correcto a cada request en la ronda paralela que lanza `useComparisonForecasts`. El mock de `/v1/search` se rerouta entre ciudad y ciudad para que el `CitySearch` devuelva la opcion correcta en cada busqueda.

RF-04 esta activo y funcional: el boton "Comparar ciudades" alterna `activeArea` a `'compare'` en `CurrentWeather.tsx`, mostrando el panel de configuracion y el componente `CityComparison`.
