import { useCallback, useEffect, useRef, useState } from 'react';
import { getHistoricalWeather } from '../services/historical';
import { AppError, RequestAbortedError } from '../types/errors';
import type { ForecastUnits } from '../types/forecast';
import type { HistoricalWeatherData } from '../types/historical';
import type { Location } from '../types/location';

interface HistoricalRequestSnapshot {
  locationKey: string;
  startDate: string;
  endDate: string;
  units: ForecastUnits;
}

type HistoricalState =
  | { status: 'idle' }
  | { status: 'loading'; requestKey: string; snapshot: HistoricalRequestSnapshot }
  | { status: 'success'; requestKey: string; snapshot: HistoricalRequestSnapshot; data: HistoricalWeatherData }
  | { status: 'error'; requestKey: string; snapshot: HistoricalRequestSnapshot; error: AppError };

type DateRange = Pick<HistoricalRequestSnapshot, 'startDate' | 'endDate'>;
type LastQuery = DateRange & { locationKey: string };

const IDLE_STATE: HistoricalState = { status: 'idle' };

function makeLocationKey(location: Location | null): string | null {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)
    || location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) return null;
  return JSON.stringify([location.id, location.latitude, location.longitude]);
}

function makeRequestKey(snapshot: HistoricalRequestSnapshot): string {
  return JSON.stringify([snapshot.locationKey, snapshot.startDate, snapshot.endDate, snapshot.units]);
}

function isAbortError(error: unknown): boolean {
  return error instanceof RequestAbortedError || (error instanceof Error && error.name === 'AbortError');
}

export function useHistoricalWeather(activeLocation: Location | null, units: ForecastUnits) {
  const [state, setState] = useState<HistoricalState>(IDLE_STATE);
  const requestId = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<LastQuery | null>(null);
  const locationKey = makeLocationKey(activeLocation);
  const unitsKey = JSON.stringify(units);
  const previousLocationKey = useRef(locationKey);
  const previousUnitsKey = useRef(unitsKey);

  const execute = useCallback((range: DateRange, location: Location, queryUnits: ForecastUnits, key: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const currentRequestId = ++requestId.current;
    const snapshot: HistoricalRequestSnapshot = { ...range, locationKey: key, units: queryUnits };
    const requestKey = makeRequestKey(snapshot);
    setState({ status: 'loading', requestKey, snapshot });

    void getHistoricalWeather({
      latitude: location.latitude,
      longitude: location.longitude,
      startDate: range.startDate,
      endDate: range.endDate,
      temperatureUnit: queryUnits.temperature,
      windSpeedUnit: queryUnits.windSpeed,
      precipitationUnit: queryUnits.precipitation,
    }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted || currentRequestId !== requestId.current) return;
        setState({ status: 'success', requestKey, snapshot, data });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || currentRequestId !== requestId.current || isAbortError(cause)) return;
        const error = cause instanceof AppError ? cause : new AppError('E-05', cause);
        setState({ status: 'error', requestKey, snapshot, error });
      });
  }, []);

  useEffect(() => {
    const locationChanged = previousLocationKey.current !== locationKey;
    const unitsChanged = previousUnitsKey.current !== unitsKey;
    previousLocationKey.current = locationKey;
    previousUnitsKey.current = unitsKey;

    if (locationChanged) {
      requestId.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
      lastQueryRef.current = null;
      return;
    }

    const lastQuery = lastQueryRef.current;
    if (unitsChanged && lastQuery && lastQuery.locationKey === locationKey && activeLocation && locationKey) {
      execute(lastQuery, activeLocation, units, locationKey);
    }
  }, [activeLocation, locationKey, units, unitsKey, execute]);

  useEffect(() => () => {
    requestId.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const submit = useCallback((range: DateRange) => {
    if (!activeLocation || !locationKey) return false;
    const query: LastQuery = { ...range, locationKey };
    lastQueryRef.current = query;
    execute(query, activeLocation, units, locationKey);
    return true;
  }, [activeLocation, execute, locationKey, units]);

  const retry = useCallback(() => {
    const lastQuery = lastQueryRef.current;
    if (!activeLocation || !locationKey || !lastQuery || lastQuery.locationKey !== locationKey) return;
    execute(lastQuery, activeLocation, units, locationKey);
  }, [activeLocation, execute, locationKey, units]);

  let visibleState: HistoricalState = state;
  if (!locationKey || !activeLocation) visibleState = IDLE_STATE;
  else if (state.status !== 'idle' && state.snapshot.locationKey !== locationKey) visibleState = IDLE_STATE;
  else if (state.status !== 'idle' && JSON.stringify(state.snapshot.units) !== unitsKey) {
    const snapshot = { ...state.snapshot, units };
    visibleState = { status: 'loading', requestKey: makeRequestKey(snapshot), snapshot };
  }

  return { state: visibleState, submit, retry };
}
