# Guía de Instalación de Herramientas QA Externas (No-npm)

Este documento detalla exclusivamente la instalación y configuración de las herramientas de prueba que **NO** se gestionan a través de `npm` / `package.json`.

---

## 1. k6 (Pruebas de Rendimiento y Carga)

`k6` es una herramienta de pruebas de carga desarrollada en Go que se distribuye como binario independiente.

### Instalación por sistema operativo

#### Windows
- **Vía Winget (Recomendado):**
  ```powershell
  winget install k6 --source winget
  ```
- **Vía Chocolatey:**
  ```powershell
  choco install k6
  ```
- **Binario directo:**
  Descargar el instalador `.msi` o binario `.zip` desde el repositorio oficial:
  [https://github.com/grafana/k6/releases](https://github.com/grafana/k6/releases)

#### macOS
- **Vía Homebrew:**
  ```bash
  brew install k6
  ```

#### Linux (Debian / Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Verificación de instalación
```bash
k6 version
```

### Ejemplo de ejecución de un caso
```bash
k6 run qa/casos/jc/TC-JC-014/TC-JC-014.k6.js --summary-export=qa/casos/jc/TC-JC-014/resultados/TC-JC-014__2026-09-27__run01.json
```

---

## 2. OWASP ZAP (Pruebas de Seguridad DAST - Docker)

OWASP Zed Attack Proxy (ZAP) se ejecuta utilizando la imagen oficial de contenedor Docker `zaproxy/zap-stable`, evitando instalar Java u otros componentes locales.

### Prerrequisitos
- Docker Engine o Docker Desktop instalado y en ejecución en el sistema.

### Descarga de la imagen oficial
```bash
docker pull zaproxy/zap-stable
```

### Ejecución de escaneos

#### Escaneo pasivo / Baseline sobre el ambiente QA
```bash
docker run -t zaproxy/zap-stable zap-baseline.py -t https://app-clima-local.vercel.app
```

#### Escaneo completo con generación de reporte montado en volumen local
```bash
docker run -v ${PWD}:/zap/wrk/:rw -t zaproxy/zap-stable zap-full-scan.py -t https://app-clima-local.vercel.app -r reporte-seguridad.html
```

---

## 3. NVDA / VoiceOver (Lectores de Pantalla para Pruebas Manuales de Accesibilidad)

Estas herramientas forman parte del entorno del sistema operativo y no admiten automatización headless tradicional; se evalúan de forma manual.

### NVDA (NonVisual Desktop Access) — Windows
- **Naturaleza:** Lector de pantalla de código abierto para sistemas Microsoft Windows.
- **Descarga e instalación:**
  - Descargar instalador oficial desde: [https://www.nvaccess.org/download/](https://www.nvaccess.org/download/)
  - Ejecutar el instalador y seguir el asistente.
- **Atajos principales:**
  - Iniciar / reiniciar NVDA: `Ctrl + Alt + N`
  - Salir de NVDA: `Insert + Q` (o tecla `Bloq Mayús + Q`)
  - Silenciar habla actual: `Ctrl`
  - Navegar por encabezados: `H`
  - Navegar por botones o controles: `B` o `Tab`

### VoiceOver — macOS / iOS
- **Naturaleza:** Lector de pantalla integrado nativamente en el sistema operativo Apple.
- **Instalación:** No requiere instalación (viene preinstalado en macOS).
- **Atajos principales:**
  - Activar / desactivar VoiceOver: `Command + F5` (o triple pulsación en Touch ID)
  - Teclas modificadoras VoiceOver (VO): `Control + Option`
  - Abrir el rotor de VoiceOver (para navegar encabezados, landmarks, enlaces): `VO + U`
  - Leer siguiente elemento: `VO + Flecha Derecha`
  - Leer elemento anterior: `VO + Flecha Izquierda`
