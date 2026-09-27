# Informe de Ejecución — Creación del Estándar de Pruebas QA (`qa/`)

**Fecha de ejecución:** 2026-09-27  
**Repositorio:** `app-clima-local`  
**Ambiente QA configurado:** `https://app-clima-local.vercel.app`  

---

## 1. Archivos y carpetas creados

Se creó la estructura completa requerida bajo el directorio raíz `qa/` y un script de validación auxiliar bajo `scripts/`:

```text
qa/
├── README.md                                    # Transcripción íntegra del estándar oficial (secciones 1 a 5).
├── INSTALACION.md                               # Guía de instalación de herramientas no gestionadas por npm (k6, OWASP ZAP, NVDA/VoiceOver).
├── INFORME_EJECUCION.md                         # Este documento de cierre y auditoría de la tarea.
├── playwright.config.ts                         # Configuración de Playwright con proyectos para ejemplo, jc, js y ss.
├── mocks/
│   └── handlers.ts                              # Handlers MSW para endpoints Open-Meteo y catálogo de errores E-01 a E-05.
├── schemas/
│   └── resultado.schema.json                    # Esquema JSON Schema draft-07 (Ajv) con reglas condicionales (allOf).
├── fixtures/
│   └── ciudades.json                            # Datos compartidos de prueba (ciudades válidas y casos borde).
├── postman/
│   └── README.md                                # Instrucciones y organización de colecciones Postman por bloque.
├── _plantillas/
│   ├── resultado.template.md                    # Plantilla Markdown para documentación humana de resultados.
│   └── resultado.template.json                  # Plantilla JSON para resultados estructurados.
└── casos/
    ├── jc/
    │   └── .gitkeep                             # Reservado para casos de JC (RF-01, 07, 08, 09 + rendimiento).
    ├── js/
    │   └── .gitkeep                             # Reservado para casos de JS (RF-02, 03, 04, 11 + accesibilidad).
    ├── ss/
    │   └── .gitkeep                             # Reservado para casos de SS (RF-05, 06, 10 + seguridad).
    └── ejemplo/
        └── TC-EJEMPLO-000/
            ├── TC-EJEMPLO-000.spec.ts           # Script demostrativo Playwright de carga inicial.
            ├── resultados/
            │   ├── TC-EJEMPLO-000__2026-09-27__run01.json # Resultado JSON válido según schema Ajv.
            │   └── TC-EJEMPLO-000__2026-09-27__run01.md   # Resultado Markdown complementario con el mismo nombre base.
            └── evidencias/
                └── TC-EJEMPLO-000__2026-09-27__run01/
                    └── .gitkeep                 # Carpeta de evidencia correspondiente al run01.

scripts/
└── validate-qa-results.mjs                      # Script para validar automáticamente todos los resultados JSON con Ajv.
```

---

## 2. Modificaciones al `package.json` y versiones fijadas

Se consultaron en el registro oficial de npm las versiones estables más recientes de las herramientas requeridas y se agregaron en `devDependencies` y `scripts` sin alterar ninguna dependencia o script preexistente:

### Paquetes fijados en `devDependencies` (versiones exactas sin rangos)
- `@playwright/test`: `1.63.0` (Motor de ejecución E2E y pruebas de interfaz/accesibilidad)
- `@axe-core/playwright`: `4.13.0` (Integración de accesibilidad Axe para Playwright)
- `msw`: `2.15.0` (Mock Service Worker para intercepción de red Open-Meteo)
- `ajv`: `8.20.0` (Validador de JSON Schema para resultados)
- `ajv-formats`: `3.0.1` (Soporte de validación para formatos `date` y `uri` en Ajv)
- `newman`: `6.2.2` (Ejecutor CLI para colecciones de Postman)
- `@lhci/cli`: `0.15.1` (Lighthouse CI CLI para auditorías de rendimiento y calidad)

### Scripts añadidos en `package.json`
- `"qa:test"`: Ejecución global de Playwright con configuración `qa/playwright.config.ts`.
- `"qa:test:ejemplo"`: Ejecución del bloque de ejemplo (`--project=ejemplo`).
- `"qa:test:jc"`: Ejecución de la suite del bloque JC (`--project=jc`).
- `"qa:test:js"`: Ejecución de la suite del bloque JS (`--project=js`).
- `"qa:test:ss"`: Ejecución de la suite del bloque SS (`--project=ss`).
- `"qa:validate-results"`: Validador automático de esquemas de resultados usando el esquema `resultado.schema.json`.

---

## 3. Supuestos asumidos

1. **Aislamiento estricto de `tests/`:**  
   No se modificó ni reorganizó ningún archivo de `tests/`, garantizando que la configuración de Vitest y las pruebas de contrato existentes sigan intactas.
2. **Sin almacenamiento interno de defectos ni incidentes:**  
   En estricto apego al estándar, los campos `bug_id` e `incidente_id` son referencias de texto libre a los identificadores externos generados en Excel o GitHub Issues (ejemplo: `BUG-014`, `INC-003`, `#42`), por lo que no se incluyeron plantillas ni directorios de incidencias dentro del repo.
3. **Validación de formatos en Ajv:**  
   Dado que el esquema `resultado.schema.json` especifica `"format": "date"` y `"format": "uri"`, en Ajv v8 estos formatos requieren la biblioteca complementaria oficial `ajv-formats`. Se incluyó en `devDependencies` para asegurar que las validaciones condicionales y de formato funcionen sin errores en Node.js.
4. **Preservación de directorios vacíos en Git:**  
   Se ubicaron archivos `.gitkeep` en `casos/jc/`, `casos/js/` y `casos/ss/` para garantizar que Git rastree la existencia de dichas carpetas sin añadir casos reales antes de tiempo.

---

## 4. Preguntas abiertas para revisión del equipo QA

1. **Uso de WebServer local en Playwright:**  
   Actualmente `playwright.config.ts` apunta a `https://app-clima-local.vercel.app` (configurable mediante la variable de entorno `QA_BASE_URL`). ¿Desea el equipo que se habilite una directiva opcional `webServer` en Playwright para levantar `vite preview` o `vite dev` en ejecuciones offline o en CI?
2. **Estrategia de mock de geolocalización de navegador:**  
   Para los casos de JS relacionados con la API de Geolocation (`navigator.geolocation.getCurrentPosition`), ¿se establecerán coordenadas mock por defecto en Playwright (`geolocation: { latitude: 4.6097, longitude: -74.0817 }`), o cada caso definirá las suyas en su archivo `.spec.ts`?
3. **Políticas de reporte Newman y k6 en CI:**  
   ¿Se requerirá exportar reportes HTML unificados (ej. `newman-reporter-htmlextra`) para consolidar las ejecuciones de Newman y k6 junto con los reportes de Playwright en un pipeline de integración continua?
