import type { GeolocationStatus } from '../hooks/useGeolocation';

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
      <h2 id="geolocation-title">O use su ubicación</h2>
      <button
        className="geolocation-control__button"
        type="button"
        onClick={onRequestLocation}
        disabled={loading || status === 'unsupported'}
      >
        {loading ? 'Obteniendo ubicación…' : retryable ? 'Reintentar ubicación' : 'Usar mi ubicación'}
      </button>
      {loading && <p className="geolocation-control__message" role="status" aria-live="polite">Obteniendo ubicación…</p>}
      {message && status !== 'success' && <p className="geolocation-control__message" role="alert">{message}</p>}
      {status === 'success' && message && <p className="geolocation-control__message" role="status" aria-live="polite">{message}</p>}
      <p className="geolocation-control__privacy">Tu ubicación se utilizará únicamente para consultar información meteorológica y no se guardará.</p>
    </section>
  );
}
