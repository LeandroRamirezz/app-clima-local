import { useEffect, useState } from 'react';
import {
  DEFAULT_PRECIPITATION_UNIT,
  DEFAULT_TEMPERATURE_UNIT,
  DEFAULT_WIND_SPEED_UNIT,
  FORECAST_UNITS_STORAGE_KEY,
} from '../config/forecast';
import type { ForecastUnits, PrecipitationUnit, TemperatureUnit, WindSpeedUnit } from '../types/forecast';

const DEFAULT_UNITS: ForecastUnits = {
  temperature: DEFAULT_TEMPERATURE_UNIT,
  windSpeed: DEFAULT_WIND_SPEED_UNIT,
  precipitation: DEFAULT_PRECIPITATION_UNIT,
};

function isForecastUnits(value: unknown): value is ForecastUnits {
  if (typeof value !== 'object' || value === null) return false;
  const units = value as Record<string, unknown>;
  return (units.temperature === 'celsius' || units.temperature === 'fahrenheit')
    && (units.windSpeed === 'kmh' || units.windSpeed === 'mph')
    && (units.precipitation === 'mm' || units.precipitation === 'inch');
}

function readStoredUnits(): ForecastUnits {
  try {
    const stored = window.localStorage.getItem(FORECAST_UNITS_STORAGE_KEY);
    if (stored === null) return DEFAULT_UNITS;
    const parsed: unknown = JSON.parse(stored);
    if (!isForecastUnits(parsed)) return DEFAULT_UNITS;
    return {
      temperature: parsed.temperature,
      windSpeed: parsed.windSpeed,
      precipitation: parsed.precipitation,
    };
  } catch {
    return DEFAULT_UNITS;
  }
}

function saveUnits(units: ForecastUnits): void {
  try {
    window.localStorage.setItem(FORECAST_UNITS_STORAGE_KEY, JSON.stringify(units));
  } catch {
    // Preferences are optional; restricted storage must not block the forecast.
  }
}

export interface ForecastPreferences {
  units: ForecastUnits;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
  setWindSpeedUnit: (unit: WindSpeedUnit) => void;
  setPrecipitationUnit: (unit: PrecipitationUnit) => void;
}

export function useForecastPreferences(): ForecastPreferences {
  const [units, setUnits] = useState<ForecastUnits>(readStoredUnits);

  useEffect(() => saveUnits(units), [units]);

  return {
    units,
    setTemperatureUnit: (temperature) => setUnits((previous) => ({ ...previous, temperature })),
    setWindSpeedUnit: (windSpeed) => setUnits((previous) => ({ ...previous, windSpeed })),
    setPrecipitationUnit: (precipitation) => setUnits((previous) => ({ ...previous, precipitation })),
  };
}
