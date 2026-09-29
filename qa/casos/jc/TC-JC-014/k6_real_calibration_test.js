import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const rate429 = new Rate('real_api_429_rate');
const realLatency = new Trend('real_api_latency_ms');

export const options = {
  scenarios: {
    real_api_calibration: {
      executor: 'constant-vus',
      vus: 5,
      duration: '20s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    real_api_429_rate: ['rate==0'], // 0% de respuestas 429
  },
};

export default function () {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=2.9273&longitude=-75.2819&current=temperature_2m,relative_humidity_2m&daily=sunrise,sunset,daylight_duration&timezone=auto';

  const res = http.get(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'k6-calibration-TC-JC-014',
    },
  });

  const is429 = res.status === 429;
  const isOk = res.status === 200;

  rate429.add(is429);
  realLatency.add(res.timings.duration);

  check(res, {
    'status es 200': (r) => r.status === 200,
    'sin error 429 (límite de cuota)': (r) => r.status !== 429,
    'respuesta contiene daily': (r) => r.body && r.body.includes('daily'),
  });

  sleep(2);
}
