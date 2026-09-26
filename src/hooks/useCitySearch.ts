import { useCallback, useEffect, useRef, useState } from 'react';
import { searchCities } from '../services/geocoding';
import { AppError } from '../types/errors';
import type { Location } from '../types/location';
import { validateCityQuery } from '../utils/city-query';

const DEBOUNCE_MS = 300;

type CitySearchState =
  | { status: 'idle'; results: Location[] }
  | { status: 'loading'; query: string; results: Location[] }
  | { status: 'success'; query: string; results: Location[] }
  | { status: 'empty'; query: string; results: Location[] }
  | { status: 'error'; query: string; results: Location[]; error: AppError };

const IDLE_STATE: CitySearchState = { status: 'idle', results: [] };

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function useCitySearch() {
  const [query, setQueryState] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [state, setState] = useState<CitySearchState>(IDLE_STATE);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const requestVersion = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValidQuery = useRef('');
  const retryImmediately = useRef(false);

  const cancelPendingWork = useCallback(() => {
    requestVersion.current += 1;
    if (debounceTimer.current !== null) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    activeController.current?.abort();
    activeController.current = null;
  }, []);

  const setQuery = useCallback((nextQuery: string) => {
    cancelPendingWork();
    setQueryState(nextQuery);
    setSearchQuery(nextQuery);
    setState(IDLE_STATE);
    setValidationMessage(null);
  }, [cancelPendingWork]);

  const setDisplayQuery = useCallback((displayValue: string) => {
    cancelPendingWork();
    setQueryState(displayValue);
    setSearchQuery('');
    setState(IDLE_STATE);
    setValidationMessage(null);
  }, [cancelPendingWork]);

  const retry = useCallback(() => {
    if (state.status !== 'error' || latestValidQuery.current.length === 0) return;
    cancelPendingWork();
    setState({ status: 'loading', query: latestValidQuery.current, results: [] });
    retryImmediately.current = true;
    setRetryVersion((version) => version + 1);
  }, [cancelPendingWork, state.status]);

  useEffect(() => {
    const validation = validateCityQuery(searchQuery);
    if (searchQuery.trim().length === 0) return;

    if (!validation.valid) {
      const message = validation.reason === 'too-short'
        ? 'Ingrese al menos 2 caracteres válidos.'
        : 'El texto no puede superar los 100 caracteres.';
      const timer = setTimeout(() => setValidationMessage(message), DEBOUNCE_MS);
      debounceTimer.current = timer;
      return () => {
        clearTimeout(timer);
        if (debounceTimer.current === timer) debounceTimer.current = null;
      };
    }

    const normalizedQuery = validation.normalized;
    latestValidQuery.current = normalizedQuery;
    const requestId = requestVersion.current;
    const controller = new AbortController();
    activeController.current = controller;
    const delay = retryImmediately.current ? 0 : DEBOUNCE_MS;
    retryImmediately.current = false;

    const timer = setTimeout(() => {
      debounceTimer.current = null;
      if (requestId !== requestVersion.current || controller.signal.aborted) return;
      setState({ status: 'loading', query: normalizedQuery, results: [] });
      void searchCities(normalizedQuery, { signal: controller.signal }).then((results) => {
        if (requestId !== requestVersion.current || controller.signal.aborted) return;
        setState(results.length > 0
          ? { status: 'success', query: normalizedQuery, results }
          : { status: 'empty', query: normalizedQuery, results: [] });
      }).catch((cause: unknown) => {
        if (controller.signal.aborted || requestId !== requestVersion.current || isAbortError(cause)) return;
        const error = cause instanceof AppError ? cause : new AppError('E-05', cause);
        setState({ status: 'error', query: normalizedQuery, results: [], error });
      }).finally(() => {
        if (activeController.current === controller) activeController.current = null;
      });
    }, delay);
    debounceTimer.current = timer;

    return () => {
      clearTimeout(timer);
      if (debounceTimer.current === timer) debounceTimer.current = null;
      controller.abort();
      if (activeController.current === controller) activeController.current = null;
    };
  }, [searchQuery, retryVersion]);

  useEffect(() => () => cancelPendingWork(), [cancelPendingWork]);

  return { query, setQuery, setDisplayQuery, state, validationMessage, retry };
}
