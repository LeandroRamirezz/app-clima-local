# Estándar de Organización de Pruebas QA (`qa/`)

## Contexto del proyecto

Repositorio: aplicación web "Observatorio del clima" (React 19 + TypeScript + Vite), consume la API pública de Open-Meteo. Ya tiene una carpeta `tests/` existente con pruebas unitarias (Vitest) y de contrato (`tests/contract/`).

**Regla de aislamiento:** La carpeta `qa/` es completamente nueva y separada en la raíz del repositorio para las pruebas E2E, de rendimiento, accesibilidad y seguridad diseñadas por el equipo de 3 QA (prefijos JC, JS, SS). El único punto de contacto entre `tests/` y `qa/` es el `package.json` raíz, donde se fusionan dependencias — nunca el código. La carpeta `tests/` no se modifica, no se mueve ni se reorganiza.

- **Ambiente QA desplegado:** `https://app-clima-local.vercel.app`
- **Gestión externa de defectos:** El registro de bugs y de incidentes externos **NO se lleva en este repositorio**. Eso se realiza a mano en el Excel ("Formato de Documentación de Pruebas") y en GitHub (Issues). No se crean carpetas ni plantillas para bugs o incidentes dentro del repositorio; los resultados de prueba únicamente **referencian** el ID generado en Excel/GitHub.

---

## 1. Estructura de carpetas obligatoria

```text
qa/
├── README.md                 ← este mismo estándar, transcrito aquí
├── INSTALACION.md           ← solo herramientas que NO se instalan con npm
├── INFORME_EJECUCION.md     ← informe de creación y cierre del estándar
├── playwright.config.ts
├── mocks/                   ← handlers de MSW, compartidos entre casos
├── schemas/
│   └── resultado.schema.json ← esquema Ajv de validación
├── fixtures/                ← datos de prueba compartidos (ciudades, etc.)
├── postman/                 ← colecciones de Postman por bloque
├── _plantillas/
│   ├── resultado.template.md   ← plantilla de informe humano
│   └── resultado.template.json ← plantilla de datos estructurados
└── casos/
    ├── jc/                  ← (RF-01, 07, 08, 09 + rendimiento)
    ├── js/                  ← (RF-02, 03, 04, 11 + accesibilidad)
    ├── ss/                  ← (RF-05, 06, 10 + seguridad)
    └── ejemplo/
        └── TC-EJEMPLO-000/
            ├── TC-EJEMPLO-000.spec.ts
            ├── resultados/
            │   ├── TC-EJEMPLO-000__2026-09-27__run01.json
            │   └── TC-EJEMPLO-000__2026-09-27__run01.md
            └── evidencias/
                └── TC-EJEMPLO-000__2026-09-27__run01/
                    └── .gitkeep
```

---

## 2. Convención de nomenclatura (obligatoria, sin excepciones)

### ID de caso
`TC-<PREFIJO>-<NNN>`
- `PREFIJO` ∈ {`JC`, `JS`, `SS`, `EJEMPLO`}
- `NNN`: 3 dígitos con ceros a la izquierda, numeración continua (no se reinicia por RF ni por tipo de prueba). Ya está en uso en la hoja de casos y no se cambia.

### Carpeta de un caso
`qa/casos/<bloque>/<TC-ID>/`
- `<bloque>` es el prefijo en minúscula (`jc`, `js`, `ss`, `ejemplo`).

### Archivo de script
Nombrado estrictamente como `<TC-ID>.<sufijo-herramienta>`:

| Herramienta | Sufijo | Ejemplo |
|---|---|---|
| Playwright (E2E / accesibilidad) | `.spec.ts` | `TC-JS-004.spec.ts` |
| k6 (rendimiento) | `.k6.js` | `TC-JC-014.k6.js` |
| Lighthouse CI | `.lighthouse.js` | `TC-JC-013.lighthouse.js` |
| Manual (NVDA/VoiceOver, sin automatizar) | `.manual.md` | `TC-JS-020.manual.md` |

### Archivos de resultado
Una ejecución genera un par inseparable `.json` + `.md`, con el mismo nombre base, dentro de `qa/casos/<bloque>/<TC-ID>/resultados/`:
- `<TC-ID>__<AAAA-MM-DD>__run<NN>.json`
- `<TC-ID>__<AAAA-MM-DD>__run<NN>.md`

- `NN` es un consecutivo de 2 dígitos **por caso**, empieza en `01` y sube en `+1` cada vez que se vuelve a ejecutar ese caso — sin importar si es el mismo día o no.
- **Nunca se sobrescribe ni se borra un resultado anterior**: cada ejecución es un archivo nuevo, conservando el historial completo de reevaluaciones.
- El estado "vigente" de un caso es siempre el del `runNN` más alto.

### Carpeta de evidencia
Carpeta específica por ejecución, con el mismo nombre base sin extensión:
`qa/casos/<bloque>/<TC-ID>/evidencias/<TC-ID>__<AAAA-MM-DD>__run<NN>/`

---

## 3. Estados de resultado — regla obligatoria, sin ambigüedad

El campo `estado` de un resultado solo puede tomar uno de estos 3 valores (un archivo de resultado únicamente existe si el caso ya se ejecutó; "No ejecutado" no es un valor de este campo, sino la ausencia del archivo):

| Estado | Significa | Acción obligatoria (fuera del repo) |
|---|---|---|
| **Aprobado** | El resultado obtenido coincide con el esperado. | Ninguna; guardar la evidencia en `evidencias/`. |
| **Fallido** | El resultado obtenido es distinto del esperado, por un defecto de la app. | Reportar el bug en el Excel y/o crear un Issue en GitHub (fuera de este repo de código), y anotar ese ID en el campo `bug_id` del resultado. |
| **Bloqueado** | No se pudo ejecutar por algo externo: ambiente caído, falla de Open-Meteo, u otro bug que lo impide. | Registrar el incidente en el Excel (Bitácora de Incidentes Externos, fuera de este repo), anotar su ID en `incidente_id`, y describir la causa en `observaciones`. |

- `bug_id` e `incidente_id` son campos de **texto libre de referencia** (ej. `BUG-014`, `INC-003`, o el número de Issue de GitHub `#42`) — no apuntan a ningún archivo dentro de `qa/`, porque ese registro vive en el Excel/GitHub, no en el repositorio.

### Plantilla Markdown (`qa/_plantillas/resultado.template.md`)

```markdown
# <TC-ID> — [nombre del escenario]

## Datos del evaluador
- Nombre:
- Rol / bloque: <bloque>
- Fecha de ejecución: AAAA-MM-DD
- N.º de ejecución (run): 01

## Descripción del caso de prueba
- RF relacionado:
- Tipo de prueba: Funcional | Integración | Contrato | Rendimiento | Accesibilidad | Seguridad
- Objetivo: (copiado del diseño del caso, para que el resultado sea autocontenido)
- Precondiciones:

## Ambiente
- Nombre: QA
- URL: https://app-clima-local.vercel.app
- Commit / versión evaluada:
- Herramienta: Playwright | k6 | Lighthouse CI | Postman/Newman | OWASP ZAP | npm audit | NVDA | VoiceOver | Manual

## Paso a paso ejecutado
1.
2.
3.

## Comando(s) de ejecución
```
(comando exacto usado, ej: npx playwright test qa/casos/<bloque>/<TC-ID> --project=<bloque>)
```

## Resultado esperado
(copiado del diseño del caso)

## Resultado obtenido

## Estado
Aprobado / Fallido / Bloqueado

- Si Fallido → Bug asociado (Excel/GitHub):
- Si Bloqueado → Incidente asociado (Excel):

## Evidencias
(rutas relativas a la carpeta evidencias/ de este mismo caso)

## Observaciones
```

---

## 4. Estructura obligatoria del `.json` de resultado + esquema Ajv

### Plantilla JSON (`qa/_plantillas/resultado.template.json`)

```json
{
  "id_caso": "TC-<BLOQUE>-<NNN>",
  "bloque_qa": "<bloque>",
  "tipo_prueba": "Funcional",
  "rf_relacionado": "",
  "evaluador": { "nombre": "", "rol": "" },
  "fecha_ejecucion": "AAAA-MM-DD",
  "numero_ejecucion": 1,
  "ambiente": {
    "nombre": "QA",
    "url": "https://app-clima-local.vercel.app",
    "commit_o_version": ""
  },
  "herramienta": "Playwright",
  "descripcion_caso": "",
  "precondiciones": "",
  "pasos_ejecutados": [],
  "comandos_ejecucion": [],
  "resultado_esperado": "",
  "resultado_obtenido": "",
  "tiempo_respuesta_ms": null,
  "estado": "Aprobado",
  "bug_id": null,
  "incidente_id": null,
  "evidencias": [],
  "observaciones": ""
}
```

### Esquema Ajv (`qa/schemas/resultado.schema.json`)

El esquema JSON Schema draft-07 hace **obligatorio por reglas condicionales** (`allOf`) los requerimientos de cada estado:
- Si `estado` es **Fallido**, `bug_id` es obligatorio y no puede estar vacío.
- Si `estado` es **Bloqueado**, `incidente_id` y `observaciones` (mínimo 10 caracteres) son obligatorios.
- Si `estado` es **Aprobado**, `evidencias` debe contener al menos un elemento (`minItems: 1`).

---

## 5. Información general para ejecutar cualquier caso (no específica de JC/JS/SS)

### Puesta a punto inicial del entorno (Prerrequisitos)
Antes de ejecutar cualquier prueba por primera vez en local o CI:
```bash
# 1. Instalar dependencias del proyecto y de QA
npm install

# 2. Descargar los navegadores requeridos por Playwright
npx playwright install chromium
```

---

### Configuración y entorno
- **URL del ambiente QA:** `https://app-clima-local.vercel.app`
- **Catálogo de errores E-01 a E-05** (transversal a cualquier caso que golpee la API):

| Código | Condición | Mensaje esperado |
|---|---|---|
| E-01 | Sin conexión | "No hay conexión a internet. Verifique su red e intente nuevamente." |
| E-02 | Timeout > 10 s | "La consulta tardó demasiado. Intente nuevamente." |
| E-03 | HTTP 429 | "Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo." |
| E-04 | HTTP 400 | "No fue posible procesar la consulta. Verifique los datos ingresados." |
| E-05 | HTTP 5xx / JSON malformado | "El servicio meteorológico no está disponible en este momento. Intente más tarde." |

- **Límites de la capa gratuita de Open-Meteo:** menos de 10.000 peticiones/día, 5.000/hora, 600/minuto. Preferir mocks (MSW) sobre el servicio real para pruebas repetitivas o de carga.
- **Herramienta principal por bloque:**

| Bloque | Endpoint/eje | Herramienta principal |
|---|---|---|
| jc | `/v1/forecast` | Playwright + k6 + Lighthouse CI |
| js | `/v1/search` + Geolocation + interfaz | Playwright + @axe-core/playwright |
| ss | `/v1/archive` + `/v1/air-quality` | Playwright + Postman/Newman + OWASP ZAP + npm audit |

- **Comandos genéricos de ejecución** (ajustar ruta/proyecto según el caso):

```bash
npx playwright test qa/casos/<bloque>/<TC-ID> --project=<bloque>
k6 run qa/casos/<bloque>/<TC-ID>/<TC-ID>.k6.js --summary-export=qa/casos/<bloque>/<TC-ID>/resultados/<TC-ID>__$(date +%F)__run01.json
npx lhci autorun --config=qa/casos/<bloque>/<TC-ID>/<TC-ID>.lighthouse.js
newman run qa/postman/<coleccion>.json --folder "<TC-ID>"
```
