import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getForecast } from '../services/forecast';
import { AppError, RequestAbortedError } from '../types/errors';
import type { ForecastData, ForecastModel, ForecastUnits } from '../types/forecast';
import type { Location } from '../types/location';
import { getLocationIdentity } from '../utils/location-identity';

export type CityForecastState =
  | { status: 'loading'; configKey: string }
  | { status: 'success'; configKey: string; data: ForecastData }
  | { status: 'error'; configKey: string; error: AppError };

type StoredForecastState = CityForecastState;
type UnsupportedModelHandler = (error: AppError) => void;

function isAbortError(error: unknown): boolean {
  return error instanceof RequestAbortedError || (error instanceof Error && error.name === 'AbortError');
}

export function useComparisonForecasts(
  locations: readonly Location[],
  forecastDays: number,
  units: ForecastUnits,
  model: ForecastModel,
  onUnsupportedModel?: UnsupportedModelHandler,
) {
  const [records, setRecords] = useState<Map<string, StoredForecastState>>(() => new Map());
  const [retryVersions, setRetryVersions] = useState<Map<string, number>>(() => new Map());
  const controllers = useRef(new Map<string, AbortController>());
  const launchedRequests = useRef(new Map<string, string>());
  const activeLocationKeys = useRef(new Set<string>());
  const currentConfigKey = useMemo(() => JSON.stringify([forecastDays, units, model]), [forecastDays, units, model]);
  const retryKey = JSON.stringify(locations.map((location) => [getLocationIdentity(location), retryVersions.get(getLocationIdentity(location)) ?? 0]));

  useEffect(() => {
    const selectedKeys = new Set(locations.map(getLocationIdentity));
    activeLocationKeys.current = selectedKeys;

    for (const [key, controller] of controllers.current) {
      if (!selectedKeys.has(key)) {
        controller.abort();
        controllers.current.delete(key);
        launchedRequests.current.delete(key);
      } else if (launchedRequests.current.get(key)?.startsWith(`${currentConfigKey}|`) === false) {
        controller.abort();
        controllers.current.delete(key);
      }
    }

    for (const location of locations) {
      const key = getLocationIdentity(location);
      const retryVersion = retryVersions.get(key) ?? 0;
      const attemptKey = `${currentConfigKey}|${retryVersion}`;
      if (launchedRequests.current.get(key) === attemptKey) continue;

      controllers.current.get(key)?.abort();
      const controller = new AbortController();
      controllers.current.set(key, controller);
      launchedRequests.current.set(key, attemptKey);
      void getForecast({
        latitude: location.latitude,
        longitude: location.longitude,
        forecastDays,
        temperatureUnit: units.temperature,
        windSpeedUnit: units.windSpeed,
        precipitationUnit: units.precipitation,
        model,
      }, { signal: controller.signal })
        .then((data) => {
          if (controller.signal.aborted || controllers.current.get(key) !== controller
            || !activeLocationKeys.current.has(key)) return;
          setRecords((previous) => new Map(previous).set(key, { status: 'success', configKey: currentConfigKey, data }));
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted || controllers.current.get(key) !== controller
            || !activeLocationKeys.current.has(key) || isAbortError(cause)) return;
          const error = cause instanceof AppError ? cause : new AppError('E-05', cause);
          setRecords((previous) => new Map(previous).set(key, { status: 'error', configKey: currentConfigKey, error }));
          if (error.code === 'E-04' && model !== 'best_match') onUnsupportedModel?.(error);
        });
    }
  }, [locations, currentConfigKey, forecastDays, units, model, retryKey, retryVersions, onUnsupportedModel]);

  useEffect(() => () => {
    for (const controller of controllers.current.values()) controller.abort();
    controllers.current.clear();
    launchedRequests.current.clear();
    activeLocationKeys.current.clear();
  }, []);

  const getState = useCallback((location: Location): CityForecastState => {
    const record = records.get(getLocationIdentity(location));
    return record?.configKey === currentConfigKey ? record : { status: 'loading', configKey: currentConfigKey };
  }, [currentConfigKey, records]);

  const retry = useCallback((location: Location) => {
    const key = getLocationIdentity(location);
    setRecords((previous) => new Map(previous).set(key, { status: 'loading', configKey: currentConfigKey }));
    setRetryVersions((previous) => new Map(previous).set(key, (previous.get(key) ?? 0) + 1));
  }, [currentConfigKey]);

  return { getState, retry };
}
