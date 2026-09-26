import { useCallback, useEffect, useRef, useState } from 'react';
import { getAirQuality } from '../services/air-quality';
import { AppError, RequestAbortedError } from '../types/errors';
import type { AirQualityData } from '../types/air-quality';
import type { Location } from '../types/location';

type AirQualityState =
  | { status: 'idle'; requestKey: null }
  | { status: 'loading'; requestKey: string }
  | { status: 'success'; requestKey: string; data: AirQualityData }
  | { status: 'error'; requestKey: string; error: AppError };

const IDLE_STATE: AirQualityState = { status: 'idle', requestKey: null };

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
  return error instanceof RequestAbortedError || (error instanceof Error && error.name === 'AbortError');
}

function makeLocationKey(location: Location | null): string | null {
  if (!hasValidCoordinates(location)) return null;
  return JSON.stringify([location.id, location.latitude, location.longitude]);
}

export function useAirQuality(activeLocation: Location | null) {
  const [state, setState] = useState<AirQualityState>(IDLE_STATE);
  const [retryVersion, setRetryVersion] = useState(0);
  const requestId = useRef(0);
  const locationKey = makeLocationKey(activeLocation);
  const latitude = hasValidCoordinates(activeLocation) ? activeLocation.latitude : null;
  const longitude = hasValidCoordinates(activeLocation) ? activeLocation.longitude : null;
  const attemptKey = locationKey === null ? null : `${locationKey}:${retryVersion}`;

  useEffect(() => {
    if (latitude === null || longitude === null || attemptKey === null) {
      requestId.current += 1;
      return;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestId.current;
    void getAirQuality({
      latitude,
      longitude,
    }, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted || requestId.current !== currentRequestId) return;
        setState({ status: 'success', requestKey: attemptKey, data });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || requestId.current !== currentRequestId || isAbortError(cause)) return;
        const error = cause instanceof AppError ? cause : new AppError('E-05', cause);
        setState({ status: 'error', requestKey: attemptKey, error });
      });

    return () => {
      controller.abort();
      if (requestId.current === currentRequestId) requestId.current += 1;
    };
  }, [latitude, longitude, locationKey, attemptKey]);

  const retry = useCallback(() => setRetryVersion((version) => version + 1), []);
  const visibleState = locationKey === null
    ? IDLE_STATE
    : state.requestKey === attemptKey
      ? state
      : { status: 'loading' as const, requestKey: attemptKey };

  return { state: visibleState, retry };
}
