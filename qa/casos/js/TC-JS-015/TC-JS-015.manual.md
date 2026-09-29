# Protocolo de Prueba Manual: TC-JS-015 — Anuncios en lectores de pantalla

## Objetivo
Verificar de manera auditada y manual que los lectores de pantalla **NVDA** (en Windows) y **VoiceOver** (en macOS / iOS) verbalizan adecuadamente las regiones vivas (`role="alert"` y `role="status"`) ante la ocurrencia de errores (E-01 a E-05) y actualizaciones de búsqueda.

---

## 1. Entorno y configuración previa
- **Navegadores soportados:** Google Chrome / Mozilla Firefox / Safari.
- **Lector de pantalla Windows:** NVDA (versión 2024.x o superior).
- **Lector de pantalla macOS/iOS:** VoiceOver.
- **URL bajo prueba:** `https://app-clima-local.vercel.app`

---

## 2. Pasos de Ejecución Manual

### Bloque A: Anuncio de Errores (role="alert")
1. Iniciar NVDA (`Ctrl + Alt + N`) o activar VoiceOver (`Cmd + F5`).
2. Abrir la aplicación y desconectar la red (o simular offline en DevTools Network).
3. Escribir una ciudad en el buscador.
4. **Verificación:** El lector de pantalla debe interrumpir brevemente y anunciar el mensaje de alerta de forma inmediata:
   *«Alerta: No hay conexión a internet. Verifique su red e intente nuevamente.»*
5. Simular los escenarios de timeout, límite de peticiones (429) o error del servidor (500).
6. **Verificación:** En cada caso se anuncia el texto exacto del catálogo E-01 a E-05 precedido por el rol de alerta.

### Bloque B: Anuncio de Actualizaciones (role="status" / aria-live="polite")
1. Escribir una entrada sin coincidencias: `Xyzabc123`.
2. **Verificación:** Sin interrumpir bruscamente al usuario, el lector debe verbalizar en cuanto esté disponible:
   *«No se encontraron ubicaciones para «Xyzabc123». Verifique la ortografía o pruebe con otro nombre.»*
3. Escribir `San` para generar homónimos.
4. **Verificación:** Se verbaliza el conteo de resultados:
   *«X ubicaciones encontradas.»*
5. Seleccionar una ciudad de la lista (`Bogotá`).
6. **Verificación:** La sección de ubicación activa anuncia el nombre y coordenadas de la ciudad recién seleccionada.

---

## 3. Criterio de Aceptación
- 100% de los mensajes de error se emiten en regiones de alerta asertivas.
- Las actualizaciones de búsqueda y selección se anuncian de forma cortés (`polite`), sin provocar cacofonía ni bloqueos en la lectura.
