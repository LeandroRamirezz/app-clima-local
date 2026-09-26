import { API_TIMEOUT_MS } from '../config/api';
import { AppError, RequestAbortedError } from '../types/errors';

export interface JsonRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function fetchJson(url: URL, options: JsonRequestOptions = {}): Promise<unknown> {
  if (options.signal?.aborted) throw new RequestAbortedError();

  const requestController = new AbortController();
  let timedOut = false;
  const forwardAbort = () => requestController.abort(options.signal?.reason);
  options.signal?.addEventListener('abort', forwardAbort, { once: true });
  const timeoutId = setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, options.timeoutMs ?? API_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: requestController.signal });
    } catch (cause) {
      if (options.signal?.aborted) throw new RequestAbortedError();
      if (timedOut) throw new AppError('E-02', cause);
      throw new AppError('E-01', cause);
    }

    if (options.signal?.aborted) throw new RequestAbortedError();
    if (timedOut) throw new AppError('E-02');

    if (!response.ok) {
      if (response.status === 400) throw new AppError('E-04', { status: response.status });
      if (response.status === 429) throw new AppError('E-03', { status: response.status });
      throw new AppError('E-05', { status: response.status });
    }

    try {
      const payload: unknown = await response.json();
      if (options.signal?.aborted) throw new RequestAbortedError();
      if (timedOut) throw new AppError('E-02');
      return payload;
    } catch (cause) {
      if (cause instanceof RequestAbortedError) throw cause;
      if (options.signal?.aborted) throw new RequestAbortedError();
      if (timedOut) throw new AppError('E-02', cause);
      throw new AppError('E-05', cause);
    }
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener('abort', forwardAbort);
  }
}
