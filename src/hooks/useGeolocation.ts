import { useCallback, useEffect, useRef, useState } from 'react';
import { GEOLOCATION_MESSAGES, GEOLOCATION_OPTIONS } from '../config/geolocation';
import type { Location } from '../types/location';

export type GeolocationStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'permission-denied'
  | 'timeout'
  | 'unavailable'
  | 'unsupported'
  | 'error';

interface GeolocationState {
  status: GeolocationStatus;
  message: string | null;
}

const INITIAL_STATE: GeolocationState = { status: 'idle', message: null };

function getErrorState(code: number): GeolocationState {
  if (code === 1) return { status: 'permission-denied', message: GEOLOCATION_MESSAGES.permissionDenied };
  if (code === 3) return { status: 'timeout', message: GEOLOCATION_MESSAGES.timeout };
  if (code === 2) return { status: 'unavailable', message: GEOLOCATION_MESSAGES.positionUnavailable };
  return { status: 'error', message: GEOLOCATION_MESSAGES.unknown };
}

function isValidCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

export function useGeolocation(onLocation: (location: Location) => void) {
  const [state, setState] = useState<GeolocationState>(INITIAL_STATE);
  const requestId = useRef(0);
  const requestPending = useRef(false);
  const mounted = useRef(false);
  const onLocationRef = useRef(onLocation);

  useEffect(() => {
    onLocationRef.current = onLocation;
  }, [onLocation]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
      requestPending.current = false;
    };
  }, []);

  const invalidate = useCallback(() => {
    requestId.current += 1;
    requestPending.current = false;
    setState((current) => current.status === 'loading' ? INITIAL_STATE : current);
  }, []);

  const requestLocation = useCallback(() => {
    if (requestPending.current) return;

    requestId.current += 1;
    const currentRequestId = requestId.current;
    const finish = (nextState: GeolocationState) => {
      if (!mounted.current || currentRequestId !== requestId.current) return;
      requestPending.current = false;
      setState(nextState);
    };

    const geolocation = typeof navigator === 'undefined' ? undefined : navigator.geolocation;
    const insecureContext = typeof window !== 'undefined' && window.isSecureContext === false;
    if (insecureContext || !geolocation || typeof geolocation.getCurrentPosition !== 'function') {
      finish({ status: 'unsupported', message: GEOLOCATION_MESSAGES.unsupported });
      return;
    }

    requestPending.current = true;
    setState({ status: 'loading', message: null });
    try {
      geolocation.getCurrentPosition(
        (position) => {
          if (!mounted.current || currentRequestId !== requestId.current) return;
          const { latitude, longitude } = position.coords;
          if (!isValidCoordinates(latitude, longitude)) {
            finish({ status: 'unavailable', message: GEOLOCATION_MESSAGES.positionUnavailable });
            return;
          }

          onLocationRef.current({
            id: 'geolocation',
            name: 'Mi ubicación',
            latitude,
            longitude,
            source: 'geolocation',
          });
          finish({ status: 'success', message: GEOLOCATION_MESSAGES.success });
        },
        (error) => finish(getErrorState(error.code)),
        GEOLOCATION_OPTIONS,
      );
    } catch {
      finish({ status: 'error', message: GEOLOCATION_MESSAGES.unknown });
    }
  }, []);

  return { ...state, invalidate, requestLocation };
}
