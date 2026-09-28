# Especificación de Requerimientos — App del Clima Local

| | |
|---|---|
| **Proyecto** | App del Clima Local (aplicación web client-side) |
| **Versión del documento** | 1.0 |
| **Fecha** | 24/09/2026 |
| **Fuente** | Stakeholders del sistema · Descripción del software y criterios de aceptación |

---

## 1. Alcance y convenciones

**Alcance.** Aplicación web de clima **100 % client-side**: sin backend propio, sin base de datos de usuarios, **sin registro ni inicio de sesión**. Consume endpoints públicos de Open-Meteo. Queda **fuera de alcance** la funcionalidad de caché local / modo offline.

**Actores del sistema**

| Actor | Descripción |
|---|---|
| Usuario del sistema | Visitante anónimo que consulta la aplicación desde un navegador. |
| Navegador | Provee geolocalización y almacenamiento de preferencias. |
| API Open-Meteo | Servicio externo de pronóstico, geocodificación, histórico y calidad del aire. |

**Endpoints consumidos**

| Módulo | Endpoint |
|---|---|
| Pronóstico | `https://api.open-meteo.com/v1/forecast` |
| Búsqueda de ciudades | `https://geocoding-api.open-meteo.com/v1/search` |
| Histórico | `https://archive-api.open-meteo.com/v1/archive` |
| Calidad del aire | `https://air-quality-api.open-meteo.com/v1/air-quality` |

**Prioridad.** Todos los RF son de entrega obligatoria (criterio de aceptación general). La prioridad indica el **orden de desarrollo**: Alta/Must → Media/Should → Baja/Could.

**Estructura de cada requerimiento.** Se conserva la estructura de la plantilla de referencia (Título, Código, Versión, Fuente, Descripción, Justificación, Precondiciones, Restricciones, Prioridad, Dependencia, Actores, Entradas, Proceso, Flujo alterno, Salida, Postcondiciones, Criterios de aceptación y Requerimientos no funcionales). Como Markdown no permite tablas anidadas, la tabla de **Entradas** se presenta entre las dos mitades de cada requerimiento.

### 1.1 Catálogo de errores comunes (referenciado desde los flujos alternos)

Todo error de red o de servicio debe mostrarse en un área accesible (`role="alert"`), con botón **Reintentar**, sin romper el resto de la interfaz y sin mostrar texto crudo devuelto por la API.

| Código | Condición | Mensaje al usuario |
|---|---|---|
| E-01 | Sin conexión (`navigator.onLine = false` o fallo de `fetch`) | "No hay conexión a internet. Verifique su red e intente nuevamente." |
| E-02 | Tiempo de espera agotado (> 10 s) | "La consulta tardó demasiado. Intente nuevamente." |
| E-03 | HTTP 429 (límite de consultas de la API) | "Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo." |
| E-04 | HTTP 400 (parámetros inválidos; cuerpo `{error: true, reason}`) | "No fue posible procesar la consulta. Verifique los datos ingresados." |
| E-05 | HTTP 5xx o respuesta malformada | "El servicio meteorológico no está disponible en este momento. Intente más tarde." |

---

## 2. Supuestos y puntos por validar

Los siguientes puntos estaban ambiguos o ausentes en la descripción original. Se tomó la decisión indicada para poder redactar los requerimientos; **deben confirmarse con el Product Owner/docente**.

| ID | Tema | Decisión adoptada |
|---|---|---|
| S-01 | Persistencia | No hay caché ni modo offline. Solo se guarda la **preferencia de unidades** en `localStorage` (RF-10). |
| S-02 | Escala AQI | Se usa el **AQI de EE. UU. (`us_aqi`)** como escala principal, coherente con los ejemplos "Buena / Moderada / Dañina". El AQI europeo (`european_aqi`) queda como dato secundario opcional. |
| S-04 | Comparación | Mínimo 2 y máximo **4 ciudades**. |
| S-05 | Histórico | "Comparar" significa contrastar la fecha consultada contra **otra fecha histórica o contra el clima actual**. Rango máximo por consulta: 31 días. La API de archivo tiene un retraso de varios días en los datos recientes; se usa un margen configurable (por defecto 5 días) y se valida contra la documentación vigente. |
| S-07 | Unidades | Además de °C/°F y km/h/mph, la precipitación admite **mm y pulgadas (in)**. |
| S-08 | Rango de pronóstico | De 1 a **16 días** (límite de la API), 7 por defecto. |
| S-09 | Accesibilidad | Nivel **WCAG 2.1 AA**. |
| S-10 | Geolocalización | Open-Meteo no ofrece geocodificación inversa; la ubicación detectada se rotula con sus coordenadas. |
| S-11 | Carga inicial | Se adopta **FCP < 3 s** como definición única de "tiempo de carga inicial". |
| S-12 | Navegadores | Las **dos últimas versiones estables** de Chrome, Firefox, Safari y Edge (escritorio y móvil). |
| S-13 | i18n | Contenido solo en español, pero con textos externalizados para permitir otros idiomas. |

---

## 3. Requerimientos funcionales

### RF-01 · Consulta de clima actual y pronóstico

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Consulta de clima actual y pronóstico |
| **Código Identificación** | RF-01 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe mostrar, para la ubicación seleccionada (RF-02 o RF-03), las condiciones meteorológicas actuales y el pronóstico horario y diario obtenidos del endpoint `/v1/forecast` de Open-Meteo, sin requerir registro ni autenticación.<br><br>**Condiciones actuales:** temperatura, sensación térmica, humedad relativa, velocidad y dirección del viento, precipitación, índice UV y descripción/ícono según el `weather_code` (WMO), en español.<br><br>**Pronóstico horario:** temperatura, sensación térmica, probabilidad de precipitación, precipitación, viento y UV por hora.<br><br>**Pronóstico diario:** temperatura máxima/mínima, precipitación acumulada, probabilidad máxima de precipitación, viento máximo, UV máximo y condición general por día.<br><br>El usuario puede configurar el rango del pronóstico (1 a 16 días; por defecto 7).<br><br>El índice UV debe mostrarse con su categoría: 0–2 Bajo, 3–5 Moderado, 6–7 Alto, 8–10 Muy alto, ≥ 11 Extremo. |
| **Justificación** | Es la funcionalidad central de la aplicación: permite al usuario conocer el estado del tiempo actual y planificar actividades con base en el pronóstico. Mostrar la categoría del UV y una descripción textual de la condición evita que el usuario deba interpretar códigos o números crudos. |
| **Precondiciones** | • El navegador tiene conexión a internet.<br>• Existe una ubicación válida (latitud y longitud) seleccionada mediante RF-02 o RF-03.<br>• El endpoint `/v1/forecast` está disponible. |
| **Restricciones** | • No se requiere autenticación ni clave de API.<br>• `forecast_days` máximo 16 (límite de la API).<br>• Las horas se presentan en la zona horaria local de la ubicación (`timezone=auto`), sin conversión desde UTC en el cliente.<br>• Variables no disponibles (ej. probabilidad de precipitación con ciertos modelos) se muestran como "N/D" sin romper la interfaz.<br>• Solo se permite redondeo de presentación (máx. 1 decimal); el valor original de la API no se altera.<br>• Todo dato externo se renderiza como texto (no como HTML). |
| **Prioridad** | [X] Alta/Must [ ] Media/Should [ ] Baja/Could |
| **Dependencia** | RF-02 o RF-03 (ubicación), RF-10 (unidades), RF-07 (modelo; opcional) |
| **Actores** | Usuario del sistema, API Open-Meteo |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| latitud | number (−90 a 90) | Latitud de la ubicación seleccionada. |
| longitud | number (−180 a 180) | Longitud de la ubicación seleccionada. |
| nombre_ubicacion | string (máx. 150) | Nombre a mostrar (ciudad, región, país o coordenadas). |
| dias_pronostico | integer (1–16) | Rango del pronóstico. Por defecto 7. |
| vista_pronostico | enum (horaria, diaria) | Vista activa del pronóstico. |
| unidades | object | Temperatura, viento y precipitación (definidas en RF-10). |
| modelo | string | Modelo numérico (RF-07). Por defecto `best_match`. |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El usuario selecciona una ubicación (RF-02 o RF-03).<br>2. El sistema muestra un indicador de carga.<br>3. El sistema solicita `GET /v1/forecast` con los bloques `current`, `hourly` y `daily`, `timezone=auto`, `forecast_days`, las unidades y el modelo activos. Un único request alimenta también RF-08 (elevación) y RF-09 (amanecer/atardecer).<br>4. El sistema valida la estructura de la respuesta.<br>5. El sistema presenta las condiciones actuales, con ícono y texto según `weather_code`.<br>6. El sistema presenta el pronóstico en la vista activa (horaria o diaria).<br>7. El usuario puede cambiar el rango de días o la vista; el sistema actualiza sin perder la ubicación.<br>8. El UV actual se toma de `current`; si la API no lo entrega, se toma el valor de la hora vigente del bloque `hourly`. |
| **Flujo alterno** | **Error de red, tiempo de espera, límite o fallo del servicio:** se aplican E-01 a E-05 (Reintentar).<br><br>**Variable con valor nulo:** el sistema muestra "N/D" en ese dato y continúa mostrando el resto.<br><br>**Rango de días inválido (< 1 o > 16):** el sistema restablece el valor al límite permitido e informa: "El pronóstico admite entre 1 y 16 días."<br><br>**Código meteorológico desconocido:** el sistema muestra "Condición no disponible" con ícono neutro. |
| **Salida** | • Panel de clima actual con todas las variables.<br>• Pronóstico horario y diario para el rango elegido.<br>• Categoría del índice UV. |
| **Postcondiciones** | • Los datos mostrados coinciden con la respuesta de la API para esa ubicación, unidades y modelo.<br>• La interfaz permanece utilizable ante cualquier error. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• Se muestran temperatura, humedad, viento, sensación térmica, precipitación e índice UV actuales.<br>• El pronóstico horario y el diario están disponibles y el rango de días es configurable entre 1 y 16.<br>• Los valores mostrados coinciden 100 % con la respuesta de la API (salvo redondeo de presentación).<br>• El UV se presenta con su categoría.<br>• Un valor nulo no rompe la interfaz.<br>• El estado de carga y los errores E-01 a E-05 se manejan correctamente. |
| **Requerimientos no funcionales** | **Rendimiento:** respuesta de la API < 500 ms (p95); renderizado tras la selección < 2 s.<br>**Fiabilidad:** ante fallo parcial, mostrar los datos disponibles.<br>**Seguridad:** renderizar datos externos como texto; sin claves en el cliente.<br>**Usabilidad:** valores con unidad visible; textos en español. |

---

### RF-02 · Búsqueda de ciudad por nombre

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Búsqueda de ciudad por nombre |
| **Código Identificación** | RF-02 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe permitir al usuario ubicar una ciudad ingresando su nombre, consultando el endpoint `/v1/search` de Open-Meteo, y manejar correctamente los resultados múltiples y los nombres homónimos.<br><br>Cada resultado debe mostrar nombre, región administrativa (`admin1`), país y coordenadas, de forma que el usuario distinga, por ejemplo, entre varias ciudades con el mismo nombre en distintos países.<br><br>Al elegir un resultado, la ubicación se establece como activa para el resto de los módulos. |
| **Justificación** | La búsqueda manual es el mecanismo principal de ubicación cuando el usuario no concede permiso de geolocalización o desea consultar otra ciudad. Manejar homónimos evita mostrar el clima de un lugar equivocado. |
| **Precondiciones** | • El navegador tiene conexión a internet.<br>• El endpoint `/v1/search` está disponible. |
| **Restricciones** | • Mínimo 2 caracteres para buscar.<br>• Máximo 10 resultados por consulta (`count=10`), idioma `language=es`.<br>• El texto ingresado se sanitiza y se codifica en la URL (`encodeURIComponent`); los resultados se renderizan como texto.<br>• Las solicitudes de búsqueda anteriores se cancelan al iniciar una nueva (`AbortController`).<br>• No se almacena el historial de búsquedas. |
| **Prioridad** | [X] Alta/Must [ ] Media/Should [ ] Baja/Could |
| **Dependencia** | Ninguna |
| **Actores** | Usuario del sistema, API Open-Meteo |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| nombre_ciudad | string (2–100) | Texto de búsqueda ingresado por el usuario. |
| resultado_seleccionado | object | Ubicación elegida: nombre, admin1, país, latitud, longitud, zona horaria, elevación. |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El usuario escribe el nombre de una ciudad en el campo de búsqueda.<br>2. El sistema valida longitud mínima y caracteres.<br>3. El sistema solicita `GET /v1/search?name=…&count=10&language=es&format=json` (con una pequeña espera tras dejar de escribir, ej. 300 ms).<br>4. El sistema presenta la lista de coincidencias con nombre, región, país y coordenadas.<br>5. Si hay un único resultado, el usuario lo confirma con un solo gesto; si hay varios, elige uno.<br>6. El sistema establece la ubicación activa y dispara RF-01.<br>7. La lista es navegable por teclado (flechas, Enter, Esc). |
| **Flujo alterno** | **Sin resultados** (la respuesta no contiene `results`): "No se encontraron ubicaciones para «[TEXTO]». Verifique la ortografía o pruebe con otro nombre."<br><br>**Texto demasiado corto o solo símbolos:** "Ingrese al menos 2 caracteres válidos."<br><br>**Múltiples homónimos:** el sistema no elige automáticamente; solicita al usuario seleccionar.<br><br>**Error de red, tiempo de espera, límite o fallo del servicio:** E-01 a E-05.<br><br>**Campo vacío al enviar:** "Escriba el nombre de una ciudad." |
| **Salida** | • Lista de ubicaciones coincidentes.<br>• Ubicación activa establecida para los demás módulos. |
| **Postcondiciones** | • La ubicación seleccionada queda disponible para RF-01, RF-04, RF-05, RF-06, RF-08 y RF-09. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• La búsqueda devuelve y muestra resultados coherentes con `/v1/search`.<br>• Los homónimos se distinguen por región y país, y el usuario debe elegir.<br>• La ausencia de resultados y los errores de red se informan sin romper la interfaz.<br>• La lista es operable solo con teclado.<br>• Entradas con caracteres especiales o scripts no ejecutan código (sin XSS). |
| **Requerimientos no funcionales** | **Rendimiento:** respuesta de búsqueda < 500 ms (p95); lista visible < 2 s.<br>**Seguridad:** sanitización de entrada y salida.<br>**Accesibilidad:** patrón combobox con roles ARIA y anuncio del número de resultados.<br>**Usabilidad:** mensajes claros en español. |

---

### RF-03 · Geolocalización automática

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Geolocalización automática por navegador |
| **Código Identificación** | RF-03 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe permitir obtener la ubicación del usuario mediante la API de geolocalización del navegador, a solicitud explícita del usuario, y usarla como ubicación activa para consultar el clima.<br><br>Debe manejar los tres desenlaces del permiso: **concedido**, **denegado** y **tiempo agotado** (además de posición no disponible y navegador sin soporte), ofreciendo siempre la alternativa de búsqueda manual (RF-02).<br><br>Como Open-Meteo no ofrece geocodificación inversa, la ubicación detectada se rotula como "Mi ubicación (lat, lon)" con las coordenadas redondeadas a 2 decimales. |
| **Justificación** | Reduce la fricción de uso: el usuario obtiene el clima de su ubicación sin escribir nada. Manejar todos los desenlaces del permiso garantiza que la aplicación sea utilizable aun cuando el usuario no conceda acceso. |
| **Precondiciones** | • La aplicación se sirve en un contexto seguro (HTTPS), requisito del navegador para geolocalización.<br>• El navegador soporta `navigator.geolocation`. |
| **Restricciones** | • La solicitud de permiso solo se dispara por acción explícita del usuario (botón "Usar mi ubicación"), no al cargar la página.<br>• Tiempo de espera de 10 s (`timeout: 10000`).<br>• Las coordenadas no se almacenan; solo se envían a Open-Meteo para la consulta.<br>• Si el permiso ya está denegado, no se reintenta la solicitud automáticamente. |
| **Prioridad** | [X] Alta/Must [ ] Media/Should [ ] Baja/Could |
| **Dependencia** | Ninguna |
| **Actores** | Usuario del sistema, Navegador, API Open-Meteo |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| accion_usuario | evento | Clic o activación del botón "Usar mi ubicación". |
| permiso_navegador | enum (concedido, denegado, sin respuesta) | Decisión del usuario en el aviso del navegador. |
| latitud / longitud | number | Coordenadas devueltas por el navegador. |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El usuario activa "Usar mi ubicación".<br>2. El sistema verifica soporte y contexto seguro.<br>3. El sistema invoca `getCurrentPosition` con timeout de 10 s y muestra un estado "Obteniendo ubicación…".<br>4. Si el permiso es concedido, el sistema recibe latitud y longitud.<br>5. El sistema establece la ubicación activa (rotulada con coordenadas) y dispara RF-01.<br>6. Si ocurre cualquier error, el sistema informa el motivo y traslada el foco al campo de búsqueda manual. |
| **Flujo alterno** | **Permiso denegado (PERMISSION_DENIED):** "No se pudo acceder a su ubicación porque el permiso fue denegado. Puede buscar su ciudad manualmente o habilitar el permiso en la configuración del navegador."<br><br>**Tiempo agotado (TIMEOUT):** "Se agotó el tiempo para obtener su ubicación. Intente de nuevo o busque su ciudad manualmente."<br><br>**Posición no disponible (POSITION_UNAVAILABLE):** "No fue posible determinar su ubicación en este momento."<br><br>**Navegador sin soporte o contexto no seguro:** el botón se deshabilita o se oculta y se muestra: "La geolocalización no está disponible en este navegador." La búsqueda manual sigue operativa.<br><br>**Error posterior en la consulta del clima:** E-01 a E-05. |
| **Salida** | • Ubicación activa basada en coordenadas del dispositivo.<br>• Clima de la ubicación detectada, o mensaje de error con alternativa manual. |
| **Postcondiciones** | • Ante cualquier desenlace, la interfaz permanece utilizable y el usuario puede continuar con búsqueda manual.<br>• Ninguna coordenada queda persistida por la aplicación. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• Con permiso concedido, se muestra el clima de la ubicación detectada.<br>• Con permiso denegado, tiempo agotado, posición no disponible o navegador sin soporte, se muestra el mensaje correspondiente y la búsqueda manual funciona.<br>• El permiso no se solicita sin acción explícita del usuario.<br>• No se producen errores no controlados en consola en ninguno de los escenarios. |
| **Requerimientos no funcionales** | **Privacidad:** las coordenadas solo se envían a Open-Meteo; se informa al usuario de este uso.<br>**Fiabilidad:** degradación controlada en todos los desenlaces del permiso.<br>**Compatibilidad:** verificado en Chrome, Firefox, Safari y Edge (escritorio y móvil).<br>**Usabilidad:** estado de carga visible y anunciado a lectores de pantalla. |

---

### RF-04 · Comparación entre ciudades

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Comparación del clima entre ciudades |
| **Código Identificación** | RF-04 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe permitir al usuario seleccionar dos o más ciudades (máximo 4, ver S-04) y presentar sus datos meteorológicos **lado a lado**: condiciones actuales y resumen del pronóstico diario, con las mismas variables, unidades, modelo y rango que RF-01.<br><br>Cada ciudad se agrega mediante la búsqueda de RF-02 (o la ubicación de RF-03 como una de ellas). Cada columna indica el nombre de la ciudad, su elevación (RF-08) y la hora local de actualización.<br><br>Los datos de cada ciudad deben ser consistentes con lo que la API devuelve para esa ubicación consultada de forma individual. |
| **Justificación** | Permite decidir entre destinos o entender diferencias entre lugares sin repetir consultas manuales. La consistencia con la API es indispensable para que la comparación sea confiable. |
| **Precondiciones** | • Conexión a internet.<br>• Al menos dos ubicaciones válidas seleccionadas. |
| **Restricciones** | • Mínimo 2 y máximo 4 ciudades.<br>• No se permite agregar la misma ubicación dos veces.<br>• Todas las ciudades usan las mismas unidades, modelo y `forecast_days`.<br>• Cada ciudad se consulta con `timezone=auto`; las horas se muestran en su zona local.<br>• Las consultas se ejecutan en paralelo en una misma ronda de actualización; el fallo de una no impide mostrar las demás. |
| **Prioridad** | [X] Alta/Must [ ] Media/Should [ ] Baja/Could |
| **Dependencia** | RF-01, RF-02, RF-10 |
| **Actores** | Usuario del sistema, API Open-Meteo |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| ciudades | array de objetos (2–4) | Lista de ubicaciones (nombre, latitud, longitud) a comparar. |
| dias_pronostico | integer (1–16) | Rango del resumen del pronóstico. |
| unidades | object | Unidades comunes a todas las ciudades (RF-10). |
| modelo | string | Modelo numérico común (RF-07). |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El usuario activa el modo comparación.<br>2. El usuario agrega ciudades mediante RF-02 (o RF-03).<br>3. El sistema valida cantidad (2–4) y ausencia de duplicados.<br>4. El sistema solicita en paralelo `/v1/forecast` para cada ciudad con parámetros idénticos.<br>5. El sistema muestra las ciudades lado a lado en una tabla semántica: filas = variables, columnas = ciudades.<br>6. El sistema indica la hora local de actualización de cada ciudad.<br>7. El usuario puede quitar una ciudad o agregar otra; el sistema actualiza sin recargar toda la vista.<br>8. En pantallas pequeñas, la tabla se desplaza horizontalmente dentro de su contenedor o se apila por ciudad. |
| **Flujo alterno** | **Menos de 2 ciudades:** "Agregue al menos dos ciudades para comparar."<br><br>**Más de 4 ciudades:** "Puede comparar hasta 4 ciudades a la vez."<br><br>**Ciudad duplicada:** "Esta ubicación ya está en la comparación."<br><br>**Fallo en una de las ciudades:** se muestra su columna con el error correspondiente (E-01 a E-05) y un botón Reintentar; las demás columnas se muestran normalmente.<br><br>**Variable nula en una ciudad:** se muestra "N/D" en esa celda. |
| **Salida** | • Vista comparativa con datos actuales y resumen del pronóstico de cada ciudad.<br>• Hora local de actualización por ciudad. |
| **Postcondiciones** | • Los valores de cada columna coinciden con la respuesta individual de la API para esa ubicación.<br>• La interfaz sigue operativa ante fallos parciales. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• Se pueden comparar de 2 a 4 ciudades lado a lado.<br>• Los datos de cada ciudad son idénticos a los obtenidos consultando esa ciudad de forma individual con los mismos parámetros.<br>• Las unidades y el modelo son los mismos para todas las columnas.<br>• Un fallo en una ciudad no impide ver las demás.<br>• La comparación es legible y operable en móvil y con teclado. |
| **Requerimientos no funcionales** | **Rendimiento:** comparación de 4 ciudades renderizada < 2 s con red normal.<br>**Precisión:** coincidencia 100 % con la API por ciudad.<br>**Accesibilidad:** tabla con encabezados `<th scope>` y descripción para lectores de pantalla.<br>**Fiabilidad:** manejo independiente de errores por ciudad. |

---

### RF-05 · Datos históricos

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Consulta de datos meteorológicos históricos |
| **Código Identificación** | RF-05 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe permitir consultar el clima de fechas pasadas para la ubicación activa mediante el endpoint de Historical Weather (`archive-api.open-meteo.com/v1/archive`).<br><br>El usuario elige una fecha (o un rango de hasta 31 días) y visualiza, como mínimo, temperatura máxima/mínima/media, precipitación acumulada, viento máximo y, cuando esté disponible, humedad. Además, puede **comparar** la fecha consultada contra otra fecha histórica o contra el clima actual (S-05).<br><br>Los datos deben corresponder **exactamente** a la fecha solicitada, sin desfases por zona horaria: la fecha se envía en formato `YYYY-MM-DD` y se interpreta en la zona horaria local de la ubicación (`timezone=auto`). |
| **Justificación** | Permite contrastar el clima actual con el pasado, revisar eventos previos y apoyar decisiones basadas en históricos. La exactitud de la fecha es crítica: un desfase de un día invalida la información. |
| **Precondiciones** | • Conexión a internet.<br>• Ubicación activa válida.<br>• El endpoint de archivo está disponible. |
| **Restricciones** | • Fecha mínima: 01/01/1940 (inicio de la cobertura de la API).<br>• Fecha máxima: hoy menos el retraso de disponibilidad de la API (margen configurable, por defecto 5 días).<br>• Rango máximo por consulta: 31 días.<br>• No se aceptan fechas futuras.<br>• Las fechas se muestran como DD/MM/AAAA y se envían como AAAA-MM-DD.<br>• Está prohibido convertir las fechas con `new Date()` en UTC; se usan las cadenas devueltas por la API. |
| **Prioridad** | [X] Alta/Must [ ] Media/Should [ ] Baja/Could |
| **Dependencia** | RF-02 o RF-03, RF-10 |
| **Actores** | Usuario del sistema, API Open-Meteo |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| latitud / longitud | number | Ubicación activa. |
| fecha_inicio | date (AAAA-MM-DD) | Primera fecha a consultar. |
| fecha_fin | date (AAAA-MM-DD) | Última fecha (igual a fecha_inicio si es un solo día). |
| fecha_comparacion | date, opcional | Segunda fecha histórica para comparar. |
| comparar_con_actual | boolean | Indica si se compara contra el clima actual. |
| unidades | object | Unidades activas (RF-10). |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El usuario abre la sección de históricos.<br>2. El usuario selecciona fecha (o rango) mediante un selector de fecha accesible.<br>3. El sistema valida el rango permitido.<br>4. El sistema solicita `GET /v1/archive?latitude=…&longitude=…&start_date=…&end_date=…&daily=…&timezone=auto` con las unidades activas.<br>5. El sistema verifica que las fechas devueltas coincidan con las solicitadas.<br>6. El sistema presenta los datos del día o rango.<br>7. Si el usuario activa comparar, el sistema realiza la segunda consulta (o usa RF-01 si compara con el actual) y muestra ambos conjuntos lado a lado con la diferencia por variable. |
| **Flujo alterno** | **Fecha futura:** "No es posible consultar fechas futuras. Consulte el pronóstico."<br><br>**Fecha anterior a 1940:** "Solo hay datos disponibles desde el 01/01/1940."<br><br>**Fecha reciente aún no disponible:** "Los datos de esa fecha aún no están disponibles. La última fecha consultable es [DD/MM/AAAA]."<br><br>**Rango mayor a 31 días:** "El rango máximo permitido es de 31 días."<br><br>**Fecha inicial posterior a la final:** "La fecha inicial no puede ser posterior a la final."<br><br>**Valores nulos en el periodo:** se muestra "N/D" para ese dato.<br><br>**Error de red, tiempo de espera, límite o fallo del servicio:** E-01 a E-05. |
| **Salida** | • Datos meteorológicos de la fecha o rango solicitado.<br>• Comparativo por variable cuando se activa la comparación. |
| **Postcondiciones** | • Cada dato mostrado corresponde exactamente a la fecha solicitada.<br>• La interfaz sigue operativa ante fechas inválidas o datos no disponibles. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• Los datos mostrados corresponden exactamente a la fecha solicitada, sin desfases de zona horaria (probado con ubicaciones en distintos husos horarios y fechas límite de día).<br>• Se puede consultar una fecha y compararla con otra fecha o con el clima actual.<br>• Las fechas fuera de rango o no disponibles se informan con mensajes claros.<br>• Los valores coinciden con la respuesta de la API (contrato). |
| **Requerimientos no funcionales** | **Rendimiento:** respuesta de la API < 500 ms (p95); render < 2 s.<br>**Precisión:** exactitud de fecha del 100 % en pruebas de contrato.<br>**Accesibilidad:** selector de fecha operable por teclado y con etiquetas.<br>**Fiabilidad:** validaciones de rango antes de llamar a la API. |

---

### RF-06 · Calidad del aire

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Consulta de la calidad del aire |
| **Código Identificación** | RF-06 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe mostrar la calidad del aire de la ubicación activa mediante la Air Quality API (`air-quality-api.open-meteo.com/v1/air-quality`): índice AQI, PM2.5, PM10, ozono (O₃) y otros contaminantes disponibles (NO₂, SO₂, CO).<br><br>El AQI (escala de EE. UU., ver S-02) no debe mostrarse solo como número: debe acompañarse de su **categoría e interpretación** y un mensaje de salud breve:<br>• 0–50 **Buena**<br>• 51–100 **Moderada**<br>• 101–150 **Dañina para grupos sensibles**<br>• 151–200 **Dañina**<br>• 201–300 **Muy dañina**<br>• ≥ 301 **Peligrosa**<br><br>La categoría se comunica con texto, color e ícono (no solo color). Se muestra además la tendencia horaria de las próximas 24 horas. |
| **Justificación** | La calidad del aire afecta directamente la salud y las actividades al aire libre. Un número sin interpretación no es útil para un usuario no experto. |
| **Precondiciones** | • Conexión a internet.<br>• Ubicación activa válida.<br>• La Air Quality API está disponible. |
| **Restricciones** | • Concentraciones en µg/m³ (CO incluido, según la API); no sujetas a conversión de unidades.<br>• Algunas regiones pueden no tener cobertura o valores nulos.<br>• La interpretación se basa únicamente en la escala definida en S-02.<br>• El mensaje de salud es informativo y no constituye consejo médico. |
| **Prioridad** | [X] Alta/Must [ ] Media/Should [ ] Baja/Could |
| **Dependencia** | RF-02 o RF-03 |
| **Actores** | Usuario del sistema, API Open-Meteo |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| latitud / longitud | number | Ubicación activa. |
| us_aqi | integer | Índice de calidad del aire (EE. UU.). |
| pm2_5 / pm10 | number (µg/m³) | Material particulado fino y grueso. |
| ozone | number (µg/m³) | Concentración de ozono. |
| nitrogen_dioxide, sulphur_dioxide, carbon_monoxide | number (µg/m³) | Otros contaminantes. |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El usuario abre la sección de calidad del aire (o se carga junto con la ubicación).<br>2. El sistema solicita `GET /v1/air-quality` con `current` y `hourly`, `timezone=auto`.<br>3. El sistema calcula la categoría a partir del valor de `us_aqi` con la tabla de rangos.<br>4. El sistema muestra AQI, categoría, mensaje de salud, contaminantes con su unidad y la tendencia de 24 h.<br>5. Si algún valor es nulo, muestra "N/D" en ese contaminante. |
| **Flujo alterno** | **Ubicación sin datos de calidad del aire (AQI nulo):** "La calidad del aire no está disponible para esta ubicación." El resto de la aplicación sigue operativa.<br><br>**Contaminante nulo:** se muestra "N/D" solo en ese campo.<br><br>**AQI fuera de rango esperado:** se muestra la categoría "Peligrosa" para valores ≥ 301 y "N/D" para valores negativos o no numéricos.<br><br>**Error de red, tiempo de espera, límite o fallo del servicio:** E-01 a E-05. |
| **Salida** | • AQI con categoría e interpretación.<br>• Valores de PM2.5, PM10, ozono y otros contaminantes.<br>• Tendencia horaria de 24 h. |
| **Postcondiciones** | • Toda cifra de AQI mostrada va acompañada de su categoría.<br>• Los valores coinciden con la respuesta de la API. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• Se muestran AQI, PM2.5, PM10, ozono y otros contaminantes disponibles.<br>• El AQI se presenta con su categoría (ej. "Buena", "Moderada", "Dañina") y no solo como número.<br>• La categoría no depende únicamente del color.<br>• La ausencia de datos se degrada de forma controlada sin romper la interfaz.<br>• Los valores coinciden 100 % con la API (AQI incluido). |
| **Requerimientos no funcionales** | **Precisión:** coincidencia 100 % del AQI con la API.<br>**Accesibilidad:** contraste AA en los colores de categoría; texto alternativo para el indicador.<br>**Rendimiento:** respuesta de la API < 500 ms (p95).<br>**Usabilidad:** mensaje de salud breve y en lenguaje simple. |

---

### RF-07 · Selección de modelo de predicción

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Selección del modelo numérico de predicción |
| **Código Identificación** | RF-07 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe ofrecer una opción avanzada (colapsada por defecto) para elegir el modelo numérico usado en el pronóstico, mediante el parámetro `models` del endpoint `/v1/forecast`.<br><br>Modelos disponibles: **Automático (`best_match`, por defecto)**, **ICON**, **GFS** y **ECMWF**. Los identificadores exactos de cada modelo deben validarse contra la documentación vigente de Open-Meteo durante el diseño.<br><br>El modelo activo se muestra visiblemente junto al pronóstico. La selección aplica a RF-01 y RF-04. |
| **Justificación** | Usuarios avanzados pueden preferir un modelo específico por su cobertura o precisión regional, y comparar el pronóstico entre modelos. |
| **Precondiciones** | • Ubicación activa válida.<br>• El endpoint `/v1/forecast` está disponible. |
| **Restricciones** | • Un modelo puede no cubrir todas las regiones o variables; en ese caso se retorna valores nulos.<br>• El modelo no aplica al histórico (RF-05) ni a la calidad del aire (RF-06).<br>• La respuesta debe procesarse considerando el sufijo con el nombre del modelo en las variables cuando corresponda.<br>• Los valores por defecto se restablecen al recargar la página (no se persisten). |
| **Prioridad** | [ ] Alta/Must [X] Media/Should [ ] Baja/Could |
| **Dependencia** | RF-01 |
| **Actores** | Usuario del sistema, API Open-Meteo |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| modelo | enum (best_match, ICON, GFS, ECMWF) | Modelo numérico elegido. Por defecto `best_match`. |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El usuario abre "Opciones avanzadas".<br>2. El sistema muestra la lista de modelos con una breve descripción de cada uno.<br>3. El usuario selecciona un modelo.<br>4. El sistema repite la consulta a `/v1/forecast` con el parámetro `models`.<br>5. El sistema actualiza el pronóstico y muestra el modelo activo. |
| **Flujo alterno** | **Modelo sin cobertura o variables nulas en la ubicación:** "El modelo [NOMBRE] no tiene datos para esta ubicación. Se muestran los datos disponibles o puede volver a Automático."<br><br>**Error de la API (modelo no soportado):** E-04 y se restablece `best_match`.<br><br>**Error de red, tiempo de espera, límite o fallo del servicio:** E-01 a E-05. |
| **Salida** | • Pronóstico calculado con el modelo elegido.<br>• Indicación visible del modelo en uso. |
| **Postcondiciones** | • El modelo elegido se aplica de forma consistente en RF-01 y RF-04.<br>• La interfaz sigue operativa si el modelo no tiene datos. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• El usuario puede elegir entre Automático, ICON, GFS y ECMWF.<br>• La solicitud incluye el parámetro `models` y los datos mostrados corresponden al modelo elegido.<br>• El modelo activo se ve en pantalla.<br>• La falta de cobertura del modelo se informa sin romper la interfaz. |
| **Requerimientos no funcionales** | **Usabilidad:** la opción avanzada no debe estorbar el flujo básico.<br>**Precisión:** coincidencia 100 % con la respuesta de la API por modelo.<br>**Accesibilidad:** control operable por teclado y con etiqueta. |

---

### RF-08 · Elevación / altitud

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Visualización de la elevación de la ubicación |
| **Código Identificación** | RF-08 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe mostrar la elevación (`elevation`, en metros sobre el nivel del mar) devuelta por la API para la ubicación consultada, como dato de contexto para interpretar diferencias de temperatura, especialmente en zonas montañosas.<br><br>En la comparación entre ciudades (RF-04), el sistema debe mostrar la elevación de cada ciudad y, cuando la diferencia supere 300 m, una nota informativa indicando que la altitud influye en la temperatura. |
| **Justificación** | Dos ciudades a distinta altitud pueden tener temperaturas muy diferentes; mostrar la elevación evita interpretaciones erróneas. |
| **Precondiciones** | • Ubicación activa válida.<br>• Respuesta de `/v1/forecast` disponible. |
| **Restricciones** | • El valor proviene de la API (modelo digital de terreno) y puede diferir de la altitud real puntual; se indica en una nota.<br>• Se muestra en metros; no está sujeto a la conversión de RF-10.<br>• Si el valor no existe en la respuesta, el resto de la interfaz no se ve afectada. |
| **Prioridad** | [ ] Alta/Must [X] Media/Should [ ] Baja/Could |
| **Dependencia** | RF-01 |
| **Actores** | Usuario del sistema, API Open-Meteo |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| elevation | number (m) | Elevación de la ubicación devuelta por la API. |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El sistema obtiene el campo `elevation` de la respuesta de `/v1/forecast`.<br>2. El sistema muestra "Elevación: [valor] m s. n. m." junto al nombre de la ubicación.<br>3. En modo comparación, muestra la elevación de cada ciudad y calcula la diferencia entre ellas.<br>4. Si la diferencia supera 300 m, muestra la nota informativa. |
| **Flujo alterno** | **Elevación ausente o nula:** se muestra "Elevación: no disponible" y se continúa normalmente.<br><br>**Valor no numérico:** se trata como ausente. |
| **Salida** | • Elevación de la ubicación en metros.<br>• Diferencia de elevación y nota, en modo comparación. |
| **Postcondiciones** | • El valor mostrado coincide con el devuelto por la API. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• Se muestra la elevación devuelta por la API.<br>• El valor coincide 100 % con la respuesta.<br>• Si no hay elevación, se muestra "no disponible" sin romper la interfaz.<br>• En la comparación se muestra la elevación de cada ciudad. |
| **Requerimientos no funcionales** | **Precisión:** coincidencia 100 % con la API (contrato).<br>**Fiabilidad:** degradación controlada ante datos ausentes.<br>**Usabilidad:** unidad y significado visibles. |

---

### RF-09 · Amanecer y atardecer

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Visualización de amanecer, atardecer y duración del día |
| **Código Identificación** | RF-09 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe mostrar, para cada día del pronóstico, la hora de salida del sol (`sunrise`), la hora de puesta (`sunset`) y la duración del día (`daylight_duration`) del bloque `daily` de `/v1/forecast`.<br><br>Las horas se muestran en la zona horaria local de la ubicación en formato 24 h (HH:mm) y la duración como "X h Y min". |
| **Justificación** | Es información útil para planificar actividades al aire libre y complementa el pronóstico. |
| **Precondiciones** | • Ubicación activa válida.<br>• Respuesta de `/v1/forecast` con bloque `daily`. |
| **Restricciones** | • Las horas se interpretan tal como las devuelve la API con `timezone=auto`; no se convierten desde UTC en el cliente.<br>• `daylight_duration` llega en segundos y se convierte para presentación.<br>• En latitudes polares pueden no existir salida o puesta en ciertos días. |
| **Prioridad** | [ ] Alta/Must [X] Media/Should [ ] Baja/Could |
| **Dependencia** | RF-01 |
| **Actores** | Usuario del sistema, API Open-Meteo |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| sunrise | datetime (ISO 8601, hora local) | Hora de salida del sol. |
| sunset | datetime (ISO 8601, hora local) | Hora de puesta del sol. |
| daylight_duration | number (segundos) | Duración del día. |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El sistema toma `sunrise`, `sunset` y `daylight_duration` del bloque `daily`.<br>2. El sistema formatea las horas (HH:mm) y la duración (X h Y min).<br>3. El sistema las muestra en el panel del día actual y en cada día del pronóstico diario. |
| **Flujo alterno** | **Salida/puesta no disponibles (nulas):** "Sin salida o puesta del sol en esta fecha" o "No disponible", según el caso; el resto de datos del día se muestra normalmente.<br><br>**Duración nula:** se muestra "No disponible". |
| **Salida** | • Hora de amanecer y atardecer por día.<br>• Duración del día. |
| **Postcondiciones** | • Los valores mostrados coinciden con los de la API, expresados en hora local de la ubicación. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• Se muestran amanecer, atardecer y duración del día para el día actual y los días del pronóstico.<br>• Los valores coinciden 100 % con la respuesta de la API y están en la hora local de la ubicación.<br>• Si no están disponibles, se degrada con un mensaje sin romper la interfaz. |
| **Requerimientos no funcionales** | **Precisión:** coincidencia 100 % con la API (sunrise/sunset).<br>**Fiabilidad:** manejo de valores nulos.<br>**Accesibilidad:** las horas incluyen etiqueta textual ("Amanecer", "Atardecer"), no solo íconos. |

---

### RF-10 · Conversión de unidades

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Conversión de unidades de medida |
| **Código Identificación** | RF-10 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe permitir al usuario cambiar las unidades de visualización:<br>• Temperatura: **°C / °F**<br>• Velocidad del viento: **km/h / mph**<br>• Precipitación: **mm / pulgadas (in)** (ver S-07)<br><br>El cambio se aplica de inmediato a todos los módulos (clima actual, pronóstico, comparación, histórico y exportación). Las conversiones las realiza la API mediante los parámetros `temperature_unit`, `wind_speed_unit` y `precipitation_unit`, para no introducir errores de cálculo en el cliente.<br><br>Las unidades por defecto son °C, km/h y mm. La preferencia se guarda localmente en el navegador (S-01). |
| **Justificación** | Usuarios de distintas regiones usan sistemas de unidades diferentes; ofrecer ambos evita interpretaciones erróneas de los valores. |
| **Precondiciones** | • Ninguna para cambiar la preferencia.<br>• Para ver datos convertidos, debe existir una consulta activa. |
| **Restricciones** | • Solo se guarda la preferencia de unidades (sin datos de clima ni de ubicación).<br>• Si `localStorage` no está disponible, se usan los valores por defecto sin error.<br>• Las unidades siempre son visibles junto a cada valor.<br>• No afecta a la elevación (m) ni a las concentraciones de contaminantes (µg/m³). |
| **Prioridad** | [ ] Alta/Must [X] Media/Should [ ] Baja/Could |
| **Dependencia** | RF-01 |
| **Actores** | Usuario del sistema |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| unidad_temperatura | enum (celsius, fahrenheit) | Unidad de temperatura. |
| unidad_viento | enum (kmh, mph) | Unidad de velocidad del viento. |
| unidad_precipitacion | enum (mm, inch) | Unidad de precipitación. |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. El usuario abre el selector de unidades.<br>2. El usuario elige una o más unidades.<br>3. El sistema actualiza la preferencia y la guarda localmente.<br>4. El sistema repite las consultas activas con los parámetros de unidad correspondientes.<br>5. El sistema actualiza los valores y sus etiquetas de unidad en todos los módulos, conservando la ubicación y el contexto.<br>6. Al abrir la aplicación de nuevo, el sistema aplica la preferencia guardada. |
| **Flujo alterno** | **Almacenamiento local no disponible o bloqueado:** se usan las unidades por defecto y la aplicación funciona con normalidad.<br><br>**Valor guardado inválido o alterado:** se ignora y se restablecen los valores por defecto.<br><br>**Error al reconsultar:** E-01 a E-05; se conservan los últimos datos y su unidad anterior claramente rotulada. |
| **Salida** | • Todos los valores expresados en las unidades elegidas.<br>• Preferencia guardada para futuras visitas. |
| **Postcondiciones** | • Ningún valor se muestra con una unidad distinta a la seleccionada.<br>• La preferencia persiste entre sesiones. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• El usuario puede alternar °C/°F, km/h/mph y mm/in.<br>• El cambio se refleja en todos los módulos sin perder la ubicación.<br>• Los valores convertidos coinciden con los devueltos por la API con esos parámetros.<br>• La preferencia se conserva al recargar y un valor inválido no rompe la aplicación. |
| **Requerimientos no funcionales** | **Rendimiento:** actualización visible < 2 s.<br>**Precisión:** conversión realizada por la API, sin cálculos propios.<br>**Accesibilidad:** control operable por teclado, con estado actual anunciado. |

---

### RF-11 · Accesibilidad, diseño adaptable y contenido en español

| Campo | Detalle |
|---|---|
| **Título Requerimiento** | Accesibilidad, diseño responsive e internacionalización (español) |
| **Código Identificación** | RF-11 |
| **Versión** | 1.0 |
| **Fuente** | Stakeholders del sistema |
| **Descripción** | El sistema debe cumplir, en todas sus funcionalidades, con los siguientes atributos de interfaz:<br><br>**Accesibilidad (WCAG 2.1 AA):** navegación completa por teclado con foco visible y orden lógico, enlace "saltar al contenido", HTML semántico, roles y etiquetas ARIA, anuncio de resultados y errores mediante regiones vivas (`role="status"` / `role="alert"`), contraste mínimo 4.5:1 en texto y 3:1 en componentes de interfaz, información no transmitida solo por color, respeto de `prefers-reduced-motion`.<br><br>**Diseño adaptable:** uso correcto desde 320 px de ancho, sin desplazamiento horizontal de la página, con zoom hasta 200 %, y áreas táctiles de al menos 44 × 44 px.<br><br>**Idioma e i18n:** todo el contenido y los mensajes en español (`lang="es"`), con fechas, horas y números en formato regional (DD/MM/AAAA, 24 h). Los textos se externalizan en un archivo de recursos para facilitar la adición futura de otros idiomas. |
| **Justificación** | Garantiza que la aplicación sea utilizable por personas con distintas capacidades y en cualquier dispositivo, y sustenta el cumplimiento de los umbrales de Lighthouse Accessibility. |
| **Precondiciones** | • Aplica a todas las pantallas y componentes de la aplicación. |
| **Restricciones** | • Ningún texto visible al usuario puede estar escrito directamente en el código de los componentes; debe provenir del archivo de recursos.<br>• Los gráficos e íconos deben tener alternativa textual.<br>• Las validaciones se realizan con herramientas automáticas y pruebas manuales con lector de pantalla. |
| **Prioridad** | [X] Alta/Must [ ] Media/Should [ ] Baja/Could |
| **Dependencia** | Todos los RF |
| **Actores** | Usuario del sistema |

**Entradas**

| Variable | Tipo de dato | Descripción |
|---|---|---|
| dispositivo_viewport | object | Ancho/alto de pantalla y densidad. |
| preferencias_navegador | object | `prefers-reduced-motion`, zoom, esquema de color. |
| dispositivo_entrada | enum (teclado, táctil, puntero, lector de pantalla) | Modo de interacción del usuario. |

| Campo | Detalle |
|---|---|
| **Proceso** | 1. La aplicación carga con `lang="es"` y textos del archivo de recursos.<br>2. El diseño se adapta al ancho disponible mediante CSS responsive.<br>3. El usuario navega con teclado; el foco es siempre visible y sigue un orden lógico.<br>4. Los cambios dinámicos (resultados, errores, cargas) se anuncian con regiones vivas.<br>5. Las fechas, horas y números se formatean con la configuración regional en español.<br>6. Las pruebas de accesibilidad y de responsive se ejecutan sobre cada RF antes de la entrega. |
| **Flujo alterno** | **Navegador con animaciones reducidas:** se desactivan transiciones no esenciales.<br><br>**Zoom del 200 % o pantalla de 320 px:** el contenido se reorganiza sin pérdida de información ni desplazamiento horizontal de la página.<br><br>**Contenido dinámico sin texto alternativo detectado:** se considera defecto y bloquea la entrega si es crítico. |
| **Salida** | • Interfaz accesible, adaptable y en español.<br>• Informe de pruebas de accesibilidad y responsive. |
| **Postcondiciones** | • La aplicación es utilizable con teclado, lector de pantalla y en dispositivos móviles. |
| **Criterios de aceptación** | El requerimiento se considera cumplido cuando:<br>• Lighthouse Accessibility > 90 y sin incumplimientos críticos en axe.<br>• Toda funcionalidad es operable solo con teclado.<br>• Contraste WCAG AA verificado en todos los componentes.<br>• Sin desplazamiento horizontal de página a 320 px ni a 200 % de zoom.<br>• Todos los textos visibles están en español y provienen del archivo de recursos.<br>• Pruebas manuales con NVDA/VoiceOver sin bloqueos en los flujos principales. |
| **Requerimientos no funcionales** | **Accesibilidad:** WCAG 2.1 AA.<br>**Compatibilidad:** Chrome, Firefox, Safari y Edge, en escritorio y móvil.<br>**Mantenibilidad:** textos externalizados para i18n futura. |

---

## 4. Requerimientos no funcionales transversales

| Código | Categoría | Requerimiento | Métrica / Objetivo | Herramienta | RF relacionados |
|---|---|---|---|---|---|
| RNF-01 | Rendimiento API | Las llamadas a los endpoints de Open-Meteo deben responder en condiciones normales de red. | Tiempo de respuesta p95 < 500 ms | k6, JMeter | RF-01 a RF-06, RF-07 |
| RNF-02 | Rendimiento UI | Carga inicial de la interfaz (definida como FCP, S-11). | < 3 s | Lighthouse, DevTools | Todos |
| RNF-03 | Rendimiento UI | Renderizado de resultados tras una búsqueda o cambio de ubicación. | < 2 s | DevTools | RF-01, RF-02, RF-03, RF-04 |
| RNF-04 | Calidad Lighthouse | Puntajes de Performance, Accessibility y Best Practices. | > 90 en cada categoría | Lighthouse | Todos |
| RNF-05 | Calidad de código | Cobertura de pruebas automatizadas del código fuente. | > 80 % | Jest / Vitest coverage | Todos |
| RNF-06 | Seguridad | Sin vulnerabilidades críticas: XSS (datos externos y parámetros de URL renderizados solo como texto), cabeceras HTTP seguras (CSP, HSTS, X-Content-Type-Options, Referrer-Policy), dependencias sin vulnerabilidades críticas. | 0 vulnerabilidades críticas | OWASP ZAP, Snyk | Todos |
| RNF-07 | Privacidad | Las coordenadas solo se envían a Open-Meteo; no se persisten, no se registran ni se envían a analítica. Se muestra un aviso breve de que la ubicación se envía a servicios de terceros. | 0 fugas de coordenadas en pruebas | DevTools (Network), OWASP ZAP | RF-02, RF-03 |
| RNF-08 | Compatibilidad | Funcionamiento verificado en las dos últimas versiones estables (S-12). | Chrome, Firefox, Safari y Edge; escritorio y móvil | BrowserStack o equivalente | Todos |
| RNF-09 | Estabilidad | Uso continuo sin degradación ni fugas de memoria. | 2 h de uso sin fugas | DevTools (Memory) | Todos |
| RNF-10 | Concurrencia | Soporte de usuarios simultáneos sobre el sitio estático y las llamadas a la API. Se deben verificar los límites vigentes de uso gratuito de Open-Meteo para evitar respuestas 429. | 50 usuarios simultáneos | k6, JMeter | RF-01 a RF-06 |
| RNF-11 | Precisión de datos | Los datos mostrados deben coincidir con la respuesta de la API (solo se permite redondeo de presentación a 1 decimal). | 100 % en temperatura, viento, AQI, elevación y sunrise/sunset | Pruebas de contrato / schema | RF-01, RF-04, RF-05, RF-06, RF-08, RF-09 |
| RNF-12 | Resiliencia | Estados de carga, vacío y error definidos; cancelación de solicitudes obsoletas; tiempo de espera de 10 s; reintento manual; espera antes de reintentar ante HTTP 429. | Todos los errores E-01 a E-05 cubiertos | Pruebas automatizadas, DevTools | Todos |
| RNF-13 | Licencias y atribución | Atribución visible a Open-Meteo (CC BY 4.0); uso conforme a los términos (Open-Meteo gratuito solo para uso no comercial). | Atribuciones presentes en 100 % de las vistas | Revisión manual | Todos |
| RNF-14 | Disponibilidad / Hosting | La aplicación se sirve por HTTPS (requisito de geolocalización) desde hosting estático. | 100 % del tráfico por HTTPS | Revisión de despliegue, Lighthouse | RF-03 |
| RNF-15 | Cobertura de pruebas funcionales | Ejecución de casos de prueba documentados. | Críticos 100 %; totales ≥ 95 %; ningún caso crítico "no ejecutado" o "bloqueado" | Gestión de casos | Todos |
| RNF-16 | Calidad al entregar | Defectos abiertos al momento de la entrega. | 0 bugs críticos o bloqueantes | Gestor de incidencias | Todos |
| RNF-17 | Aceptación | Aprobación de la prueba de aceptación de usuario. | UAT aprobado por el Product Owner/docente | Acta de UAT | Todos |

---

## 5. Trazabilidad con la descripción original

| # en la descripción | Funcionalidad | Requerimiento |
|---|---|---|
| 1 | Consulta de clima actual y pronóstico | RF-01 |
| 2 | Búsqueda de ciudad por nombre | RF-02 |
| 2 | Geolocalización automática | RF-03 |
| 3 | Comparación entre ciudades | RF-04 |
| 4 | Datos históricos | RF-05 |
| 5 | Calidad del aire | RF-06 |
| 7 | Selección de modelo de predicción | RF-07 |
| 8 | Elevación / altitud | RF-08 |
| 9 | Amanecer y atardecer | RF-09 |
| 11 | Conversión de unidades | RF-10 |
| 12 | Accesibilidad, responsive e i18n | RF-11 |
| 6 | Mapas meteorológicos / radar | **Eliminado del alcance** |
| 10 | Exportar / compartir pronóstico | **Eliminado del alcance** |
| — | Caché local / modo offline | **Fuera de alcance** |
