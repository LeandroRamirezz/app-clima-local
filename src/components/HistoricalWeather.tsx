import { useState, type FormEvent } from 'react';
import { APP_ERROR_MESSAGES } from '../types/errors';
import type { ForecastUnits } from '../types/forecast';
import { HistoricalDateError } from '../types/historical';
import type { Location } from '../types/location';
import { getHistoricalDateLimits, getDefaultHistoricalRange, validateHistoricalDateRange, formatHistoricalDate } from '../utils/historical-dates';
import { formatForecastNumber, getForecastUnits } from '../utils/forecast-presentation';
import { useHistoricalWeather } from '../hooks/useHistoricalWeather';

interface HistoricalWeatherProps {
  activeLocation: Location | null;
  units: ForecastUnits;
}

function formatLocation(location: Location): string {
  if (location.source === 'geolocation') return `Mi ubicación (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`;
  return [location.name, location.admin1, location.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

function hasValidLocation(location: Location | null): location is Location {
  return location !== null && Number.isFinite(location.latitude) && location.latitude >= -90 && location.latitude <= 90
    && Number.isFinite(location.longitude) && location.longitude >= -180 && location.longitude <= 180;
}

function displayHistoricalValue(value: number | null, unit: string, fractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) return 'N/D';
  return `${formatForecastNumber(value, fractionDigits)} ${unit}`;
}

export function HistoricalWeather({ activeLocation, units }: HistoricalWeatherProps) {
  const [startDate, setStartDate] = useState(() => getDefaultHistoricalRange().startDate);
  const [endDate, setEndDate] = useState(() => getDefaultHistoricalRange().endDate);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const { state, submit, retry } = useHistoricalWeather(activeLocation, units);
  const locationIsValid = hasValidLocation(activeLocation);
  const dateLimits = getHistoricalDateLimits();
  const historicalUnits = getForecastUnits(units);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!locationIsValid) {
      setValidationMessage('Seleccione una ubicación válida antes de consultar datos históricos.');
      return;
    }
    try {
      validateHistoricalDateRange(startDate, endDate);
      setValidationMessage(null);
      submit({ startDate, endDate });
    } catch (error) {
      setValidationMessage(error instanceof HistoricalDateError ? error.message : 'Ingrese fechas válidas para consultar el histórico.');
    }
  }

  const querySnapshot = state.status === 'idle' ? null : state.snapshot;
  const dateDescription = querySnapshot
    ? querySnapshot.startDate === querySnapshot.endDate
      ? formatHistoricalDate(querySnapshot.startDate)
      : `${formatHistoricalDate(querySnapshot.startDate)} – ${formatHistoricalDate(querySnapshot.endDate)}`
    : null;
  const resultHeading = `Histórico — ${dateDescription ?? ''}`;
  const resultUnits = state.status === 'success' ? getForecastUnits(state.data.units) : historicalUnits;

  return (
    <section className="historical-weather" aria-labelledby="historical-weather-title">
      <header className="historical-weather__header">
        <div>
          <p className="historical-weather__eyebrow">Registro climático</p>
          <h2 id="historical-weather-title">Históricos</h2>
          <p>Consulta datos diarios de temperatura, precipitación, viento y humedad.</p>
        </div>
      </header>

      {!locationIsValid && <p className="historical-weather__empty">Seleccione una ubicación antes de consultar datos históricos.</p>}

      <form className="historical-weather__form" onSubmit={handleSubmit} noValidate>
        <div className="historical-weather__date-field">
          <label htmlFor="historical-start-date">Fecha inicial</label>
          <input
            id="historical-start-date"
            lang="es-CO"
            type="date"
            min="1940-01-01"
            max={dateLimits.lastAvailableDate}
            value={startDate}
            onChange={(event) => setStartDate(event.currentTarget.value)}
            aria-invalid={Boolean(validationMessage)}
            aria-describedby={validationMessage ? 'historical-date-error' : 'historical-start-date-format'}
          />
          <span id="historical-start-date-format" className="historical-weather__format-help">Formato: DD/MM/AAAA</span>
        </div>
        <div className="historical-weather__date-field">
          <label htmlFor="historical-end-date">Fecha final</label>
          <input
            id="historical-end-date"
            lang="es-CO"
            type="date"
            min="1940-01-01"
            max={dateLimits.lastAvailableDate}
            value={endDate}
            onChange={(event) => setEndDate(event.currentTarget.value)}
            aria-invalid={Boolean(validationMessage)}
            aria-describedby={validationMessage ? 'historical-date-error' : 'historical-end-date-format'}
          />
          <span id="historical-end-date-format" className="historical-weather__format-help">Formato: DD/MM/AAAA</span>
        </div>
        <button className="historical-weather__submit" type="submit" disabled={!locationIsValid}>Consultar histórico</button>
      </form>

      {validationMessage && <p id="historical-date-error" className="historical-weather__validation" role="alert">{validationMessage}</p>}

      {state.status === 'loading' && <p className="historical-weather__status" role="status" aria-live="polite">Consultando datos históricos…</p>}
      {state.status === 'error' && <div className="historical-weather__error" role="alert">
        <span>{APP_ERROR_MESSAGES[state.error.code]}</span>
        <button type="button" className="historical-weather__retry" onClick={retry}>Reintentar</button>
      </div>}

      {state.status === 'success' && locationIsValid && (
        <div className="historical-weather__results">
          <div className="historical-weather__results-header">
            <div>
              <h3>{resultHeading}</h3>
              <p>{formatLocation(activeLocation!)} · {state.data.days.length} {state.data.days.length === 1 ? 'día' : 'días'}</p>
            </div>
            <span className="historical-weather__units">{resultUnits.temperature} · {resultUnits.windSpeed} · {resultUnits.precipitation}</span>
          </div>
          <p className="historical-weather__result-status" role="status">Se encontraron {state.data.days.length} {state.data.days.length === 1 ? 'día' : 'días'} de datos históricos.</p>
          <div className="historical-weather__table-scroll" role="region" aria-label="Resultados meteorológicos históricos" tabIndex={0}>
            <table className="historical-weather__table">
              <caption>Datos meteorológicos diarios de {formatLocation(activeLocation!)} entre {dateDescription}</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Máxima</th>
                  <th scope="col">Mínima</th>
                  <th scope="col">Media</th>
                  <th scope="col">Precipitación</th>
                  <th scope="col">Viento máx.</th>
                  <th scope="col">Humedad media</th>
                </tr>
              </thead>
              <tbody>
                {state.data.days.map((day) => (
                  <tr key={day.date}>
                    <th scope="row">{formatHistoricalDate(day.date)}</th>
                    <td>{displayHistoricalValue(day.temperatureMax, resultUnits.temperature)}</td>
                    <td>{displayHistoricalValue(day.temperatureMin, resultUnits.temperature)}</td>
                    <td>{displayHistoricalValue(day.temperatureMean, resultUnits.temperature)}</td>
                    <td>{displayHistoricalValue(day.precipitationSum, resultUnits.precipitation)}</td>
                    <td>{displayHistoricalValue(day.windSpeedMax, resultUnits.windSpeed)}</td>
                    <td>{displayHistoricalValue(day.humidity, state.data.units.humidity, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
