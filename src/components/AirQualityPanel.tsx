import { AIR_QUALITY_TEXT } from '../config/air-quality';
import { APP_ERROR_MESSAGES } from '../types/errors';
import type { AirQualityData, AirQualityVariable } from '../types/air-quality';
import type { Location } from '../types/location';
import { useAirQuality } from '../hooks/useAirQuality';
import { formatForecastNumber } from '../utils/forecast-presentation';
import { formatAirQualityTime, getNextAirQualityHours, getUsAqiCategory } from '../utils/air-quality';

const POLLUTANTS: Array<{ key: Exclude<AirQualityVariable, 'usAqi'>; label: string; name: string }> = [
  { key: 'pm25', label: 'PM2.5', name: 'Partículas finas' },
  { key: 'pm10', label: 'PM10', name: 'Partículas inhalables' },
  { key: 'ozone', label: 'Ozono (O₃)', name: 'Ozono' },
  { key: 'nitrogenDioxide', label: 'Dióxido de nitrógeno (NO₂)', name: 'Dióxido de nitrógeno' },
  { key: 'sulphurDioxide', label: 'Dióxido de azufre (SO₂)', name: 'Dióxido de azufre' },
  { key: 'carbonMonoxide', label: 'Monóxido de carbono (CO)', name: 'Monóxido de carbono' },
];

function formatLocationName(location: Location): string {
  if (location.source === 'geolocation') {
    return `Mi ubicación (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`;
  }
  return [location.name, location.admin1, location.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

function displayMeasure(value: number | null, unit: string | null): string {
  if (value === null || !Number.isFinite(value)) return 'N/D';
  return unit ? `${formatForecastNumber(value)} ${unit}` : formatForecastNumber(value);
}

function AirQualityPollutants({ data }: { data: AirQualityData }) {
  return (
    <dl className="air-quality__pollutants" aria-label="Concentraciones actuales de contaminantes">
      {POLLUTANTS.map(({ key, label, name }) => (
        <div className="air-quality__pollutant" key={key}>
          <dt><span className="air-quality__pollutant-code">{label}</span><span className="air-quality__pollutant-name">{name}</span></dt>
          <dd>{displayMeasure(data.current[key], data.units.current[key])}</dd>
        </div>
      ))}
    </dl>
  );
}

function AirQualityTrend({ data }: { data: AirQualityData }) {
  const hours = getNextAirQualityHours(data);
  if (hours.length === 0) {
    return <p className="air-quality__empty">{AIR_QUALITY_TEXT.noHourly}</p>;
  }

  return (
    <section className="air-quality__trend" aria-labelledby="air-quality-trend-title">
      <h3 id="air-quality-trend-title">{AIR_QUALITY_TEXT.trendTitle}</h3>
      <ol className="air-quality__hours">
        {hours.map((hour) => {
          const category = getUsAqiCategory(hour.usAqi);
          return (
            <li className="air-quality__hour" key={hour.time}>
              <h4><time dateTime={hour.time}>{formatAirQualityTime(hour.time)}</time></h4>
              <p className="air-quality__hour-aqi">{hour.usAqi === null ? 'AQI: N/D' : `AQI: ${formatForecastNumber(hour.usAqi, 0)}`}</p>
              <p>{category?.label ?? 'Categoría N/D'}</p>
              <dl>
                <div><dt>PM2.5</dt><dd>{displayMeasure(hour.pm25, data.units.hourly.pm25)}</dd></div>
                <div><dt>PM10</dt><dd>{displayMeasure(hour.pm10, data.units.hourly.pm10)}</dd></div>
              </dl>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function AirQualityPanel({ activeLocation }: { activeLocation: Location | null }) {
  const { state, retry } = useAirQuality(activeLocation);

  return (
    <section className="air-quality" aria-labelledby="air-quality-title">
      <header className="air-quality__header">
        <div>
          <p className="air-quality__eyebrow">Atmósfera</p>
          <h2 id="air-quality-title">Calidad del aire</h2>
          {activeLocation && <p className="air-quality__location">{formatLocationName(activeLocation)}</p>}
        </div>
      </header>

      {state.status === 'idle' && <p className="air-quality__empty">{AIR_QUALITY_TEXT.noLocation}</p>}
      {state.status === 'loading' && <p className="air-quality__status" role="status" aria-live="polite" aria-label="Carga de calidad del aire">{AIR_QUALITY_TEXT.loading}</p>}
      {state.status === 'error' && (
        <div className="air-quality__error" role="alert">
          <span>{APP_ERROR_MESSAGES[state.error.code]}</span>
          <button type="button" className="air-quality__retry" onClick={retry}>Reintentar</button>
        </div>
      )}
      {state.status === 'success' && (
        <>
          <div className="air-quality__current">
            {state.data.current.usAqi === null ? (
              <p className="air-quality__unavailable">{AIR_QUALITY_TEXT.noAqi}</p>
            ) : (() => {
              const category = getUsAqiCategory(state.data.current.usAqi);
              return (
                <div
                  className={`air-quality__aqi air-quality__aqi--${category?.level ?? 'unavailable'}`}
                  role="group"
                  aria-label={`Índice de calidad del aire: ${formatForecastNumber(state.data.current.usAqi)}, categoría ${category?.label ?? 'N/D'}.`}
                >
                  <span className="air-quality__aqi-label">Índice de calidad del aire · US AQI</span>
                  <strong>{formatForecastNumber(state.data.current.usAqi, 0)}</strong>
                  <span className="air-quality__category">{category?.label ?? 'N/D'}</span>
                  {category && <p>{category.message}</p>}
                </div>
              );
            })()}
            <AirQualityPollutants data={state.data} />
          </div>
          <p className="air-quality__note">{AIR_QUALITY_TEXT.informationNote}</p>
          <AirQualityTrend data={state.data} />
        </>
      )}

      <footer className="air-quality__attribution">
        <span>{AIR_QUALITY_TEXT.sourceAttribution}</span>
        {' '}
        <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noopener noreferrer">CAMS ENSEMBLE</a>
        {' · '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>
      </footer>
    </section>
  );
}
