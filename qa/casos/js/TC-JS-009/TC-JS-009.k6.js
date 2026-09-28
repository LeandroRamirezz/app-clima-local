import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * CASO DE PRUEBA: TC-JS-009
 * Nombre / Escenario: Rendimiento del endpoint de geocodificación
 * Endpoint o módulo: GET /v1/search (Geocoding API Open-Meteo) / RNF-01
 * Tipo de prueba: Rendimiento
 * Prioridad del caso: Media
 * Diseñado por: Juan Sebastián Gutiérrez Tobar – 27/09/2026
 * Bloque: js
 * Herramienta: k6
 *
 * Objetivo:
 * Medir el tiempo de respuesta del endpoint de geocodificación ejecutando 100 peticiones
 * y verificando que el p95 sea inferior a 500 ms (RNF-01).
 */

export const options = {
  scenarios: {
    geocoding_performance: {
      executor: 'shared-iterations',
      vus: 2,
      iterations: 100,
      maxDuration: '1m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // Criterio de aceptación RNF-01: p95 < 500 ms
    http_req_failed: ['rate<0.01'],   // Menos de 1% de errores
  },
};

const CITIES = ['Bogotá', 'Medellín', 'Cali'];

export default function () {
  // Rotar entre Bogotá, Medellín y Cali
  const city = CITIES[__ITER % CITIES.length];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=es&format=json`;

  const res = http.get(url, {
    tags: { name: 'GeocodingSearch' },
    timeout: '10s',
  });

  check(res, {
    'status es 200': (r) => r.status === 200,
    'tiempo < 500ms': (r) => r.timings.duration < 500,
    'contiene results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.results) && body.results.length > 0;
      } catch {
        return false;
      }
    },
  });

  // Breve pausa para no saturar la cuota por segundo
  sleep(0.05);
}
