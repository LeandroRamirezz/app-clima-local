import { AIR_QUALITY_TEXT } from '../config/air-quality';
import { APP_ERROR_MESSAGES } from '../types/errors';
import type { AirQualityData, AirQualityVariable } from '../types/air-quality';
import type { Location } from '../types/location';
import { useAirQuality } from '../hooks/useAirQuality';
import { formatForecastNumber } from '../utils/forecast-presentation';
import { formatAirQualityTime, getNextAirQualityHours, getUsAqiCategory } from '../utils/air-quality';
import { es } from '../i18n/es';

const POLLUTANTS: Array<{ key: Exclude<AirQualityVariable, 'usAqi'>; label: string; name: string }> = [
  { key: 'pm25', label: es.airQuality.pm25, name: es.airQuality.pm25Name },
  { key: 'pm10', label: es.airQuality.pm10, name: es.airQuality.pm10Name },
  { key: 'ozone', label: es.airQuality.ozone, name: es.airQuality.ozoneName },
  { key: 'nitrogenDioxide', label: es.airQuality.nitrogenDioxide, name: es.airQuality.nitrogenDioxideName },
  { key: 'sulphurDioxide', label: es.airQuality.sulphurDioxide, name: es.airQuality.sulphurDioxideName },
  { key: 'carbonMonoxide', label: es.airQuality.carbonMonoxide, name: es.airQuality.carbonMonoxideName },
];

function formatLocationName(location: Location): string {
  if (location.source === 'geolocation') {
    return `${es.common.myLocation} (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`;
  }
  return [location.name, location.admin1, location.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

function displayMeasure(value: number | null, unit: string | null): string {
  if (value === null || !Number.isFinite(value)) return es.common.notAvailable;
  return unit ? `${formatForecastNumber(value)} ${unit}` : formatForecastNumber(value);
}

function AirQualityPollutants({ data }: { data: AirQualityData }) {
  return (
    <dl className="air-quality__pollutants" aria-label={es.airQuality.pollutantGroup}>
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
              <p className="air-quality__hour-aqi">{es.airQuality.aqi}: {hour.usAqi === null ? es.common.notAvailable : formatForecastNumber(hour.usAqi, 0)}</p>
              <p>{category?.label ?? es.airQuality.unavailableCategory}</p>
              <dl>
                <div><dt>{es.airQuality.pm25}</dt><dd>{displayMeasure(hour.pm25, data.units.hourly.pm25)}</dd></div>
                <div><dt>{es.airQuality.pm10}</dt><dd>{displayMeasure(hour.pm10, data.units.hourly.pm10)}</dd></div>
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
          <p className="air-quality__eyebrow">{es.airQuality.eyebrow}</p>
          <h2 id="air-quality-title">{es.airQuality.title}</h2>
          {activeLocation && <p className="air-quality__location">{formatLocationName(activeLocation)}</p>}
        </div>
      </header>

      {state.status === 'idle' && <p className="air-quality__empty">{AIR_QUALITY_TEXT.noLocation}</p>}
      {state.status === 'loading' && <p className="air-quality__status" role="status" aria-live="polite" aria-label={es.airQuality.loadingLabel}>{AIR_QUALITY_TEXT.loading}</p>}
      {state.status === 'error' && (
        <div className="air-quality__error" role="alert">
          <span>{APP_ERROR_MESSAGES[state.error.code]}</span>
          <button type="button" className="air-quality__retry" onClick={retry}>{es.common.retry}</button>
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
                  aria-label={es.airQuality.aqiAnnouncement(formatForecastNumber(state.data.current.usAqi), category?.label ?? es.common.notAvailable)}
                >
                  <span className="air-quality__aqi-label">{es.airQuality.aqiLabel}</span>
                  <strong>{formatForecastNumber(state.data.current.usAqi, 0)}</strong>
                  <span className="air-quality__category">{category?.label ?? es.common.notAvailable}</span>
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
        <a href="https://atmosphere.copernicus.eu/" target="_blank" rel="noopener noreferrer">{es.airQuality.camsSource}</a>
        {' · '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">{es.airQuality.openMeteoSource}</a>
      </footer>
    </section>
  );
}
