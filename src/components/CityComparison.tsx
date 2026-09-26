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

interface CityComparisonProps {
  locations: readonly Location[];
  forecastDays: number;
  units: ForecastUnits;
  model: ForecastModel;
  onRemove: (location: Location) => void;
  onSuccess?: () => void;
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
  if (value === null || !Number.isFinite(value)) return 'N/D';
  const category = getUvCategory(value);
  return `${formatForecastNumber(value)}${category ? ` — ${category}` : ''}`;
}

function renderCondition(state: CityForecastState): ReactNode {
  if (state.status !== 'success') return 'N/D';
  const condition = mapWeatherCode(state.data.current.weatherCode);
  return <span className="city-comparison__condition"><WeatherConditionIcon iconKey={condition.iconKey} /><span>{condition.label}</span></span>;
}

function valueFor(state: CityForecastState, getValue: (state: Extract<CityForecastState, { status: 'success' }>) => string): string {
  return state.status === 'success' ? getValue(state) : 'N/D';
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
  if (dayCount === 0) return <p className="city-comparison__empty">No hay pronóstico diario disponible para las ciudades cargadas.</p>;

  return (
    <section className="city-comparison__daily" aria-labelledby="comparison-daily-title">
      <h3 id="comparison-daily-title">Pronóstico diario comparado</h3>
      {Array.from({ length: dayCount }, (_, dayIndex) => (
        <div className="city-comparison__table-scroll" role="region" aria-label={`Pronóstico del día ${dayIndex + 1}`} tabIndex={0} key={dayIndex}>
          <table className="city-comparison__table">
            <caption>Pronóstico del día {dayIndex + 1}</caption>
            <thead><tr><th scope="col">Variable</th>{locations.map((location) => <th scope="col" key={location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id}>{location.name}</th>)}</tr></thead>
            <tbody>
              <ComparisonRow label="Fecha local" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => {
                const day = result.data.daily[dayIndex];
                if (!day) return 'N/D';
                const date = formatForecastDate(day.date);
                return date ? `${date.weekday} ${date.date}` : 'N/D';
              })} />
              <ComparisonRow label="Condición" locations={locations} getState={getState} value={(_, state) => {
                if (state.status !== 'success') return 'N/D';
                const day = state.data.daily[dayIndex];
                return day ? mapWeatherCode(day.weatherCode).label : 'N/D';
              }} />
              <ComparisonRow label="Máxima" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.daily[dayIndex]?.temperatureMax ?? null, getForecastUnits(result.data.units).temperature))} />
              <ComparisonRow label="Mínima" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.daily[dayIndex]?.temperatureMin ?? null, getForecastUnits(result.data.units).temperature))} />
              <ComparisonRow label="Precipitación" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.daily[dayIndex]?.precipitationSum ?? null, getForecastUnits(result.data.units).precipitation))} />
              <ComparisonRow label="Probabilidad máxima" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => {
                const amount = result.data.daily[dayIndex]?.precipitationProbabilityMax;
                return amount === null || amount === undefined ? 'N/D' : `${formatForecastNumber(amount, 0)} %`;
              })} />
              <ComparisonRow label="Viento máximo" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.daily[dayIndex]?.windSpeedMax ?? null, getForecastUnits(result.data.units).windSpeed))} />
              <ComparisonRow label="UV máximo" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatUv(result.data.daily[dayIndex]?.uvIndexMax ?? null))} />
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

export function CityComparison({ locations, forecastDays, units, model, onRemove, onSuccess, onUnsupportedModel }: CityComparisonProps) {
  const forecastLocations = locations.length >= 2 ? locations : [];
  const { getState, retry } = useComparisonForecasts(forecastLocations, forecastDays, units, model, onSuccess, onUnsupportedModel);
  const modelName = FORECAST_MODELS.find((option) => option.value === model)?.label ?? 'Automático';
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
          <h2 id="city-comparison-title">Comparación de ciudades</h2>
          <p>Modelo: {modelName} · Pronóstico: {forecastDays} días · Unidades compartidas para todas las ciudades.</p>
        </div>
      </header>

      <ul className="city-comparison__locations" aria-label="Ciudades en comparación">
        {locations.map((location) => (
          <li key={location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id}>
            <span>{location.name}</span>
            <button type="button" aria-label={`Quitar ${location.name} de la comparación`} onClick={() => onRemove(location)}>Quitar</button>
          </li>
        ))}
      </ul>

      {locations.length < 2 ? (
        <p className="city-comparison__minimum" role="status">Agregue al menos dos ciudades para comparar.</p>
      ) : (
        <>
          <div className="city-comparison__statuses" aria-live="polite">
            {locations.map((location) => {
              const state = getState(location);
              const key = location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id;
              if (state.status === 'loading') return <p key={key} role="status">Consultando {location.name}…</p>;
              if (state.status === 'error') return null;
              return null;
            })}
          </div>
          {errors.map(({ location, state }) => (
            <div className="city-comparison__error" role="alert" key={location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id}>
              <span>{location.name}: {APP_ERROR_MESSAGES[state.error.code]}</span>
              <button type="button" onClick={() => retry(location)} aria-label={`Reintentar ${location.name}`}>Reintentar</button>
            </div>
          ))}

          <section aria-labelledby="comparison-current-title">
            <h3 id="comparison-current-title">Comparación actual</h3>
            <div className="city-comparison__table-scroll" role="region" aria-label="Tabla de clima actual comparado" tabIndex={0}>
              <table className="city-comparison__table">
                <caption>Clima actual por ciudad. Datos en las mismas unidades y modelo.</caption>
                <thead><tr><th scope="col">Variable</th>{locations.map((location) => <th scope="col" key={location.id === 'geolocation' ? `${location.latitude},${location.longitude}` : location.id}>{location.name}</th>)}</tr></thead>
                <tbody>
                  <ComparisonRow label="Condición" locations={locations} getState={getState} value={(_, state) => renderCondition(state)} />
                  <ComparisonRow label="Actualizado" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastTime(result.data.current.time) ?? 'N/D')} />
                  <ComparisonRow label="Elevación" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => {
                    const elevation = result.data.location.elevation;
                    return typeof elevation === 'number' && Number.isFinite(elevation) ? `${formatForecastNumber(elevation)} m s. n. m.` : 'no disponible';
                  })} />
                  <ComparisonRow label="Temperatura" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.current.temperature, getForecastUnits(result.data.units).temperature))} />
                  <ComparisonRow label="Sensación térmica" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.current.apparentTemperature, getForecastUnits(result.data.units).temperature))} />
                  <ComparisonRow label="Humedad" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => result.data.current.relativeHumidity === null ? 'N/D' : `${formatForecastNumber(result.data.current.relativeHumidity)} %`)} />
                  <ComparisonRow label="Precipitación" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.current.precipitation, getForecastUnits(result.data.units).precipitation))} />
                  <ComparisonRow label="Viento" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatForecastMeasure(result.data.current.windSpeed, getForecastUnits(result.data.units).windSpeed))} />
                  <ComparisonRow label="Dirección del viento" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => result.data.current.windDirection === null ? 'N/D' : `${formatForecastNumber(result.data.current.windDirection, 0)}°`)} />
                  <ComparisonRow label="Índice UV" locations={locations} getState={getState} value={(_, state) => valueFor(state, (result) => formatUv(result.data.current.uvIndex))} />
                </tbody>
              </table>
            </div>
          </section>

          {elevationDifference !== null && elevationDifference > 300 && (
            <p className="city-comparison__elevation-note" role="note">Existe una diferencia importante de altitud entre las ciudades comparadas; la altitud puede influir en la temperatura.</p>
          )}
          <DailyComparison locations={locations} getState={getState} />
        </>
      )}
    </section>
  );
}
