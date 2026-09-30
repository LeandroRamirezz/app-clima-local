import { APP_ERROR_MESSAGES } from '../types/errors';
import type { ForecastUnits } from '../types/forecast';
import type { HistoricalDay } from '../types/historical';
import type { Location } from '../types/location';
import { useCurrentWeather } from '../hooks/useCurrentWeather';
import { es } from '../i18n/es';
import { formatHistoricalDate } from '../utils/historical-dates';
import { formatForecastMeasure, formatForecastTime, getForecastUnits } from '../utils/forecast-presentation';
import { formatHistoricalValueDifference } from '../utils/historical-comparison';

interface HistoricalCurrentComparisonProps {
  historicalDay: HistoricalDay;
  location: Location;
  units: ForecastUnits;
}

export function HistoricalCurrentComparison({ historicalDay, location, units }: HistoricalCurrentComparisonProps) {
  const { state, retry } = useCurrentWeather(location, 1, units);

  if (state.status === 'loading') return <p role="status">{es.historical.currentComparisonLoading}</p>;
  if (state.status === 'error') return <div className="historical-weather__error" role="alert">
    <span>{APP_ERROR_MESSAGES[state.error.code]}</span>
    {state.error.code !== 'E-03' && <button type="button" className="historical-weather__retry" onClick={retry}>{es.historical.comparisonRetry}</button>}
  </div>;
  if (state.status !== 'success') return null;

  const current = state.data.current;
  const displayedUnits = getForecastUnits(state.data.units);
  const currentLabel = `${es.historical.currentWeather} · ${current.time.replace('T', ' ')}`;
  const metrics = [
    { key: 'temperature', label: es.historical.currentTemperature, historical: historicalDay.temperatureMean, actual: current.temperature, unit: displayedUnits.temperature, decimals: 1 },
    { key: 'humidity', label: es.historical.currentHumidity, historical: historicalDay.humidity, actual: current.relativeHumidity, unit: '%', decimals: 0 },
    { key: 'precipitation', label: es.historical.currentPrecipitation, historical: historicalDay.precipitationSum, actual: current.precipitation, unit: displayedUnits.precipitation, decimals: 1 },
    { key: 'wind', label: es.historical.currentWind, historical: historicalDay.windSpeedMax, actual: current.windSpeed, unit: displayedUnits.windSpeed, decimals: 1 },
  ] as const;

  return <>
    <p role="status">{es.historical.currentComparisonStatus}</p>
    <p className="historical-weather__format-help">{es.historical.currentComparisonHelp}</p>
    <div className="historical-weather__table-scroll" role="region" aria-label={es.historical.currentComparisonTitle} tabIndex={0}>
      <table className="historical-weather__table">
        <caption>{es.historical.currentComparisonTitle}: {formatHistoricalDate(historicalDay.date)} y {currentLabel}</caption>
        <thead><tr><th scope="col">{es.historical.variable}</th><th scope="col">{formatHistoricalDate(historicalDay.date)}</th><th scope="col">{currentLabel}</th><th scope="col">{es.historical.difference}</th></tr></thead>
        <tbody>{metrics.map((metric) => <tr key={metric.key}>
          <th scope="row">{metric.label}</th>
          <td>{formatForecastMeasure(metric.historical, metric.unit)}</td>
          <td>{formatForecastMeasure(metric.actual, metric.unit)}</td>
          <td>{formatHistoricalValueDifference(metric.historical, metric.actual, metric.unit, metric.decimals)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="historical-weather__format-help">{es.historical.currentTimeNote(formatForecastTime(current.time) ?? current.time)}</p>
  </>;
}
