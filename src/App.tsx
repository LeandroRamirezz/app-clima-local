import { useState } from 'react';
import { CitySearch } from './components/CitySearch';
import { GeolocationControl } from './components/GeolocationControl';
import { CurrentWeather } from './components/CurrentWeather';
import { useGeolocation } from './hooks/useGeolocation';
import type { Location } from './types/location';
import { es } from './i18n/es';

function formatLocationName(location: Location): string {
  if (location.source === 'geolocation') {
    return `${es.common.myLocation} (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`;
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
    <>
    <a className="skip-link" href="#main-content">{es.app.skipToContent}</a>
    <main id="main-content" className="app-shell" tabIndex={-1}>
      <header className="app-header">
        <div className="app-header__brand">
          <svg className="app-header__mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M4 17c7-8 16-10 25-6 6 3 11 2 15-1M4 26c7-8 16-10 25-6 6 3 11 2 15-1M4 35c7-8 16-10 25-6 6 3 11 2 15-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="24" cy="24" r="3" fill="currentColor" />
          </svg>
          <div>
            <p className="app-header__kicker">{es.app.kicker}</p>
            <h1>{es.app.title}</h1>
          </div>
        </div>
        <p className="app-header__description">{es.app.description}</p>
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
            <h2 id="active-location-title">{es.app.selectedLocation}</h2>
            <p className="active-location__name">{formatLocationName(activeLocation)}</p>
          </div>
          <div className="active-location__coordinates">
            <p>{es.app.latitude}: {activeLocation.latitude.toFixed(2)}</p>
            <p>{es.app.longitude}: {activeLocation.longitude.toFixed(2)}</p>
          </div>
        </section>
      )}
      <CurrentWeather activeLocation={activeLocation} />
    </main>
    </>
  );
}

export default App;
