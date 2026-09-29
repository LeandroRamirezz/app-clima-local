import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Métricas personalizadas
const rate429 = new Rate('http_429_rate');
const errorRate = new Rate('error_rate');
const latencyTrend = new Trend('custom_latency_ms');

export const options = {
  scenarios: {
    concurrency_100_vus: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% de fallos
    http_req_duration: ['p(95)<500'], // p95 < 500 ms en mock local
    http_429_rate: ['rate==0'], // 0% de errores 429 (Too Many Requests)
  },
};

export default function () {
  const url = 'http://127.0.0.1:3456/v1/forecast?latitude=2.9273&longitude=-75.2819&current=temperature_2m,relative_humidity_2m&daily=sunrise,sunset,daylight_duration&timezone=auto';

  const res = http.get(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'k6-load-test-TC-JC-014',
    },
  });

  const is429 = res.status === 429;
  const isOk = res.status === 200;

  rate429.add(is429);
  errorRate.add(!isOk);
  latencyTrend.add(res.timings.duration);

  check(res, {
    'status es 200': (r) => r.status === 200,
    'sin error 429': (r) => r.status !== 429,
    'respuesta contiene json valido': (r) => r.body && r.body.includes('America/Bogota'),
  });

  // Pausa realista entre peticiones para simular comportamiento de usuario en SPA
  sleep(1);
}
