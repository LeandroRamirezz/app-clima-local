export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindSpeedUnit = 'kmh' | 'mph';
export type PrecipitationUnit = 'mm' | 'inch';
export type ForecastModel = 'best_match' | 'icon_seamless' | 'ncep_gfs_seamless' | 'ecmwf_ifs025';

export interface ForecastParams {
  latitude: number;
  longitude: number;
  forecastDays?: number;
  temperatureUnit?: TemperatureUnit;
  windSpeedUnit?: WindSpeedUnit;
  precipitationUnit?: PrecipitationUnit;
  model?: ForecastModel;
}

export interface ForecastOptions {
  signal?: AbortSignal;
}

export interface ForecastUnits {
  temperature: TemperatureUnit;
  windSpeed: WindSpeedUnit;
  precipitation: PrecipitationUnit;
}

export interface ForecastLocation {
  latitude: number;
  longitude: number;
  elevation: number | null;
  timezone: string | null;
  timezoneAbbreviation: string | null;
}

export interface CurrentForecast {
  time: string;
  temperature: number | null;
  apparentTemperature: number | null;
  relativeHumidity: number | null;
  precipitation: number | null;
  weatherCode: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  uvIndex: number | null;
}

export interface HourlyForecast {
  time: string;
  temperature: number | null;
  apparentTemperature: number | null;
  precipitationProbability: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  uvIndex: number | null;
  weatherCode: number | null;
}

export interface DailyForecast {
  date: string;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationSum: number | null;
  precipitationProbabilityMax: number | null;
  windSpeedMax: number | null;
  uvIndexMax: number | null;
  sunrise: string | null;
  sunset: string | null;
  daylightDuration: number | null;
}

export interface ForecastData {
  location: ForecastLocation;
  current: CurrentForecast;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  units: ForecastUnits;
}

export interface OpenMeteoForecastCurrent {
  [variable: string]: unknown;
  time: unknown;
  temperature_2m?: unknown;
  apparent_temperature?: unknown;
  relative_humidity_2m?: unknown;
  precipitation?: unknown;
  weather_code?: unknown;
  wind_speed_10m?: unknown;
  wind_direction_10m?: unknown;
}

export interface OpenMeteoForecastHourly {
  [variable: string]: unknown;
  time: unknown;
  temperature_2m?: unknown;
  apparent_temperature?: unknown;
  precipitation_probability?: unknown;
  precipitation?: unknown;
  wind_speed_10m?: unknown;
  uv_index?: unknown;
  weather_code?: unknown;
}

export interface OpenMeteoForecastDaily {
  [variable: string]: unknown;
  time: unknown;
  weather_code?: unknown;
  temperature_2m_max?: unknown;
  temperature_2m_min?: unknown;
  precipitation_sum?: unknown;
  precipitation_probability_max?: unknown;
  wind_speed_10m_max?: unknown;
  uv_index_max?: unknown;
  sunrise?: unknown;
  sunset?: unknown;
  daylight_duration?: unknown;
}

export interface OpenMeteoForecastResponse {
  latitude?: unknown;
  longitude?: unknown;
  elevation?: unknown;
  timezone?: unknown;
  timezone_abbreviation?: unknown;
  current?: OpenMeteoForecastCurrent;
  hourly?: OpenMeteoForecastHourly;
  daily?: OpenMeteoForecastDaily;
}
