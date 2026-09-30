import { useState, type FormEvent } from 'react';
import { APP_ERROR_MESSAGES } from '../types/errors';
import type { ForecastUnits } from '../types/forecast';
import { HistoricalDateError } from '../types/historical';
import type { Location } from '../types/location';
import { getHistoricalDateLimits, getDefaultHistoricalRange, validateHistoricalDateRange, formatHistoricalDate, addCalendarDays } from '../utils/historical-dates';
import { formatForecastNumber, getForecastUnits } from '../utils/forecast-presentation';
import { useHistoricalWeather } from '../hooks/useHistoricalWeather';
import { formatHistoricalDifference, type HistoricalMetric } from '../utils/historical-comparison';
import { es } from '../i18n/es';
import { HistoricalCurrentComparison } from './HistoricalCurrentComparison';

interface HistoricalWeatherProps {
  activeLocation: Location | null;
  units: ForecastUnits;
}

function formatLocation(location: Location): string {
  if (location.source === 'geolocation') return `${es.common.myLocation} (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`;
  return [location.name, location.admin1, location.country]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ');
}

function hasValidLocation(location: Location | null): location is Location {
  return location !== null && Number.isFinite(location.latitude) && location.latitude >= -90 && location.latitude <= 90
    && Number.isFinite(location.longitude) && location.longitude >= -180 && location.longitude <= 180;
}

function displayHistoricalValue(value: number | null, unit: string, fractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) return es.common.notAvailable;
  return `${formatForecastNumber(value, fractionDigits)} ${unit}`;
}

export function HistoricalWeather({ activeLocation, units }: HistoricalWeatherProps) {
  const [startDate, setStartDate] = useState(() => getDefaultHistoricalRange().startDate);
  const [endDate, setEndDate] = useState(() => getDefaultHistoricalRange().endDate);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const { state, submit, retry } = useHistoricalWeather(activeLocation, units);
  const comparison = useHistoricalWeather(activeLocation, units);
  const [comparisonDate, setComparisonDate] = useState(() => addCalendarDays(getDefaultHistoricalRange().endDate, -1) ?? getDefaultHistoricalRange().endDate);
  const [comparisonBaseDate, setComparisonBaseDate] = useState<string | null>(null);
  const [comparisonValidation, setComparisonValidation] = useState<string | null>(null);
  const [comparisonMode, setComparisonMode] = useState<'historical' | 'current'>('historical');
  const [compareWithCurrent, setCompareWithCurrent] = useState(false);
  const locationIsValid = hasValidLocation(activeLocation);
  const dateLimits = getHistoricalDateLimits();
  const historicalUnits = getForecastUnits(units);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!locationIsValid) {
      setValidationMessage(es.historical.invalidLocation);
      return;
    }
    try {
      validateHistoricalDateRange(startDate, endDate);
      setValidationMessage(null);
      comparison.clear();
      setCompareWithCurrent(false);
      setComparisonBaseDate(null);
      setComparisonValidation(null);
      submit({ startDate, endDate });
    } catch (error) {
      setValidationMessage(error instanceof HistoricalDateError ? error.message : es.historical.invalidDate);
    }
  }

  function handleCompare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== 'success' || state.snapshot.startDate !== state.snapshot.endDate) return;
    try {
      validateHistoricalDateRange(comparisonDate, comparisonDate);
      if (comparisonDate === state.snapshot.startDate) {
        setComparisonValidation(es.historical.sameDate);
        return;
      }
      setComparisonValidation(null);
      setComparisonBaseDate(state.snapshot.startDate);
      comparison.submit({ startDate: comparisonDate, endDate: comparisonDate });
    } catch (error) {
      setComparisonValidation(error instanceof HistoricalDateError ? error.message : es.historical.invalidDate);
    }
  }

  const querySnapshot = state.status === 'idle' ? null : state.snapshot;
  const dateDescription = querySnapshot
    ? querySnapshot.startDate === querySnapshot.endDate
      ? formatHistoricalDate(querySnapshot.startDate)
      : `${formatHistoricalDate(querySnapshot.startDate)} – ${formatHistoricalDate(querySnapshot.endDate)}`
    : null;
  const resultHeading = `${es.historical.resultPrefix} — ${dateDescription ?? ''}`;
  const resultUnits = state.status === 'success' ? getForecastUnits(state.data.units) : historicalUnits;
  const primaryDay = state.status === 'success' && state.snapshot.startDate === state.snapshot.endDate
    ? state.data.days.find((day) => day.date === state.snapshot.startDate) : undefined;
  const comparisonDay = comparison.state.status === 'success' && comparisonBaseDate === primaryDay?.date
    && comparison.state.snapshot.startDate === comparisonDate
    ? comparison.state.data.days.find((day) => day.date === comparisonDate) : undefined;
  const comparisonMetrics: { key: HistoricalMetric; label: string; unit: string }[] = [
    { key: 'temperatureMax', label: es.historical.max, unit: resultUnits.temperature },
    { key: 'temperatureMin', label: es.historical.min, unit: resultUnits.temperature },
    { key: 'temperatureMean', label: es.historical.mean, unit: resultUnits.temperature },
    { key: 'precipitationSum', label: es.historical.precipitation, unit: resultUnits.precipitation },
    { key: 'windSpeedMax', label: es.historical.maxWind, unit: resultUnits.windSpeed },
    { key: 'humidity', label: es.historical.meanHumidity, unit: '%' },
  ];

  return (
    <section className="historical-weather" aria-labelledby="historical-weather-title">
      <header className="historical-weather__header">
        <div>
          <p className="historical-weather__eyebrow">{es.historical.eyebrow}</p>
          <h2 id="historical-weather-title">{es.historical.title}</h2>
          <p>{es.historical.description}</p>
        </div>
      </header>

      {!locationIsValid && <p className="historical-weather__empty">{es.historical.noLocation}</p>}

      <form className="historical-weather__form" onSubmit={handleSubmit} noValidate>
        <div className="historical-weather__date-field">
          <label htmlFor="historical-start-date">{es.historical.startDate}</label>
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
          <span id="historical-start-date-format" className="historical-weather__format-help">{es.historical.dateFormat}</span>
        </div>
        <div className="historical-weather__date-field">
          <label htmlFor="historical-end-date">{es.historical.endDate}</label>
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
          <span id="historical-end-date-format" className="historical-weather__format-help">{es.historical.dateFormat}</span>
        </div>
        <button className="historical-weather__submit" type="submit" disabled={!locationIsValid}>{es.historical.query}</button>
      </form>

      {validationMessage && <p id="historical-date-error" className="historical-weather__validation" role="alert">{validationMessage}</p>}

      {state.status === 'loading' && <p className="historical-weather__status" role="status" aria-live="polite">{es.historical.querying}</p>}
      {state.status === 'error' && <div className="historical-weather__error" role="alert">
        <span>{APP_ERROR_MESSAGES[state.error.code]}</span>
        <button type="button" className="historical-weather__retry" onClick={retry}>{es.historical.retry}</button>
      </div>}

      {state.status === 'success' && locationIsValid && (
        <div className="historical-weather__results">
          <div className="historical-weather__results-header">
            <div>
              <h3>{resultHeading}</h3>
              <p>{formatLocation(activeLocation!)} · {es.historical.dayCount(state.data.days.length)}</p>
            </div>
            <span className="historical-weather__units">{resultUnits.temperature} · {resultUnits.windSpeed} · {resultUnits.precipitation}</span>
          </div>
          <p className="historical-weather__result-status" role="status">{es.historical.resultStatus(state.data.days.length)}</p>
          <div className="historical-weather__table-scroll" role="region" aria-label={es.historical.resultRegion} tabIndex={0}>
            <table className="historical-weather__table">
              <caption>{es.historical.resultCaption(formatLocation(activeLocation!), dateDescription ?? '')}</caption>
              <thead>
                <tr>
                  <th scope="col">{es.historical.date}</th>
                  <th scope="col">{es.historical.max}</th>
                  <th scope="col">{es.historical.min}</th>
                  <th scope="col">{es.historical.mean}</th>
                  <th scope="col">{es.historical.precipitation}</th>
                  <th scope="col">{es.historical.maxWind}</th>
                  <th scope="col">{es.historical.meanHumidity}</th>
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
          {primaryDay ? <section className="historical-weather__comparison" aria-labelledby="historical-comparison-title">
            <h4 id="historical-comparison-title">{es.historical.comparisonTitle}</h4>
            <div className="historical-weather__compare-mode">
              <label htmlFor="historical-comparison-mode">{es.historical.comparisonMode}</label>
              <select id="historical-comparison-mode" value={comparisonMode} onChange={(event) => {
                setComparisonMode(event.currentTarget.value as 'historical' | 'current');
                setComparisonValidation(null);
                setCompareWithCurrent(false);
                comparison.clear();
              }}>
                <option value="historical">{es.historical.comparisonHistoricalOption}</option>
                <option value="current">{es.historical.comparisonCurrentOption}</option>
              </select>
            </div>
            {comparisonMode === 'historical' && <>
            <p>{es.historical.comparisonHelp}</p>
            <form className="historical-weather__compare-form" onSubmit={handleCompare} noValidate>
              <div className="historical-weather__date-field">
                <label htmlFor="historical-comparison-date">{es.historical.comparisonDate}</label>
                <input id="historical-comparison-date" type="date" lang="es-CO" min="1940-01-01" max={dateLimits.lastAvailableDate} value={comparisonDate} onChange={(event) => { setComparisonDate(event.currentTarget.value); setComparisonValidation(null); }} aria-invalid={Boolean(comparisonValidation)} aria-describedby={comparisonValidation ? 'historical-comparison-error' : undefined} />
              </div>
              <button type="submit" className="historical-weather__submit">{es.historical.compareAction}</button>
            </form>
            {comparisonValidation && <p id="historical-comparison-error" role="alert" className="historical-weather__validation">{comparisonValidation}</p>}
            {comparison.state.status === 'loading' && <p role="status">{es.historical.comparisonLoading}</p>}
            {comparison.state.status === 'error' && <div role="alert" className="historical-weather__error"><span>{APP_ERROR_MESSAGES[comparison.state.error.code]}</span><button type="button" className="historical-weather__retry" onClick={comparison.retry}>{es.historical.comparisonRetry}</button></div>}
            {comparisonDay && comparison.state.status === 'success' && <>
              <p role="status">{es.historical.comparisonStatus}</p>
              <p className="historical-weather__format-help">{es.historical.differenceHelp}</p>
              <div className="historical-weather__table-scroll" role="region" aria-label={es.historical.comparisonTitle} tabIndex={0}>
                <table className="historical-weather__table">
                  <caption>{es.historical.comparisonCaption}: {formatHistoricalDate(primaryDay.date)} y {formatHistoricalDate(comparisonDay.date)}</caption>
                  <thead><tr><th scope="col">{es.historical.variable}</th><th scope="col">{formatHistoricalDate(primaryDay.date)}</th><th scope="col">{formatHistoricalDate(comparisonDay.date)}</th><th scope="col">{es.historical.difference}</th></tr></thead>
                  <tbody>{comparisonMetrics.map(({ key, label, unit }) => <tr key={key}><th scope="row">{label}</th><td>{displayHistoricalValue(primaryDay[key], unit, key === 'humidity' ? 0 : 1)}</td><td>{displayHistoricalValue(comparisonDay[key], unit, key === 'humidity' ? 0 : 1)}</td><td>{formatHistoricalDifference(primaryDay, comparisonDay, key, unit)}</td></tr>)}</tbody>
                </table>
              </div>
            </>}
            </>}
            {comparisonMode === 'current' && <>
              <button type="button" className="historical-weather__submit" onClick={() => setCompareWithCurrent(true)}>{es.historical.compareCurrentAction}</button>
              {compareWithCurrent && <HistoricalCurrentComparison historicalDay={primaryDay} location={activeLocation} units={units} />}
            </>}
          </section> : state.data.days.length > 1 && <p className="historical-weather__format-help">{es.historical.comparisonUnavailable}</p>}
        </div>
      )}
    </section>
  );
}
