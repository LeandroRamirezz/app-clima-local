import { useCallback, useEffect, useRef, useState } from 'react';
import { getForecast } from '../services/forecast';
import { AppError, RequestAbortedError } from '../types/errors';
import type { ForecastData, ForecastModel, ForecastUnits } from '../types/forecast';
import type { Location } from '../types/location';
import { DEFAULT_FORECAST_DAYS } from '../config/forecast';

type CurrentWeatherState =
  | { status: 'idle'; requestKey: null }
  | { status: 'loading'; requestKey: string }
  | { status: 'success'; requestKey: string; data: ForecastData }
  | { status: 'error'; requestKey: string; error: AppError };

const IDLE_STATE: CurrentWeatherState = { status: 'idle', requestKey: null };
type ForecastCallbacks = {
  onSuccess?: () => void;
  onUnsupportedModel?: (error: AppError) => void;
};
const NO_FORECAST_CALLBACKS: ForecastCallbacks = {};

function makeLocationKey(location: Location | null): string | null {
  if (!location) return null;
  return JSON.stringify([
    location.id,
    location.name,
    location.admin1 ?? null,
    location.country ?? null,
    location.latitude,
    location.longitude,
  ]);
}

function hasValidCoordinates(location: Location | null): location is Location {
  return location !== null
    && Number.isFinite(location.latitude)
    && location.latitude >= -90
    && location.latitude <= 90
    && Number.isFinite(location.longitude)
    && location.longitude >= -180
    && location.longitude <= 180;
}

function isAbortError(error: unknown): boolean {
  return error instanceof RequestAbortedError
    || (error instanceof Error && error.name === 'AbortError');
}

export function useCurrentWeather(
  activeLocation: Location | null,
  forecastDays = DEFAULT_FORECAST_DAYS,
  units: ForecastUnits = { temperature: 'celsius', windSpeed: 'kmh', precipitation: 'mm' },
  model: ForecastModel = 'best_match',
  callbacks: ForecastCallbacks = NO_FORECAST_CALLBACKS,
) {
  const [state, setState] = useState<CurrentWeatherState>(IDLE_STATE);
  const [retryVersion, setRetryVersion] = useState(0);
  const requestId = useRef(0);
  const locationKey = makeLocationKey(activeLocation);
  const requestKey = locationKey === null ? null : JSON.stringify([locationKey, forecastDays, units, model]);
  const { onSuccess, onUnsupportedModel } = callbacks;
  useEffect(() => {
    if (!hasValidCoordinates(activeLocation) || locationKey === null || requestKey === null) {
      requestId.current += 1;
      return;
    }

    const currentRequestId = ++requestId.current;
    const controller = new AbortController();
    void getForecast({
      latitude: activeLocation.latitude,
      longitude: activeLocation.longitude,
      forecastDays,
      temperatureUnit: units.temperature,
      windSpeedUnit: units.windSpeed,
      precipitationUnit: units.precipitation,
      model,
    }, { signal: controller.signal })
      .then((data) => {
        if (currentRequestId !== requestId.current || controller.signal.aborted) return;
        setState({ status: 'success', requestKey, data });
        onSuccess?.();
      })
      .catch((cause: unknown) => {
        if (currentRequestId !== requestId.current || controller.signal.aborted || isAbortError(cause)) return;
        const error = cause instanceof AppError ? cause : new AppError('E-05', cause);
        setState({ status: 'error', requestKey, error });
        if (error.code === 'E-04' && model !== 'best_match') onUnsupportedModel?.(error);
      });

    return () => {
      controller.abort();
      if (requestId.current === currentRequestId) requestId.current += 1;
    };
  }, [activeLocation, locationKey, requestKey, forecastDays, units, model, retryVersion, onSuccess, onUnsupportedModel]);

  const retry = useCallback(() => {
    if (requestKey !== null && hasValidCoordinates(activeLocation)) {
      setState({ status: 'loading', requestKey });
    }
    setRetryVersion((version) => version + 1);
  }, [activeLocation, requestKey]);

  // During the render before the new effect runs, never expose data tied to a different location.
  const visibleState = requestKey === null || !hasValidCoordinates(activeLocation)
    ? IDLE_STATE
    : state.requestKey === requestKey
      ? state
      : { status: 'loading' as const, requestKey };

  return { state: visibleState, retry, isRefreshing: state.status === 'success' || state.status === 'error' };
}
