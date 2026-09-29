import type { ReactNode } from 'react';
import type { ForecastModel, ForecastUnits } from '../types/forecast';
import type { Location } from '../types/location';
import { APP_ERROR_MESSAGES } from '../types/errors';
import { FORECAST_MODELS } from '../config/forecast';
import { useComparisonForecasts, type CityForecastState } from '../hooks/useComparisonForecasts';
import { formatForecastDate, formatForecastMeasure, formatForecastNumber, formatForecastTime, getForecastUnits } from '../utils/forecast-presentation';
import { getUvCategory } from '../utils/uv-category';
import { mapWeatherCode } from '../utils/weather-code';
import { getElevationDifference } from '../utils/location-identity';
import { WeatherConditionIcon } from './WeatherConditionIcon';
import { es } from '../i18n/es';

interface CityComparisonProps {
  locations: readonly Location[];
  forecastDays: number;
  units: ForecastUnits;
  model: ForecastModel;
  onRemove: (location: Location) => void;
  onUnsupportedModel?: (error: import('../types/errors').AppError) => void;
}

interface ComparisonRowProps {
  label: string;
  locations: readonly Location[];
  getState: (location: Location) => CityForecastState;
  value: (location: Location, state: CityForecastState) => ReactNode;
}

function ComparisonRow({ label, locations, getState, value }: ComparisonRowProps) {
  return (
    <tr>
      <th scope="row">{label}</th>
      {locations.map((location) => <td key={location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id}>{value(location, getState(location))}</td>)}
    </tr>
  );
}

function formatUv(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return es.common.notAvailable;
  const category = getUvCategory(value);
  return `${formatForecastNumber(value)}${category ? ` — ${category}` : ''}`;
}

function renderCondition(state: CityForecastState): ReactNode {
  if (state.status !== 'success') return es.common.notAvailable;
  const condition = mapWeatherCode(state.data.current.weatherCode);
  return <span className="city-comparison__condition"><WeatherConditionIcon iconKey={condition.iconKey} /><span>{condition.label}</span></span>;
}

function valueFor(state: CityForecastState, getValue: (state: Extract<CityForecastState, { status: 'success' }>) => string): string {
  return state.status === 'success' ? getValue(state) : es.common.notAvailable;
}

function DailyComparison({
  locations,
  getState,
}: {
  locations: readonly Location[];
  getState: (location: Location) => CityForecastState;
}) {
  const dayCount = Math.max(0, ...locations.map((location) => {
    const state = getState(location);
    return state.status === 'success' ? state.data.daily.length : 0;
  }));
  if (dayCount === 0) return <p className="city-comparison__empty">{es.comparison.emptyDaily}</p>;

  return (
    <section className="city-comparison__daily" aria-labelledby="comparison-daily-title">
      <h3 id="comparison-daily-title">{es.comparison.dailyTitle}</h3>
      {Array.from({ length: dayCount }, (_, dayIndex) => (
        <div className="city-comparison__table-scroll" role="region" aria-label={es.comparison.day(dayIndex + 1)} tabIndex={0} key={dayIndex}>
          <table className="city-comparison__table">
            <caption>{es.comparison.day(dayIndex + 1)}</caption>
            <thead><tr><th scope="col">{es.comparison.variable}</th>{locations.map((location) => <th scope="col" key={location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id}>{location.name}</th>)}</tr></thead>
            <tbody>
              <ComparisonRow label={es.comparison.localDate} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => {
                const day = result.data.daily[dayIndex];
                if (!day) return es.common.notAvailable;
                const date = formatForecastDate(day.date);
                return date ? `${date.weekday} ${date.date}` : es.common.notAvailable;
              })} />
              <ComparisonRow label={es.comparison.condition} locations={locations} getState={getState} value={(_, state) => {
                if (state.status !== 'success') return es.common.notAvailable;
                const day = state.data.daily[dayIndex];
                return day ? mapWeatherCode(day.weatherCode).label : es.common.notAvailable;
              }} />
              <ComparisonRow label={es.comparison.max} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.daily[dayIndex]?.temperatureMax ?? null, getForecastUnits(result.data.units).temperature))} />
              <ComparisonRow label={es.comparison.min} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.daily[dayIndex]?.temperatureMin ?? null, getForecastUnits(result.data.units).temperature))} />
              <ComparisonRow label={es.comparison.precipitation} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.daily[dayIndex]?.precipitationSum ?? null, getForecastUnits(result.data.units).precipitation))} />
              <ComparisonRow label={es.comparison.maxProbability} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => {
                const amount = result.data.daily[dayIndex]?.precipitationProbabilityMax;
                return amount === null || amount === undefined ? es.common.notAvailable : `${formatForecastNumber(amount, 0)} %`;
              })} />
              <ComparisonRow label={es.comparison.maxWind} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.daily[dayIndex]?.windSpeedMax ?? null, getForecastUnits(result.data.units).windSpeed))} />
              <ComparisonRow label={es.comparison.maxUv} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatUv(result.data.daily[dayIndex]?.uvIndexMax ?? null))} />
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

export function CityComparison({ locations, forecastDays, units, model, onRemove, onUnsupportedModel }: CityComparisonProps) {
  const forecastLocations = locations.length >= 2 ? locations : [];
  const { getState, retry } = useComparisonForecasts(forecastLocations, forecastDays, units, model, onUnsupportedModel);
  const modelName = FORECAST_MODELS.find((option) => option.value === model)?.label ?? es.model.automatic.label;
  const errors = locations.flatMap((location) => {
    const state = getState(location);
    return state.status === 'error' ? [{ location, state }] : [];
  });
  const elevations: Location[] = locations.map((location) => {
    const state = getState(location);
    return { ...location, elevation: state.status === 'success' ? state.data.location.elevation ?? undefined : undefined };
  });
  const elevationDifference = getElevationDifference(elevations);

  return (
    <section className="city-comparison" aria-labelledby="city-comparison-title">
      <header className="city-comparison__header">
        <div>
          <h2 id="city-comparison-title">{es.comparison.title}</h2>
          <p>{es.comparison.meta(modelName, forecastDays)}</p>
        </div>
      </header>

      <ul className="city-comparison__locations" aria-label={es.comparison.locationsLabel}>
        {locations.map((location) => (
          <li key={location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id}>
            <span>{location.name}</span>
            <button type="button" aria-label={es.comparison.removeNamed(location.name)} onClick={() => onRemove(location)}>{es.comparison.remove}</button>
          </li>
        ))}
      </ul>

      {locations.length < 2 ? (
        <p className="city-comparison__minimum" role="status">{es.comparison.minimum}</p>
      ) : (
        <>
          <div className="city-comparison__statuses" aria-live="polite">
            {locations.map((location) => {
              const state = getState(location);
              const key = location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id;
              if (state.status === 'loading') return <p key={key} role="status">{es.comparison.loading(location.name)}</p>;
              if (state.status === 'error') return null;
              return null;
            })}
          </div>
          {errors.map(({ location, state }) => (
            <div className="city-comparison__error" role="alert" key={location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id}>
              <span>{location.name}: {APP_ERROR_MESSAGES[state.error.code]}</span>
              <button type="button" onClick={() => retry(location)} aria-label={es.comparison.retryNamed(location.name)}>{es.common.retry}</button>
            </div>
          ))}

          <section aria-labelledby="comparison-current-title">
            <h3 id="comparison-current-title">{es.comparison.currentTitle}</h3>
            <div className="city-comparison__table-scroll" role="region" aria-label={es.comparison.currentTable} tabIndex={0}>
              <table className="city-comparison__table">
                <caption>{es.comparison.currentCaption}</caption>
                <thead><tr><th scope="col">{es.comparison.variable}</th>{locations.map((location) => <th scope="col" key={location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id}>{location.name}</th>)}</tr></thead>
                <tbody>
                  <ComparisonRow label={es.comparison.condition} locations={locations} getState={getState} value={(_, state) => renderCondition(state)} />
                  <ComparisonRow label={es.comparison.updated} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastTime(result.data.current.time) ?? es.common.notAvailable)} />
                  <ComparisonRow label={es.comparison.elevation} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => {
                    const elevation = result.data.location.elevation;
                    return typeof elevation === 'number' && Number.isFinite(elevation) ? `${formatForecastNumber(elevation)} ${es.common.elevationUnit}` : es.weather.elevationUnavailable;
                  })} />
                  <ComparisonRow label={es.comparison.temperature} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.current.temperature, getForecastUnits(result.data.units).temperature))} />
                  <ComparisonRow label={es.comparison.feelsLike} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.current.apparentTemperature, getForecastUnits(result.data.units).temperature))} />
                  <ComparisonRow label={es.comparison.humidity} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => result.data.current.relativeHumidity === null ? es.common.notAvailable : `${formatForecastNumber(result.data.current.relativeHumidity)} %`)} />
                  <ComparisonRow label={es.comparison.precipitation} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.current.precipitation, getForecastUnits(result.data.units).precipitation))} />
                  <ComparisonRow label={es.comparison.wind} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.current.windSpeed, getForecastUnits(result.data.units).windSpeed))} />
                  <ComparisonRow label={es.comparison.windDirection} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => result.data.current.windDirection === null ? es.common.notAvailable : `${formatForecastNumber(result.data.current.windDirection, 0)}°`)} />
                  <ComparisonRow label={es.comparison.uvIndex} locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatUv(result.data.current.uvIndex))} />
                </tbody>
              </table>
            </div>
          </section>

          {elevationDifference !== null && elevationDifference > 300 && (
            <p className="city-comparison__elevation-note" role="note">{es.comparison.elevationNote}</p>
          )}
          <DailyComparison locations={locations} getState={getState} />
        </>
      )}
    </section>
  );
}
