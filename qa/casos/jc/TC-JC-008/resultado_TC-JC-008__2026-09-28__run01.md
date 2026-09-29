# Resultado de Ejecución — TC-JC-008

| Campo | Valor |
|---|---|
| **ID del caso** | TC-JC-008 |
| **Nombre** | Visualización de la elevación de la ubicación |
| **Requerimiento** | RF-08 |
| **Tipo** | Funcional |
| **Prioridad** | Media |
| **Diseñado por / Fecha** | jc — 2026-09-28 |
| **Ejecutado por / Fecha** | jc — 2026-09-28 |
| **Ejecución ID** | TC-JC-008__2026-09-28__run01 |
| **Estado global** | ✅ APROBADO |

---

## Escenario A — Elevación presente (442 m)

**Datos de prueba:**
- `latitude=2.9273`, `longitude=-75.2819`
- `elevation` mockeado: `442` (entero, respuesta de `/v1/forecast`)

**Pasos ejecutados:**
1. Se mockeó `/v1/search` para devolver Neiva con coordenadas válidas.
2. Se mockeó `/v1/forecast` con `elevation: 442` en el cuerpo de la respuesta.
3. Se cargó la app, se buscó "Neiva" y se seleccionó la primera opción.
4. Se verificó que `.current-weather__elevation` fuera visible.
5. Se verificó que el texto contenga `"442 m s. n. m."`.

**Resultado esperado:** `"Elevación: 442 m s. n. m."` en el elemento `.current-weather__elevation`

**Resultado obtenido:** La interfaz mostró exactamente `"Elevación: 442 m s. n. m."`, valor 100% coincidente con el campo `elevation` de la respuesta mockeada.

**Estado:** ✅ APROBADO

**Evidencia:** `evidencias/TC-JC-008__2026-09-28__run01/01_elevacion_442m_neiva.png`

---

## Escenario B — Elevación nula (null)

**Datos de prueba:**
- `elevation` mockeado: `null`

**Pasos ejecutados:**
1. Se mockeó `/v1/forecast` con `elevation: null`.
2. Se cargó la app, se buscó "Neiva" y se seleccionó la primera opción.
3. Se verificó que `.current-weather__elevation` muestre `"no disponible"`.
4. Se verificó que el campo de temperatura (`32,5 °C`) siga visible correctamente.

**Resultado esperado:** `"Elevación: no disponible"` y resto del panel intacto

**Resultado obtenido:** La interfaz mostró `"Elevación: no disponible"` y la temperatura `32,5 °C` fue visible sin inconvenientes.

**Estado:** ✅ APROBADO

**Evidencia:** `evidencias/TC-JC-008__2026-09-28__run01/02_elevacion_nula_no_disponible.png`

---

## Resumen de ejecución

| Métrica | Valor |
|---|---|
| Runner | Playwright |
| Browser | Chromium (Desktop Chrome) |
| Base URL | https://app-clima-local.vercel.app |
| Proyecto | jc |
| Total tests | 2 |
| Passed | 2 |
| Failed | 0 |
| Duración total | ~4,9 s |

---

## Bugs detectados

Ninguno.

---

## Observaciones

- El componente `CurrentWeather.tsx` (línea 61) renderiza la elevación usando `formatForecastNumber(forecast.location.elevation)` con locale `es-CO` y el sufijo `m s. n. m.`.  
- Cuando `elevation` es `null` o no es un número finito, renderiza el texto `no disponible` de forma correcta y segura.  
- El valor mostrado coincide al 100% con el campo `elevation` de la respuesta de la API, cumpliendo el criterio de aceptación del caso.
