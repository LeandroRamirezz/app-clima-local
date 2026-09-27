# Colecciones de Postman por Bloque QA

Esta carpeta almacena las colecciones de Postman (`.postman_collection.json`) y entornos (`.postman_environment.json`) organizados por bloque para ejecución automatizada con Newman.

## Estructura por bloque

- `qa/postman/ss/`: Pruebas de contrato y seguridad sobre `/v1/archive` y `/v1/air-quality`.
- `qa/postman/jc/`: Colecciones de prueba asociadas a `/v1/forecast`.
- `qa/postman/js/`: Colecciones de prueba asociadas a `/v1/search` (Geocoding).

## Ejecución con Newman

Para ejecutar una colección o una carpeta específica asociada a un caso de prueba (`<TC-ID>`):

```bash
newman run qa/postman/<coleccion>.json --folder "<TC-ID>"
```
