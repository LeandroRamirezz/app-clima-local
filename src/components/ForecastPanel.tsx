import type { DailyForecast, ForecastData, HourlyForecast } from '../types/forecast';
import { getUvCategory } from '../utils/uv-category';
import { mapWeatherCode } from '../utils/weather-code';
import { formatForecastDate, formatForecastMeasure, formatForecastNumber, formatForecastTime, getForecastUnits } from '../utils/forecast-presentation';
import { formatDaylightDuration } from '../utils/daylight';
import { WeatherConditionIcon } from './WeatherConditionIcon';

export type ForecastView = 'daily' | 'hourly';

interface ForecastPanelProps {
  forecast: ForecastData;
  view: ForecastView;
}

function UvValue({ value }: { value: number | null }) {
  const category = getUvCategory(value);
  return <>{value === null ? 'N/D' : `${formatForecastNumber(value)}${category ? ` — ${category}` : ''}`}</>;
}

function DailyCard({ day, units }: { day: DailyForecast; units: ReturnType<typeof getForecastUnits> }) {
  const date = formatForecastDate(day.date);
  const condition = mapWeatherCode(day.weatherCode);
  return (
    <article className="forecast-panel__day" aria-label={date ? `${date.weekday} ${date.date}` : day.date}>
      <h3>{date ? <><span>{date.weekday}</span> <time dateTime={day.date}>{date.date}</time></> : 'Fecha no disponible'}</h3>
      <p className="forecast-panel__condition"><WeatherConditionIcon iconKey={condition.iconKey} /><span>{condition.label}</span></p>
      <dl className="forecast-panel__metrics">
        <div><dt>Máxima</dt><dd>{formatForecastMeasure(day.temperatureMax, units.temperature)}</dd></div>
        <div><dt>Mínima</dt><dd>{formatForecastMeasure(day.temperatureMin, units.temperature)}</dd></div>
        <div><dt>Precipitación</dt><dd>{formatForecastMeasure(day.precipitationSum, units.precipitation)}</dd></div>
        <div><dt>Probabilidad</dt><dd>{day.precipitationProbabilityMax === null ? 'N/D' : `${formatForecastNumber(day.precipitationProbabilityMax, 0)} %`}</dd></div>
        <div><dt>Viento máx.</dt><dd>{formatForecastMeasure(day.windSpeedMax, units.windSpeed)}</dd></div>
        <div><dt>UV máximo</dt><dd><UvValue value={day.uvIndexMax} /></dd></div>
      </dl>
      <dl className="forecast-panel__solar" aria-label="Luz del día">
        <div><dt>Amanecer</dt><dd>{formatForecastTime(day.sunrise ?? '') ?? 'No disponible'}</dd></div>
        <div><dt>Atardecer</dt><dd>{formatForecastTime(day.sunset ?? '') ?? 'No disponible'}</dd></div>
        <div><dt>Duración del día</dt><dd>{formatDaylightDuration(day.daylightDuration)}</dd></div>
      </dl>
    </article>
  );
}

function DailyForecastView({ forecast, units }: { forecast: ForecastData; units: ReturnType<typeof getForecastUnits> }) {
  if (forecast.daily.length === 0) return <p className="forecast-panel__empty">No hay pronóstico diario disponible para esta ubicación.</p>;
  return <div className="forecast-panel__days">{forecast.daily.map((day) => <DailyCard key={day.date} day={day} units={units} />)}</div>;
}

function HourlyCard({ hour, units }: { hour: HourlyForecast; units: ReturnType<typeof getForecastUnits> }) {
  const time = formatForecastTime(hour.time);
  const condition = mapWeatherCode(hour.weatherCode);
  return (
    <article className="forecast-panel__hour" aria-label={time ? `${time}, ${condition.label}` : condition.label}>
      <h4>{time ?? 'Hora no disponible'}</h4>
      <p className="forecast-panel__hour-condition"><WeatherConditionIcon iconKey={condition.iconKey} /><span>{condition.label}</span></p>
      <dl className="forecast-panel__metrics">
        <div><dt>Temperatura</dt><dd>{formatForecastMeasure(hour.temperature, units.temperature)}</dd></div>
        <div><dt>Sensación</dt><dd>{formatForecastMeasure(hour.apparentTemperature, units.temperature)}</dd></div>
        <div><dt>Prob. lluvia</dt><dd>{hour.precipitationProbability === null ? 'N/D' : `${formatForecastNumber(hour.precipitationProbability, 0)} %`}</dd></div>
        <div><dt>Precipitación</dt><dd>{formatForecastMeasure(hour.precipitation, units.precipitation)}</dd></div>
        <div><dt>Viento</dt><dd>{formatForecastMeasure(hour.windSpeed, units.windSpeed)}</dd></div>
        <div><dt>UV</dt><dd><UvValue value={hour.uvIndex} /></dd></div>
      </dl>
    </article>
  );
}

function HourlyForecastView({ forecast, units }: { forecast: ForecastData; units: ReturnType<typeof getForecastUnits> }) {
  const groups = new Map<string, HourlyForecast[]>();
  // Open-Meteo already returns hourly records for the requested forecast range.
  // Group by its local date directly so hourly data remains usable if daily is partial.
  for (const hour of forecast.hourly) {
    const date = hour.time.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), hour]);
  }
  if (groups.size === 0) return <p className="forecast-panel__empty">No hay pronóstico horario disponible para esta ubicación.</p>;
  return (
    <div className="forecast-panel__hour-days">
      {[...groups].map(([date, items]) => {
        const formatted = formatForecastDate(date);
        return (
          <section className="forecast-panel__hour-day" key={date} aria-labelledby={`hour-day-${date}`}>
            <h3 id={`hour-day-${date}`}>{formatted ? `${formatted.weekday} ${formatted.date}` : date}</h3>
            <div className="forecast-panel__hours">{items.map((hour) => <HourlyCard key={hour.time} hour={hour} units={units} />)}</div>
          </section>
        );
      })}
    </div>
  );
}

export function ForecastPanel({ forecast, view }: ForecastPanelProps) {
  const units = getForecastUnits(forecast.units);
  return (
    <section className="forecast-panel" aria-labelledby="forecast-title">
      <h2 id="forecast-title">Pronóstico {view === 'daily' ? 'diario' : 'horario'}</h2>
      {view === 'daily' ? <DailyForecastView forecast={forecast} units={units} /> : <HourlyForecastView forecast={forecast} units={units} />}
    </section>
  );
}
