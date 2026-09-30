import { lazy, Suspense, useCallback, useState } from 'react';
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
import type { ForecastView } from './ForecastPanel';
import { WeatherConditionIcon } from './WeatherConditionIcon';
import { CitySearch } from './CitySearch';
import { es } from '../i18n/es';

const ForecastPanel = lazy(() => import('./ForecastPanel').then((module) => ({ default: module.ForecastPanel })));
const CityComparison = lazy(() => import('./CityComparison').then((module) => ({ default: module.CityComparison })));
const HistoricalWeather = lazy(() => import('./HistoricalWeather').then((module) => ({ default: module.HistoricalWeather })));
const AirQualityPanel = lazy(() => import('./AirQualityPanel').then((module) => ({ default: module.AirQualityPanel })));

interface CurrentWeatherProps {
  activeLocation: Location | null;
}

function formatLocationName(location: Location): string {
  if (location.source === 'geolocation') {
    return `${es.common.myLocation} (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`;
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
    ? es.common.notAvailable
    : `${formatForecastNumber(current.uvIndex)}${uvCategory ? ` — ${uvCategory}` : ''}`;
  const today = forecast.daily[0];

  return (
    <section className="current-weather__card" aria-labelledby="current-weather-title">
      <header className="current-weather__header">
        <div>
          <h2 id="current-weather-title">{es.weather.title}</h2>
          <p className="current-weather__location">{formatLocationName(location)}</p>
          <p className="current-weather__elevation">
            {es.weather.elevation}: {typeof forecast.location.elevation !== 'number' || !Number.isFinite(forecast.location.elevation) ? es.weather.elevationUnavailable : `${formatForecastNumber(forecast.location.elevation)} ${es.common.elevationUnit}`}
          </p>
          <p className="current-weather__elevation-note">{es.weather.elevationNote}</p>
          {updatedTime && <p className="current-weather__updated">{es.weather.updated}: {updatedTime}</p>}
        </div>
        <div className="current-weather__condition">
          <WeatherConditionIcon iconKey={condition.iconKey} />
          <span>{condition.label}</span>
        </div>
      </header>

      <p className="current-weather__temperature">
        <span className="current-weather__temperature-label">{es.weather.temperature}</span>
        <strong>{formatForecastMeasure(current.temperature, units.temperature)}</strong>
      </p>

      <dl className="current-weather__metrics">
        <WeatherMetric label={es.weather.feelsLike} value={formatForecastMeasure(current.apparentTemperature, units.temperature)} />
        <WeatherMetric label={es.weather.humidity} value={`${formatForecastNumber(current.relativeHumidity)}${current.relativeHumidity === null ? '' : ' %'}`} />
        <WeatherMetric label={es.weather.precipitation} value={current.precipitation === null ? es.common.notAvailable : `${formatForecastNumber(current.precipitation)} ${units.precipitation}`} />
        <WeatherMetric label={es.weather.wind} value={current.windSpeed === null ? es.common.notAvailable : `${formatForecastNumber(current.windSpeed)} ${units.windSpeed}`} />
        <WeatherMetric label={es.weather.direction} value={current.windDirection === null ? es.common.notAvailable : `${formatForecastNumber(current.windDirection)}°`} />
        <WeatherMetric label={es.weather.uvIndex} value={uvValue} />
      </dl>
      {today && <dl className="current-weather__solar" aria-label={es.weather.todaySun}>
        <div><dt>{es.forecast.sunrise}</dt><dd>{formatForecastTime(today.sunrise ?? '') ?? es.common.unavailable}</dd></div>
        <div><dt>{es.forecast.sunset}</dt><dd>{formatForecastTime(today.sunset ?? '') ?? es.common.unavailable}</dd></div>
        <div><dt>{es.forecast.daylightDuration}</dt><dd>{formatDaylightDuration(today.daylightDuration)}</dd></div>
      </dl>}
    </section>
  );
}

export function CurrentWeather({ activeLocation }: CurrentWeatherProps) {
  const [forecastDays, setForecastDays] = useState(DEFAULT_FORECAST_DAYS);
  const [forecastView, setForecastView] = useState<ForecastView>('daily');
  const [rangeError, setRangeError] = useState(false);
  const [activeArea, setActiveArea] = useState<'climate' | 'compare' | 'history' | 'air'>('climate');
  const [historyVisited, setHistoryVisited] = useState(false);
  const comparisonMode = activeArea === 'compare';
  const historyMode = activeArea === 'history';
  const [comparisonLocations, setComparisonLocations] = useState<Location[]>([]);
  const [comparisonSearchKey, setComparisonSearchKey] = useState(0);
  const [comparisonFeedback, setComparisonFeedback] = useState<{ message: string; kind: 'error' | 'status' } | null>(null);
  const [model, setModel] = useState<ForecastModel>(DEFAULT_FORECAST_MODEL);
  const [modelFallbackError, setModelFallbackError] = useState<AppError | null>(null);
  const preferences = useForecastPreferences();
  const handleUnsupportedModel = useCallback((error: AppError) => {
    setModelFallbackError(error);
    setModel(DEFAULT_FORECAST_MODEL);
  }, []);
  const forecastCallbacks = { onUnsupportedModel: handleUnsupportedModel };
  const { state, retry, isRefreshing } = useCurrentWeather(activeArea === 'climate' ? activeLocation : null, forecastDays, preferences.units, model, forecastCallbacks);
  const modelCoverageUnavailable = model !== DEFAULT_FORECAST_MODEL
    && state.status === 'success'
    && state.data.current.temperature === null
    && state.data.current.weatherCode === null;
  const displayedForecast = state.status === 'success'
    ? state.data
    : state.status === 'error' ? state.previousData : null;

  function addComparisonLocation(location: Location) {
    if (comparisonLocations.some((existing) => areSameLocation(existing, location))) {
      setComparisonFeedback({ message: es.weather.alreadyCompared, kind: 'error' });
      return;
    }
    if (comparisonLocations.length >= 4) {
      setComparisonFeedback({ message: es.weather.limitCompared, kind: 'error' });
      return;
    }
    setComparisonLocations((previous) => [...previous, location]);
    setComparisonSearchKey((current) => current + 1);
    setComparisonFeedback({ message: es.weather.addedToComparison(location.name, comparisonLocations.length + 1), kind: 'status' });
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
      <nav className="current-weather__mode-buttons" aria-label={es.weather.areas}>
        <button type="button" aria-pressed={activeArea === 'climate'} onClick={() => setActiveArea('climate')}>{es.weather.climate}</button>
        <button type="button" aria-pressed={comparisonMode} onClick={() => setActiveArea('compare')}>{es.weather.compare}</button>
        <button type="button" aria-pressed={historyMode} onClick={() => { setHistoryVisited(true); setActiveArea('history'); }}>{es.weather.history}</button>
        <button type="button" aria-pressed={activeArea === 'air'} onClick={() => setActiveArea('air')}>{es.weather.air}</button>
      </nav>
      {activeArea === 'climate' && !activeLocation && (
        <p className="current-weather__prompt">
          {es.weather.prompt}
        </p>
      )}
      {(activeLocation || comparisonMode) && (activeArea === 'climate' || activeArea === 'compare') && (
        <div className="current-weather__forecast-controls">
          <div className="current-weather__forecast-setting">
            <label htmlFor="forecast-days">{es.weather.forecastDays}</label>
            <input id="forecast-days" type="number" min="1" max="16" step="1" value={forecastDays} onChange={(event) => updateForecastDays(event.currentTarget.value)} aria-invalid={rangeError} aria-describedby={rangeError ? 'forecast-days-error' : undefined} />
            {rangeError && <p id="forecast-days-error" className="current-weather__range-error" role="alert">{es.weather.rangeError}</p>}
          </div>
          {!comparisonMode && <div className="current-weather__forecast-setting" role="group" aria-label={es.weather.forecastView}>
            <span>{es.weather.view}</span>
            <div className="current-weather__view-buttons">
              <button type="button" aria-pressed={forecastView === 'daily'} onClick={() => setForecastView('daily')}>{es.weather.daily}</button>
              <button type="button" aria-pressed={forecastView === 'hourly'} onClick={() => setForecastView('hourly')}>{es.weather.hourly}</button>
            </div>
          </div>}
        </div>
      )}
      {(activeLocation || comparisonMode) && (activeArea === 'climate' || comparisonMode || historyMode) && <details className="current-weather__preferences" aria-label={historyMode ? es.weather.unitPreferences : es.weather.preferences}>
        <summary>{historyMode ? es.weather.unitPreferences : es.weather.preferences} {!historyMode && <><span aria-hidden="true">·</span> {FORECAST_MODELS.find((option) => option.value === model)?.label ?? es.model.automatic.label}</>}</summary>
        <div className="current-weather__preferences-content">
        <fieldset className="current-weather__unit-settings">
          <legend>{es.weather.units}</legend>
          <div className="current-weather__unit-grid">
            <div className="current-weather__forecast-setting"><label htmlFor="temperature-unit">{es.weather.temperature}</label><select id="temperature-unit" value={preferences.units.temperature} onChange={(event) => preferences.setTemperatureUnit(event.currentTarget.value as TemperatureUnit)}><option value="celsius">{es.common.temperatureCelsius}</option><option value="fahrenheit">{es.common.temperatureFahrenheit}</option></select></div>
            <div className="current-weather__forecast-setting"><label htmlFor="wind-unit">{es.weather.wind}</label><select id="wind-unit" value={preferences.units.windSpeed} onChange={(event) => preferences.setWindSpeedUnit(event.currentTarget.value as WindSpeedUnit)}><option value="kmh">{es.common.windKmh}</option><option value="mph">{es.common.windMph}</option></select></div>
            <div className="current-weather__forecast-setting"><label htmlFor="precipitation-unit">{es.weather.precipitation}</label><select id="precipitation-unit" value={preferences.units.precipitation} onChange={(event) => preferences.setPrecipitationUnit(event.currentTarget.value as PrecipitationUnit)}><option value="mm">{es.common.precipitationMm}</option><option value="inch">{es.common.precipitationInch}</option></select></div>
          </div>
        </fieldset>
        {!historyMode && <div className="current-weather__advanced-group">
          <details className="current-weather__advanced">
            <summary>{es.model.advancedOptions}</summary>
            <div className="current-weather__forecast-setting"><label htmlFor="forecast-model">{es.model.numericModel}</label><select id="forecast-model" aria-describedby="forecast-model-description" value={model} onChange={(event) => { setModelFallbackError(null); setModel(event.currentTarget.value as ForecastModel); }}>{FORECAST_MODELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><p className="current-weather__model-description" id="forecast-model-description">{FORECAST_MODELS.find((option) => option.value === model)?.description}</p></div>
          </details>
          <p className="current-weather__model-label">{es.model.activeModel}: {FORECAST_MODELS.find((option) => option.value === model)?.label ?? es.model.automatic.label}</p>
        </div>}
        </div>
      </details>}
      {activeArea === 'climate' && activeLocation && state.status === 'loading' && (
        <p className="current-weather__status" role="status" aria-live="polite">{isRefreshing ? es.weather.updating : es.weather.loading}</p>
      )}
      {(activeArea === 'climate' || comparisonMode) && modelFallbackError && <p className="current-weather__model-fallback" role="alert">{APP_ERROR_MESSAGES['E-04']}</p>}
      {activeArea === 'climate' && activeLocation && state.status === 'error' && (
        <div className="current-weather__error" role="alert">
          <span>{state.error.message}</span>
          {state.error.code !== 'E-03' && <button className="current-weather__retry" type="button" onClick={retry}>{es.common.retry}</button>}
        </div>
      )}
      {activeArea === 'climate' && activeLocation && state.status === 'error' && state.previousData && (
        <p className="current-weather__previous-data" role="status">{es.weather.previousData(getForecastUnits(state.previousData.units))}</p>
      )}
      {activeArea === 'climate' && activeLocation && displayedForecast && (
        <>
          {modelCoverageUnavailable && <div className="current-weather__model-coverage" role="status">
            <p>{es.model.coverageUnavailable(FORECAST_MODELS.find((option) => option.value === model)?.label ?? model)}</p>
            <button type="button" onClick={() => setModel(DEFAULT_FORECAST_MODEL)}>{es.model.backToAutomatic}</button>
          </div>}
          <CurrentWeatherDetails forecast={displayedForecast} location={activeLocation} />
          <Suspense fallback={<p className="current-weather__status" role="status">{es.weather.loadingSection}</p>}>
            <ForecastPanel forecast={displayedForecast} view={forecastView} />
          </Suspense>
        </>
      )}
      {comparisonMode && (
        <section className="current-weather__comparison-setup" aria-labelledby="comparison-setup-title">
          <h2 id="comparison-setup-title">{es.weather.addCities}</h2>
          <p className="current-weather__comparison-count" aria-live="polite">{es.weather.comparisonCount(comparisonLocations.length)}</p>
          <CitySearch key={comparisonSearchKey} activeLocation={null} title={es.weather.compareSearch} headingLevel={3} onSelectLocation={addComparisonLocation} />
          {activeLocation && <button className="current-weather__add-active" type="button" onClick={() => addComparisonLocation(activeLocation)}>{es.weather.addSelected(activeLocation.name)}</button>}
          {comparisonFeedback && <p className={`current-weather__comparison-feedback current-weather__comparison-feedback--${comparisonFeedback.kind}`} role={comparisonFeedback.kind === 'error' ? 'alert' : 'status'}>{comparisonFeedback.message}</p>}
          <Suspense fallback={<p className="current-weather__status" role="status">{es.weather.loadingSection}</p>}>
            <CityComparison
              locations={comparisonLocations}
              forecastDays={forecastDays}
              units={preferences.units}
              model={model}
              onRemove={removeComparisonLocation}
              onUnsupportedModel={handleUnsupportedModel}
            />
          </Suspense>
        </section>
      )}
      {historyVisited && <div hidden={!historyMode}><Suspense fallback={<p className="current-weather__status" role="status">{es.weather.loadingSection}</p>}><HistoricalWeather activeLocation={activeLocation} units={preferences.units} /></Suspense></div>}
      {activeArea === 'air' && <Suspense fallback={<p className="current-weather__status" role="status">{es.weather.loadingSection}</p>}><AirQualityPanel activeLocation={activeLocation} /></Suspense>}
    </div>
  );
}
