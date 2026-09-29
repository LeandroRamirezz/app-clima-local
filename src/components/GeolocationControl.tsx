import type { GeolocationStatus } from '../hooks/useGeolocation';
import { es } from '../i18n/es';

interface GeolocationControlProps {
  status: GeolocationStatus;
  message: string | null;
  onRequestLocation: () => void;
}

export function GeolocationControl({ status, message, onRequestLocation }: GeolocationControlProps) {
  const loading = status === 'loading';
  const retryable = status === 'timeout' || status === 'unavailable' || status === 'error';

  return (
    <section className="geolocation-control" aria-labelledby="geolocation-title">
      <h2 id="geolocation-title">{es.geolocation.title}</h2>
      <button
        className="geolocation-control__button"
        type="button"
        onClick={onRequestLocation}
        disabled={loading || status === 'unsupported'}
      >
        {loading ? es.geolocation.loading : retryable ? es.geolocation.retry : es.geolocation.action}
      </button>
      {loading && <p className="geolocation-control__message" role="status" aria-live="polite">{es.geolocation.loading}</p>}
      {message && status !== 'success' && <p className="geolocation-control__message" role="alert">{message}</p>}
      {status === 'success' && message && <p className="geolocation-control__message" role="status" aria-live="polite">{message}</p>}
      <p className="geolocation-control__privacy">{es.geolocation.privacy}</p>
    </section>
  );
}
