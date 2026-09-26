import { API_TIMEOUT_MS } from './api';

export const AIR_QUALITY_API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
export const AIR_QUALITY_TIMEOUT_MS = API_TIMEOUT_MS;
export const AIR_QUALITY_FORECAST_HOURS = 24;

export const AIR_QUALITY_VARIABLES = {
  usAqi: 'us_aqi',
  pm25: 'pm2_5',
  pm10: 'pm10',
  ozone: 'ozone',
  nitrogenDioxide: 'nitrogen_dioxide',
  sulphurDioxide: 'sulphur_dioxide',
  carbonMonoxide: 'carbon_monoxide',
} as const;

export const AIR_QUALITY_CURRENT_VARIABLES = Object.values(AIR_QUALITY_VARIABLES);
export const AIR_QUALITY_HOURLY_VARIABLES = Object.values(AIR_QUALITY_VARIABLES);

export const AIR_QUALITY_TEXT = {
  noLocation: 'Seleccione una ubicación o use su ubicación para consultar la calidad del aire.',
  loading: 'Consultando calidad del aire…',
  noAqi: 'La calidad del aire no está disponible para esta ubicación.',
  noHourly: 'No hay datos horarios de calidad del aire disponibles para esta ubicación.',
  trendTitle: 'Tendencia para las próximas 24 horas',
  informationNote: 'El índice es información general y no constituye un diagnóstico ni consejo médico.',
  sourceAttribution: 'Datos de CAMS ENSEMBLE, consultados y presentados por Open-Meteo.',
} as const;

export const US_AQI_LEVELS = [
  { level: 'good', label: 'Buena', minimum: 0, message: 'La escala US AQI clasifica esta lectura dentro del rango bueno.' },
  { level: 'moderate', label: 'Moderada', minimum: 51, message: 'La escala US AQI clasifica esta lectura dentro del rango moderado.' },
  { level: 'unhealthy-sensitive', label: 'Dañina para grupos sensibles', minimum: 101, message: 'La escala US AQI clasifica esta lectura como dañina para grupos sensibles.' },
  { level: 'unhealthy', label: 'Dañina', minimum: 151, message: 'La escala US AQI clasifica esta lectura dentro del rango dañino.' },
  { level: 'very-unhealthy', label: 'Muy dañina', minimum: 201, message: 'La escala US AQI clasifica esta lectura dentro del rango muy dañino.' },
  { level: 'hazardous', label: 'Peligrosa', minimum: 301, message: 'La escala US AQI clasifica esta lectura dentro del rango peligroso.' },
] as const;
