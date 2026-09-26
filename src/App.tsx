import { useState } from 'react';
import { CitySearch } from './components/CitySearch';
import { GeolocationControl } from './components/GeolocationControl';
import { CurrentWeather } from './components/CurrentWeather';
import { useGeolocation } from './hooks/useGeolocation';
import type { Location } from './types/location';

function formatLocationName(location: Location): string {
  if (location.source === 'geolocation') {
    return `${location.name} (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`;
  }
  return [location.name, location.admin1, location.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

function App() {
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);
  const geolocation = useGeolocation(setActiveLocation);

  function selectManualLocation(location: Location) {
    geolocation.invalidate();
    setActiveLocation(location);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <svg className="app-header__mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M4 17c7-8 16-10 25-6 6 3 11 2 15-1M4 26c7-8 16-10 25-6 6 3 11 2 15-1M4 35c7-8 16-10 25-6 6 3 11 2 15-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="24" r="3" fill="currentColor" />
          </svg>
          <div>
            <p className="app-header__kicker">Open-Meteo · Datos en tiempo local</p>
            <h1>Observatorio del clima</h1>
          </div>
        </div>
        <p className="app-header__description">Consulta condiciones, pronósticos y registros de una ubicación.</p>
      </header>
      <div className="location-options">
        <CitySearch activeLocation={activeLocation} onSelectLocation={selectManualLocation} headingLevel={2} />
        <GeolocationControl
          status={geolocation.status}
          message={geolocation.message}
          onRequestLocation={geolocation.requestLocation}
        />
      </div>
      {activeLocation && (
        <section className="active-location" aria-labelledby="active-location-title" role="status" aria-live="polite">
          <div>
            <h2 id="active-location-title">Ubicación seleccionada</h2>
            <p className="active-location__name">{formatLocationName(activeLocation)}</p>
          </div>
          <div className="active-location__coordinates">
            <p>Latitud: {activeLocation.latitude.toFixed(2)}</p>
            <p>Longitud: {activeLocation.longitude.toFixed(2)}</p>
          </div>
        </section>
      )}
      <CurrentWeather activeLocation={activeLocation} />
    </main>
  );
}

export default App;
