# Resultado de Ejecución — TC-JC-009

| Campo | Valor |
|---|---|
| **ID del caso** | TC-JC-009 |
| **Nombre** | Elevación ausente o no numérica |
| **Requerimiento** | RF-08 |
| **Tipo** | Funcional |
| **Prioridad** | Media |
| **Diseñado por / Fecha** | jc — 2026-09-28 |
| **Ejecutado por / Fecha** | jc — 2026-09-28 |
| **Ejecución ID** | TC-JC-009__2026-09-28__run01 |
| **Estado global** | ✅ APROBADO |

---

## Escenario A-1 — elevation omitida (campo ausente)

**Datos de prueba:** campo `elevation` no incluido en el body de `/v1/forecast`

**Pasos ejecutados:**
1. Se mockeó `/v1/search` para devolver Neiva con coordenadas válidas.
2. Se mockeó `/v1/forecast` con un payload que omite el campo `elevation` por completo.
3. Se cargó la app, se buscó "Neiva" y se seleccionó la primera opción.
4. Se verificó que `.current-weather__elevation` contuviera `"no disponible"`.
5. Se verificó que la temperatura (`32,5 °C`) fuera visible.

**Resultado esperado:** `"Elevación: no disponible"` — panel intacto

**Resultado obtenido:** Texto `"Elevación: no disponible"` presente. Temperatura `32,5 °C` visible.

**Estado:** ✅ APROBADO

**Evidencia:** `evidencias/TC-JC-009__2026-09-28__run01/01_elevation_ausente.png`

---

## Escenario A-2 — elevation = null

**Datos de prueba:** `elevation: null` en el body de `/v1/forecast`

**Pasos ejecutados:**
1. Se mockeó `/v1/forecast` con `elevation: null`.
2. Se cargó la app, se buscó "Neiva" y se seleccionó la primera opción.
3. Se verificó que `.current-weather__elevation` contuviera `"no disponible"`.
4. Se verificó que la temperatura (`32,5 °C`) fuera visible.

**Resultado esperado:** `"Elevación: no disponible"` — panel intacto

**Resultado obtenido:** Texto `"Elevación: no disponible"` presente. Temperatura `32,5 °C` visible.

**Estado:** ✅ APROBADO

**Evidencia:** `evidencias/TC-JC-009__2026-09-28__run01/02_elevation_null.png`

---

## Escenario B — elevation = "abc" (valor no numérico)

**Datos de prueba:** `elevation: "abc"` en el body de `/v1/forecast`

**Pasos ejecutados:**
1. Se mockeó `/v1/forecast` con `elevation: "abc"`.
2. Se cargó la app, se buscó "Neiva" y se seleccionó la primera opción.
3. Se verificó que `.current-weather__elevation` contuviera `"no disponible"`.
4. Se verificó que la temperatura (`32,5 °C`) fuera visible.

**Resultado esperado:** `"Elevación: no disponible"` — panel intacto

**Resultado obtenido:** Texto `"Elevación: no disponible"` presente. Temperatura `32,5 °C` visible.

**Estado:** ✅ APROBADO

**Evidencia:** `evidencias/TC-JC-009__2026-09-28__run01/03_elevation_no_numerica_abc.png`

---

## Resumen de ejecución

| Métrica | Valor |
|---|---|
| Runner | Playwright |
| Browser | Chromium (Desktop Chrome) |
| Base URL | https://app-clima-local.vercel.app |
| Proyecto | jc |
| Total tests | 3 |
| Passed | 3 |
| Failed | 0 |
| Duración total | ~9,1 s |

---

## Bugs detectados

Ninguno.

---

## Observaciones técnicas

El servicio [`forecast.ts`](../../../../../src/services/forecast.ts) normaliza el campo `elevation` con la función `nullableNumber()`, que convierte a `null` cualquier valor que no sea un número finito (`undefined`, `null`, cadenas de texto, `NaN`, `Infinity`).

El componente [`CurrentWeather.tsx`](../../../../../src/components/CurrentWeather.tsx) evalúa la condición:
```
typeof forecast.location.elevation !== 'number' || !Number.isFinite(forecast.location.elevation)
```
y en caso positivo renderiza el texto `no disponible`, sin que esto afecte ningún otro elemento del panel.

Los tres escenarios confirman que la lógica defensiva del servicio y el componente funciona correctamente ante valores degradados en `elevation`.
