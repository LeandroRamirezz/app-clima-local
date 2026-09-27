import { useCallback, useState } from 'react';
import { DEFAULT_FORECAST_DAYS, DEFAULT_FORECAST_MODEL, FORECAST_MODELS } from '../config/forecast';
import type { ForecastData } from '../types/forecast';
import type { ForecastModel, PrecipitationUnit, TemperatureUnit, WindSpeedUnit } from '../types/forecast';
import type { Location } from '../types/location';
import { APP_ERROR_MESSAGES, AppError } from '../types/errors';
import { getUvCategory } from '../utils/uv-category';
import { mapWeatherCode } from '../utils/weather-code';
import { formatForecastMeasure, formatForecastNumber, formatForecastTime, getForecastUnits } from '../utils/forecast-presentation';
import { useCurrentWeather } from '../hooks/useCurrentWeather';
import { useForecastPreferences } from '../hooks/useForecastPreferences';
import { formatDaylightDuration } from '../utils/daylight';
import { areSameLocation } from '../utils/location-identity';
import { ForecastPanel, type ForecastView } from './ForecastPanel';
import { WeatherConditionIcon } from './WeatherConditionIcon';
import { CityComparison } from './CityComparison';
import { CitySearch } from './CitySearch';
import { HistoricalWeather } from './HistoricalWeather';
import { AirQualityPanel } from './AirQualityPanel';

interface CurrentWeatherProps {
  activeLocation: Location | null;
}

function formatLocationName(location: Location): string {
  if (location.source === 'geolocation') {
    return `Mi ubicación (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`;
  }
  return [location.name, location.admin1, location.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

function WeatherMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="current-weather__metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CurrentWeatherDetails({ forecast, location }: { forecast: ForecastData; location: Location }) {
  const { current } = forecast;
  const condition = mapWeatherCode(current.weatherCode);
  const uvCategory = getUvCategory(current.uvIndex);
  const units = getForecastUnits(forecast.units);
  const updatedTime = formatForecastTime(current.time);
  const uvValue = current.uvIndex === null
    ? 'N/D'
    : `${formatForecastNumber(current.uvIndex)}${uvCategory ? ` — ${uvCategory}` : ''}`;
  const today = forecast.daily[0];

  return (
    <section className="current-weather__card" aria-labelledby="current-weather-title">
      <header className="current-weather__header">
        <div>
          <h2 id="current-weather-title">Clima actual</h2>
          <p className="current-weather__location">{formatLocationName(location)}</p>
          <p className="current-weather__elevation">
            Elevación: {typeof forecast.location.elevation !== 'number' || !Number.isFinite(forecast.location.elevation) ? 'no disponible' : `${formatForecastNumber(forecast.location.elevation)} m s. n. m.`}
          </p>
          <p className="current-weather__elevation-note">Estimación basada en el modelo de terreno de Open-Meteo; puede diferir de la altitud puntual.</p>
          {updatedTime && <p className="current-weather__updated">Actualizado: {updatedTime}</p>}
        </div>
        <div className="current-weather__condition">
          <WeatherConditionIcon iconKey={condition.iconKey} />
          <span>{condition.label}</span>
        </div>
      </header>

      <p className="current-weather__temperature">
        <span className="current-weather__temperature-label">Temperatura</span>
        <strong>{formatForecastMeasure(current.temperature, units.temperature)}</strong>
      </p>

      <dl className="current-weather__metrics">
        <WeatherMetric label="Sensación térmica" value={formatForecastMeasure(current.apparentTemperature, units.temperature)} />
        <WeatherMetric label="Humedad" value={`${formatForecastNumber(current.relativeHumidity)}${current.relativeHumidity === null ? '' : ' %'}`} />
        <WeatherMetric label="Precipitación" value={current.precipitation === null ? 'N/D' : `${formatForecastNumber(current.precipitation)} ${units.precipitation}`} />
        <WeatherMetric label="Viento" value={current.windSpeed === null ? 'N/D' : `${formatForecastNumber(current.windSpeed)} ${units.windSpeed}`} />
        <WeatherMetric label="Dirección" value={current.windDirection === null ? 'N/D' : `${formatForecastNumber(current.windDirection)}°`} />
        <WeatherMetric label="Índice UV" value={uvValue} />
      </dl>
      {today && <dl className="current-weather__solar" aria-label="Sol de hoy">
        <div><dt>Amanecer</dt><dd>{formatForecastTime(today.sunrise ?? '') ?? 'No disponible'}</dd></div>
        <div><dt>Atardecer</dt><dd>{formatForecastTime(today.sunset ?? '') ?? 'No disponible'}</dd></div>
        <div><dt>Duración del día</dt><dd>{formatDaylightDuration(today.daylightDuration)}</dd></div>
      </dl>}
    </section>
  );
}

export function CurrentWeather({ activeLocation }: CurrentWeatherProps) {
  const [forecastDays, setForecastDays] = useState(DEFAULT_FORECAST_DAYS);
  const [forecastView, setForecastView] = useState<ForecastView>('daily');
  const [rangeError, setRangeError] = useState(false);
  const [activeArea, setActiveArea] = useState<'climate' | 'compare' | 'history' | 'air'>('climate');
  const comparisonMode = activeArea === 'compare';
  const [comparisonLocations, setComparisonLocations] = useState<Location[]>([]);
  const [comparisonSearchKey, setComparisonSearchKey] = useState(0);
  const [comparisonFeedback, setComparisonFeedback] = useState<{ message: string; kind: 'error' | 'status' } | null>(null);
  const [model, setModel] = useState<ForecastModel>(DEFAULT_FORECAST_MODEL);
  const [modelFallbackError, setModelFallbackError] = useState<AppError | null>(null);
  const preferences = useForecastPreferences();
  const handleForecastSuccess = useCallback(() => setModelFallbackError(null), []);
  const handleUnsupportedModel = useCallback((error: AppError) => {
    setModelFallbackError(error);
    setModel(DEFAULT_FORECAST_MODEL);
  }, []);
  const forecastCallbacks = { onSuccess: handleForecastSuccess, onUnsupportedModel: handleUnsupportedModel };
  const { state, retry, isRefreshing } = useCurrentWeather(activeArea === 'climate' ? activeLocation : null, forecastDays, preferences.units, model, forecastCallbacks);

  function addComparisonLocation(location: Location) {
    if (comparisonLocations.some((existing) => areSameLocation(existing, location))) {
      setComparisonFeedback({ message: 'Esta ubicación ya está en la comparación.', kind: 'error' });
      return;
    }
    if (comparisonLocations.length >= 4) {
      setComparisonFeedback({ message: 'Puede comparar hasta 4 ciudades a la vez.', kind: 'error' });
      return;
    }
    setComparisonLocations((previous) => [...previous, location]);
    setComparisonSearchKey((current) => current + 1);
    setComparisonFeedback({ message: `${location.name} se agregó a la comparación (${comparisonLocations.length + 1} de 4).`, kind: 'status' });
  }

  function removeComparisonLocation(location: Location) {
    setComparisonLocations((previous) => previous.filter((existing) => !areSameLocation(existing, location)));
    setComparisonFeedback(null);
  }

  function updateForecastDays(rawValue: string) {
    const nextDays = rawValue.trim() === '' ? Number.NaN : Number(rawValue);
    if (!Number.isInteger(nextDays) || nextDays < 1 || nextDays > 16) {
      setRangeError(true);
      if (Number.isFinite(nextDays)) setForecastDays(Math.min(16, Math.max(1, Math.trunc(nextDays))));
      return;
    }
    setRangeError(false);
    setForecastDays(nextDays);
  }

  return (
    <div className="current-weather" data-area={activeArea}>
      <nav className="current-weather__mode-buttons" aria-label="Áreas de consulta">
        <button type="button" aria-pressed={activeArea === 'climate'} onClick={() => setActiveArea('climate')}>Clima</button>
        <button type="button" aria-pressed={comparisonMode} onClick={() => setActiveArea('compare')}>Comparar ciudades</button>
        <button type="button" aria-pressed={activeArea === 'history'} onClick={() => setActiveArea('history')}>Históricos</button>
        <button type="button" aria-pressed={activeArea === 'air'} onClick={() => setActiveArea('air')}>Calidad del aire</button>
      </nav>
      {activeArea === 'climate' && !activeLocation && (
        <p className="current-weather__prompt">
          Busca una ciudad o utiliza tu ubicación para consultar el clima.
        </p>
      )}
      {(activeLocation || comparisonMode) && (activeArea === 'climate' || activeArea === 'compare') && (
        <div className="current-weather__forecast-controls">
          <div className="current-weather__forecast-setting">
            <label htmlFor="forecast-days">Días de pronóstico</label>
            <input id="forecast-days" type="number" min="1" max="16" step="1" value={forecastDays} onChange={(event) => updateForecastDays(event.currentTarget.value)} aria-invalid={rangeError} aria-describedby={rangeError ? 'forecast-days-error' : undefined} />
            {rangeError && <p id="forecast-days-error" className="current-weather__range-error" role="alert">El pronóstico admite entre 1 y 16 días.</p>}
          </div>
          {!comparisonMode && <div className="current-weather__forecast-setting" role="group" aria-label="Vista del pronóstico">
            <span>Vista</span>
            <div className="current-weather__view-buttons">
              <button type="button" aria-pressed={forecastView === 'daily'} onClick={() => setForecastView('daily')}>Diario</button>
              <button type="button" aria-pressed={forecastView === 'hourly'} onClick={() => setForecastView('hourly')}>Horario</button>
            </div>
          </div>}
        </div>
      )}
      {(activeLocation || comparisonMode) && (activeArea === 'climate' || activeArea === 'compare') && <details className="current-weather__preferences" aria-label="Preferencias del pronóstico">
        <summary>Preferencias del pronóstico <span aria-hidden="true">·</span> {FORECAST_MODELS.find((option) => option.value === model)?.label ?? 'Automático'}</summary>
        <div className="current-weather__preferences-content">
        <fieldset className="current-weather__unit-settings">
          <legend>Unidades</legend>
          <div className="current-weather__unit-grid">
            <div className="current-weather__forecast-setting"><label htmlFor="temperature-unit">Temperatura</label><select id="temperature-unit" value={preferences.units.temperature} onChange={(event) => preferences.setTemperatureUnit(event.currentTarget.value as TemperatureUnit)}><option value="celsius">°C</option><option value="fahrenheit">°F</option></select></div>
            <div className="current-weather__forecast-setting"><label htmlFor="wind-unit">Viento</label><select id="wind-unit" value={preferences.units.windSpeed} onChange={(event) => preferences.setWindSpeedUnit(event.currentTarget.value as WindSpeedUnit)}><option value="kmh">km/h</option><option value="mph">mph</option></select></div>
            <div className="current-weather__forecast-setting"><label htmlFor="precipitation-unit">Precipitación</label><select id="precipitation-unit" value={preferences.units.precipitation} onChange={(event) => preferences.setPrecipitationUnit(event.currentTarget.value as PrecipitationUnit)}><option value="mm">mm</option><option value="inch">in</option></select></div>
          </div>
        </fieldset>
        <div className="current-weather__advanced-group">
          <details className="current-weather__advanced">
            <summary>Opciones avanzadas</summary>
            <div className="current-weather__forecast-setting"><label htmlFor="forecast-model">Modelo numérico</label><select id="forecast-model" value={model} onChange={(event) => { setModelFallbackError(null); setModel(event.currentTarget.value as ForecastModel); }}>{FORECAST_MODELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          </details>
          <p className="current-weather__model-label">Modelo: {FORECAST_MODELS.find((option) => option.value === model)?.label ?? 'Automático'}</p>
        </div>
        </div>
      </details>}
      {activeArea === 'climate' && activeLocation && state.status === 'loading' && (
        <p className="current-weather__status" role="status" aria-live="polite">{isRefreshing ? 'Actualizando pronóstico…' : 'Consultando clima…'}</p>
      )}
      {(activeArea === 'climate' || comparisonMode) && modelFallbackError && <p className="current-weather__model-fallback" role="alert">{APP_ERROR_MESSAGES['E-04']}</p>}
      {activeArea === 'climate' && activeLocation && state.status === 'error' && (
        <div className="current-weather__error" role="alert">
          <span>{state.error.message}</span>
          <button className="current-weather__retry" type="button" onClick={retry}>Reintentar</button>
        </div>
      )}
      {activeArea === 'climate' && activeLocation && state.status === 'success' && (
        <>
          <CurrentWeatherDetails forecast={state.data} location={activeLocation} />
          <ForecastPanel forecast={state.data} view={forecastView} />
        </>
      )}
      {comparisonMode && (
        <section className="current-weather__comparison-setup" aria-labelledby="comparison-setup-title">
          <h2 id="comparison-setup-title">Agregar ciudades</h2>
          <p className="current-weather__comparison-count" aria-live="polite">{comparisonLocations.length} de 4 ubicaciones agregadas</p>
          <CitySearch key={comparisonSearchKey} activeLocation={null} title="Buscar una ciudad para comparar" headingLevel={3} onSelectLocation={addComparisonLocation} />
          {activeLocation && <button className="current-weather__add-active" type="button" onClick={() => addComparisonLocation(activeLocation)}>Agregar ubicación seleccionada ({activeLocation.name})</button>}
          {comparisonFeedback && <p className={`current-weather__comparison-feedback current-weather__comparison-feedback--${comparisonFeedback.kind}`} role={comparisonFeedback.kind === 'error' ? 'alert' : 'status'}>{comparisonFeedback.message}</p>}
          <CityComparison
            locations={comparisonLocations}
            forecastDays={forecastDays}
            units={preferences.units}
            model={model}
            onRemove={removeComparisonLocation}
            onSuccess={handleForecastSuccess}
            onUnsupportedModel={handleUnsupportedModel}
          />
        </section>
      )}
      {activeArea === 'history' && <HistoricalWeather activeLocation={activeLocation} units={preferences.units} />}
      {activeArea === 'air' && <AirQualityPanel activeLocation={activeLocation} />}
    </div>
  );
}
