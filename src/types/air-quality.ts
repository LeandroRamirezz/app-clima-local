export type AirQualityVariable =
  | 'usAqi'
  | 'pm25'
  | 'pm10'
  | 'ozone'
  | 'nitrogenDioxide'
  | 'sulphurDioxide'
  | 'carbonMonoxide';

export type AirQualityMetrics = Record<AirQualityVariable, number | null>;
export type AirQualityUnits = Record<AirQualityVariable, string | null>;

export interface AirQualityCurrent extends AirQualityMetrics {
  time: string;
  usAqiValidity: 'valid' | 'missing' | 'invalid';
}

export interface AirQualityHourly extends AirQualityMetrics {
  time: string;
}

export interface AirQualityData {
  location: {
    latitude: number;
    longitude: number;
    timezone: string | null;
  };
  current: AirQualityCurrent;
  hourly: AirQualityHourly[];
  units: {
    current: AirQualityUnits;
    hourly: AirQualityUnits;
  };
}

export interface AirQualityParams {
  latitude: number;
  longitude: number;
}

export interface AirQualityOptions {
  signal?: AbortSignal;
}

export interface OpenMeteoAirQualityResponse {
  latitude?: unknown;
  longitude?: unknown;
  timezone?: unknown;
  current?: unknown;
  current_units?: unknown;
  hourly?: unknown;
  hourly_units?: unknown;
  [key: string]: unknown;
}

export type UsAqiLevel =
  | 'good'
  | 'moderate'
  | 'unhealthy-sensitive'
  | 'unhealthy'
  | 'very-unhealthy'
  | 'hazardous';

export interface UsAqiCategory {
  level: UsAqiLevel;
  label: string;
  message: string;
}
