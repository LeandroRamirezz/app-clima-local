import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';

/**
 * CASO DE PRUEBA: TC-SS-014
 * Nombre / Escenario: Tiempo de respuesta p95 < 500 ms de /v1/archive y /v1/air-quality
 * Endpoint o módulo: GET /v1/archive y GET /v1/air-quality — RNF-01
 * Tipo de prueba: Rendimiento
 * Prioridad del caso: Alta
 * Diseñado por: Sara Sofía González Gómez – 27/09/2026
 * Bloque: ss
 * Herramienta: k6
 *
 * Objetivo:
 * Verificar que el percentil 95 del tiempo de respuesta de los dos endpoints del bloque SS sea menor a
 * 500 ms en condiciones normales de red, sin exceder los límites del plan gratuito de Open-Meteo.
 *
 * Carga: 1 VU por endpoint, 1 solicitud cada 2 s durante 5 minutos (≈ 150 solicitudes por endpoint,
 * ≈ 60/min en total), muy por debajo de los límites gratuitos (600/min, 5 000/h, 10 000/día).
 */

const DURATION = __ENV.DURATION || '5m';

export const options = {
  scenarios: {
    archive: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '2s',
      duration: DURATION,
      preAllocatedVUs: 1,
      maxVUs: 1,
      exec: 'archive',
      tags: { endpoint: 'archive' },
    },
    air: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '2s',
      duration: DURATION,
      preAllocatedVUs: 1,
      maxVUs: 1,
      exec: 'air',
      tags: { endpoint: 'air' },
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'count'],
  thresholds: {
    'http_req_duration{endpoint:archive}': ['p(95)<500'], // RNF-01
    'http_req_duration{endpoint:air}': ['p(95)<500'],     // RNF-01
    'http_req_failed{endpoint:archive}': ['rate<0.01'],   // Tasa de error < 1 %
    'http_req_failed{endpoint:air}': ['rate<0.01'],
    'respuestas_429{endpoint:archive}': ['count==0'],     // 0 respuestas 429
    'respuestas_429{endpoint:air}': ['count==0'],
  },
};

const respuestas429 = new Counter('respuestas_429');
const bodyValido = new Rate('body_valido');

const LOCATIONS = [
  { name: 'Neiva', lat: 2.9273, lon: -75.2819 },
  { name: 'Bogotá', lat: 4.6097, lon: -74.0817 },
  { name: 'Tokio', lat: 35.6895, lon: 139.6917 },
];
const DATES = ['2026-09-15', '2024-01-01', '2024-02-29'];
const ARCHIVE_DAILY = 'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean';
const AIR_CURRENT = 'us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide';

function record(res, endpoint, validator) {
  if (res.status === 429) respuestas429.add(1, { endpoint });
  let ok = false;
  try { ok = validator(JSON.parse(res.body)); } catch { ok = false; }
  bodyValido.add(ok, { endpoint });
  check(res, {
    [`${endpoint}: status 200`]: (r) => r.status === 200,
    [`${endpoint}: cuerpo válido`]: () => ok,
  }, { endpoint });
}

export function archive() {
  // Rotación: 3 ubicaciones × 3 fechas (9 combinaciones)
  const i = __ITER;
  const loc = LOCATIONS[i % LOCATIONS.length];
  const date = DATES[Math.floor(i / LOCATIONS.length) % DATES.length];
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${loc.lat}&longitude=${loc.lon}&start_date=${date}&end_date=${date}&daily=${ARCHIVE_DAILY}&timezone=auto`;
  const res = http.get(url, { tags: { endpoint: 'archive', name: 'GET /v1/archive' }, timeout: '10s' });
  record(res, 'archive', (b) => Array.isArray(b.daily?.time) && b.daily.time[0] === date);
}

export function air() {
  const loc = LOCATIONS[__ITER % LOCATIONS.length];
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=${AIR_CURRENT}&hourly=us_aqi&forecast_days=2&timezone=auto`;
  const res = http.get(url, { tags: { endpoint: 'air', name: 'GET /v1/air-quality' }, timeout: '10s' });
  record(res, 'air', (b) => b.current !== undefined && Array.isArray(b.hourly?.us_aqi));
}
