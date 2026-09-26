---
version: alpha
colors:
  ink: "#172d34"
  muted: "#536b72"
  accent: "#0f6675"
  accentHover: "#0a4d59"
  surface: "#ffffff"
  canvas: "#f2f6f5"
  border: "#d2dddd"
  focus: "#b76832"
typography:
  display:
    fontFamily: "Bahnschrift, Aptos Display, Segoe UI, sans-serif"
  body:
    fontFamily: "Aptos, Segoe UI, system-ui, sans-serif"
  data:
    fontFamily: "Bahnschrift, Aptos, Segoe UI, sans-serif"
rounded:
  panel: "0.75rem"
  control: "0.375rem"
spacing:
  page: "clamp(1rem, 3vw, 2.5rem)"
components:
  primaryControl:
    backgroundColor: "#0f6675"
    foregroundColor: "#ffffff"
    borderRadius: "0.375rem"
  dataPanel:
    backgroundColor: "#ffffff"
    borderColor: "#d2dddd"
    borderRadius: "0.75rem"
---

## Overview

An observatory for exploring Open-Meteo data in Spanish. Students and everyday users should find a location, read its weather, then move to comparison, historical records or air quality without losing context. This is a product tool, not a marketing page or a generic analytics dashboard. The visual signature is a small station mark with pressure-contour lines and a measured horizon rule. The data remains the main event.

## Colors

Cool mist canvas, white data surfaces, dark blue-green ink, and one deep teal interaction accent. Fine gray-green rules establish measurement and grouping. Warm copper is reserved for keyboard focus; error, UV and AQI hues remain semantic and compact. `src/styles.css` owns the runtime CSS variables; this file mirrors their accepted values.

## Typography

Use Bahnschrift for compact display headings and tabular readings, Aptos/Segoe UI for prose and controls. System fallbacks avoid font loading and preserve privacy and performance. Labels are quiet; readings have measured scale and tabular figures. Do not set every label and value in semibold.

## Layout

Desktop: a broad, centered observatory surface with location controls above one persistent four-area navigation: Clima, Comparar, Históricos, Calidad del aire. Only the active work area occupies the main canvas. Current weather leads; forecast controls sit with the forecast. Narrow screens retain the same order, wrap navigation in a two-column grid and stack data. Tables may scroll within their own labeled container; the page must reflow at 320px.

## Elevation & Depth

Mostly flat surfaces with a 1px rule. A faint shadow may distinguish the location tray from the canvas; do not cast shadows on every forecast row. Use whitespace, alignment and typography before depth.

## Shapes

Panels have a 0.75rem radius, controls 0.375rem. Data rows and tables use straighter inner boundaries. Avoid pills except existing semantic AQI categories. Targets remain comfortably usable by touch and keyboard.

## Components

`src/styles.css` defines semantic tokens, global control/focus/scrollbar behavior and shell geometry. Component styles consume those variables. `CurrentWeather` owns the four-area navigation and shared forecast preferences; it does not own API transport. Native selects and date fields remain platform-owned by `premium-ui.json`; CitySearch retains its accessible authored combobox. Pending, empty and error states have stable text and a route to recovery.

## Do's and Don'ts

- Keep weather units, local API times, attribution and unavailable values explicit.
- Render external data as text. Keep the original accessible names of tested controls.
- Use condition icons as supporting marks; the condition text is always visible.
- Keep the location and four areas easy to find on a phone.
- Avoid large gradient heroes, decorative cards for each number, emoji and motion without a task purpose.
