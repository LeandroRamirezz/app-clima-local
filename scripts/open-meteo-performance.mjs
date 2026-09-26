import { performance } from 'node:perf_hooks';

const FREE_TIER_MAX_CALLS_PER_MINUTE = 600;
const MAX_SAMPLES = 50;
const MAX_CONCURRENCY = 50;

function readPositiveInteger(name, fallback, maximum) {
  const argument = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!argument) return fallback;
  const value = Number(argument.slice(name.length + 3));
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`--${name} debe ser un entero entre 1 y ${maximum}.`);
  }
  return value;
}

const samples = readPositiveInteger('samples', 10, MAX_SAMPLES);
const concurrency = readPositiveInteger('concurrency', 2, MAX_CONCURRENCY);
if (samples > FREE_TIER_MAX_CALLS_PER_MINUTE) {
  throw new Error('La cantidad de muestras excede el límite gratuito por minuto configurado.');
}

const today = new Date();
today.setDate(today.getDate() - 10);
const archiveDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
const coordinates = { latitude: '4.711', longitude: '-74.0721' };

function makeUrl(base, parameters) {
  const url = new URL(base);
  url.search = new URLSearchParams({ ...coordinates, ...parameters }).toString();
  return url;
}

const endpoints = [
  {
    name: 'Forecast',
    url: makeUrl('https://api.open-meteo.com/v1/forecast', {
      current: 'temperature_2m',
      hourly: 'temperature_2m',
      daily: 'temperature_2m_max',
      timezone: 'auto',
      forecast_days: '1',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      precipitation_unit: 'mm',
      models: 'best_match',
    }),
  },
  {
    name: 'Geocoding',
    url: makeUrl('https://geocoding-api.open-meteo.com/v1/search', {
      name: 'Neiva', count: '10', language: 'es', format: 'json',
    }),
  },
  {
    name: 'Archive',
    url: makeUrl('https://archive-api.open-meteo.com/v1/archive', {
      start_date: archiveDate,
      end_date: archiveDate,
      daily: 'temperature_2m_max,temperature_2m_min',
      timezone: 'auto',
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      precipitation_unit: 'mm',
    }),
  },
  {
    name: 'Air Quality',
    url: makeUrl('https://air-quality-api.open-meteo.com/v1/air-quality', {
      current: 'us_aqi',
      hourly: 'us_aqi',
      forecast_hours: '24',
      timezone: 'auto',
    }),
  },
];

async function measure(url) {
  const startedAt = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  await response.arrayBuffer();
  const elapsedMs = performance.now() - startedAt;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return elapsedMs;
}

async function collect(endpoint) {
  const durations = [];
  const errors = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, samples) }, async () => {
    while (cursor < samples) {
      const sampleNumber = cursor;
      cursor += 1;
      try {
        durations[sampleNumber] = await measure(endpoint.url);
      } catch (error) {
        errors[sampleNumber] = error instanceof Error ? error.message : String(error);
      }
    }
  });
  await Promise.all(workers);

  const successfulDurations = durations.filter(Number.isFinite).sort((a, b) => a - b);
  const p95Index = successfulDurations.length === 0 ? -1 : Math.ceil(successfulDurations.length * 0.95) - 1;
  return {
    endpoint: endpoint.name,
    samples,
    concurrency,
    successful: successfulDurations.length,
    failures: errors.filter(Boolean).length,
    httpErrors: errors.filter((message) => message?.startsWith('HTTP ')),
    p95Ms: p95Index < 0 ? null : Number(successfulDurations[p95Index].toFixed(1)),
    meets500ms: p95Index >= 0 && successfulDurations[p95Index] < 500,
  };
}

console.log(`Open-Meteo live performance probe: ${samples} samples/endpoint, concurrency ${concurrency}.`);
console.log('One finite pass per endpoint; no retries. The run will make at most 4 × samples requests.');
for (const endpoint of endpoints) {
  const result = await collect(endpoint);
  console.log(JSON.stringify(result));
}
