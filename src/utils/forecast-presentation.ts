export function formatForecastNumber(value: number | null, maximumFractionDigits = 1): string {
  if (value === null || !Number.isFinite(value)) return 'N/D';
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits }).format(value);
}

export function formatForecastMeasure(value: number | null, unit: string): string {
  return value === null || !Number.isFinite(value) ? 'N/D' : `${formatForecastNumber(value)} ${unit}`;
}

export function formatForecastDate(value: string): { weekday: string; date: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dateValue = new Date(Date.UTC(year, month - 1, day, 12));
  if (dateValue.getUTCFullYear() !== year || dateValue.getUTCMonth() !== month - 1 || dateValue.getUTCDate() !== day) return null;
  const weekday = new Intl.DateTimeFormat('es-CO', { weekday: 'long', timeZone: 'UTC' }).format(dateValue);
  return { weekday: `${weekday[0]?.toLocaleUpperCase('es-CO') ?? ''}${weekday.slice(1)}`, date: `${match[3]}/${match[2]}/${match[1]}` };
}

export function formatForecastTime(value: string): string | null {
  return /T(\d{2}:\d{2})/.exec(value)?.[1] ?? null;
}

export function getForecastUnits(units: { temperature: string; windSpeed: string; precipitation: string }) {
  return {
    temperature: units.temperature === 'fahrenheit' ? '°F' : '°C',
    windSpeed: units.windSpeed === 'mph' ? 'mph' : 'km/h',
    precipitation: units.precipitation === 'inch' ? 'in' : 'mm',
  };
}
