import { http, HttpResponse, delay } from 'msw';

/**
 * Handlers compartidos de MSW para interceptar llamadas a Open-Meteo
 * Bloques asociados:
 * - jc: /v1/forecast
 * - js: /v1/search
 * - ss: /v1/archive, /v1/air-quality
 */

export const mockForecastSuccess = {
  latitude: 4.6097,
  longitude: -74.0817,
  generationtime_ms: 0.12,
  utc_offset_seconds: -18000,
  timezone: 'America/Bogota',
  timezone_abbreviation: '-05',
  elevation: 2600,
  current: {
    time: '2026-09-27T12:00',
    interval: 900,
    temperature_2m: 19.5,
    relative_humidity_2m: 65,
    apparent_temperature: 19.2,
    is_day: 1,
    precipitation: 0.0,
    weather_code: 1,
    wind_speed_10m: 12.0
  },
  daily: {
    time: ['2026-09-27', '2026-09-28', '2026-09-29'],
    temperature_2m_max: [20.0, 19.8, 21.0],
    temperature_2m_min: [10.0, 9.5, 10.2],
    precipitation_sum: [0.0, 0.5, 0.0]
  }
};

export const mockGeocodingSuccess = {
  results: [
    {
      id: 3688689,
      name: 'Bogotá',
      latitude: 4.6097,
      longitude: -74.0817,
      elevation: 2619,
      feature_code: 'PPLC',
      country_code: 'CO',
      admin1_id: 3688685,
      country: 'Colombia',
      country_id: 3686110,
      admin1: 'Bogota D.C.'
    }
  ]
};

export const mockAirQualitySuccess = {
  latitude: 4.6097,
  longitude: -74.0817,
  current: {
    time: '2026-09-27T12:00',
    pm10: 18.5,
    pm2_5: 9.2,
    carbon_monoxide: 210.0,
    nitrogen_dioxide: 15.0,
    sulphur_dioxide: 4.0,
    ozone: 32.0,
    european_aqi: 25
  }
};

export const mockArchiveSuccess = {
  latitude: 4.6097,
  longitude: -74.0817,
  daily: {
    time: ['2025-09-27'],
    temperature_2m_max: [19.0],
    temperature_2m_min: [11.0],
    precipitation_sum: [0.2]
  }
};

export const handlers = [
  // Bloque JC: Forecast
  http.get('https://api.open-meteo.com/v1/forecast', () => {
    return HttpResponse.json(mockForecastSuccess);
  }),

  // Bloque JS: Geocoding search
  http.get('https://geocoding-api.open-meteo.com/v1/search', () => {
    return HttpResponse.json(mockGeocodingSuccess);
  }),

  // Bloque SS: Air Quality
  http.get('https://air-quality-api.open-meteo.com/v1/air-quality', () => {
    return HttpResponse.json(mockAirQualitySuccess);
  }),

  // Bloque SS: Historical Archive
  http.get('https://archive-api.open-meteo.com/v1/archive', () => {
    return HttpResponse.json(mockArchiveSuccess);
  })
];

/**
 * Escenarios de error del catálogo E-01 a E-05
 */
export const errorHandlers = {
  // E-01: Sin conexión (Network Error simulado)
  e01NetworkError: (url = 'https://api.open-meteo.com/v1/forecast') =>
    http.get(url, () => HttpResponse.error()),

  // E-02: Timeout > 10s
  e02Timeout: (url = 'https://api.open-meteo.com/v1/forecast') =>
    http.get(url, async () => {
      await delay(11000);
      return HttpResponse.json(mockForecastSuccess);
    }),

  // E-03: HTTP 429 Cuota excedida
  e03RateLimit: (url = 'https://api.open-meteo.com/v1/forecast') =>
    http.get(url, () => {
      return new HttpResponse(JSON.stringify({ error: true, reason: 'Daily API request limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }),

  // E-04: HTTP 400 Parámetros inválidos
  e04BadRequest: (url = 'https://api.open-meteo.com/v1/forecast') =>
    http.get(url, () => {
      return new HttpResponse(JSON.stringify({ error: true, reason: 'Cannot compute forecast for given coordinates' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }),

  // E-05: HTTP 500 Servicio no disponible o error interno
  e05ServerError: (url = 'https://api.open-meteo.com/v1/forecast') =>
    http.get(url, () => {
      return new HttpResponse('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    })
};
