import { HISTORICAL_AVAILABILITY_LAG_DAYS, HISTORICAL_MAX_RANGE_DAYS, HISTORICAL_MIN_DATE } from '../config/historical';
import { HistoricalDateError } from '../types/historical';

export interface HistoricalDateLimits {
  today: string;
  lastAvailableDate: string;
}

function parseCalendarDate(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return [year, month, day];
}

export function isCalendarDate(value: string): boolean {
  return parseCalendarDate(value) !== null;
}

export function getTodayCalendarDate(now = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addCalendarDays(value: string, amount: number): string | null {
  const parts = parseCalendarDate(value);
  if (!parts || !Number.isInteger(amount)) return null;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + amount));
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

export function countCalendarDaysInclusive(startDate: string, endDate: string): number | null {
  const start = parseCalendarDate(startDate);
  const end = parseCalendarDate(endDate);
  if (!start || !end || startDate > endDate) return null;
  const startUtc = Date.UTC(start[0], start[1] - 1, start[2]);
  const endUtc = Date.UTC(end[0], end[1] - 1, end[2]);
  return Math.floor((endUtc - startUtc) / 86_400_000) + 1;
}

export function formatHistoricalDate(value: string): string {
  const parts = parseCalendarDate(value);
  if (!parts) return 'N/D';
  return `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}/${String(parts[0]).padStart(4, '0')}`;
}

export function getHistoricalDateLimits(
  today = getTodayCalendarDate(),
  availabilityLagDays = HISTORICAL_AVAILABILITY_LAG_DAYS,
): HistoricalDateLimits {
  if (!parseCalendarDate(today) || !Number.isInteger(availabilityLagDays) || availabilityLagDays < 0) {
    throw new HistoricalDateError('invalid-date', 'No fue posible calcular el límite de fechas históricas.');
  }
  const lastAvailableDate = addCalendarDays(today, -availabilityLagDays);
  if (!lastAvailableDate) throw new HistoricalDateError('invalid-date', 'No fue posible calcular el límite de fechas históricas.');
  return { today, lastAvailableDate };
}

export function validateHistoricalDateRange(
  startDate: string,
  endDate: string,
  options: { today?: string; availabilityLagDays?: number } = {},
): { startDate: string; endDate: string; days: number; lastAvailableDate: string } {
  const { today, lastAvailableDate } = getHistoricalDateLimits(options.today, options.availabilityLagDays);
  if (!parseCalendarDate(startDate) || !parseCalendarDate(endDate)) {
    throw new HistoricalDateError('invalid-date', 'Ingrese fechas válidas para consultar el histórico.');
  }
  if (startDate > endDate) {
    throw new HistoricalDateError('start-after-end', 'La fecha inicial no puede ser posterior a la final.');
  }
  if (startDate < HISTORICAL_MIN_DATE || endDate < HISTORICAL_MIN_DATE) {
    throw new HistoricalDateError('before-minimum', 'Solo hay datos disponibles desde el 01/01/1940.');
  }
  if (startDate > today || endDate > today) {
    throw new HistoricalDateError('future-date', 'No es posible consultar fechas futuras. Consulte el pronóstico.');
  }
  const days = countCalendarDaysInclusive(startDate, endDate);
  if (days === null) throw new HistoricalDateError('invalid-date', 'Ingrese fechas válidas para consultar el histórico.');
  if (days > HISTORICAL_MAX_RANGE_DAYS) {
    throw new HistoricalDateError('range-too-long', 'El rango máximo permitido es de 31 días.');
  }
  if (endDate > lastAvailableDate) {
    throw new HistoricalDateError(
      'not-yet-available',
      `Los datos de esa fecha aún no están disponibles. La última fecha consultable es ${formatHistoricalDate(lastAvailableDate)}.`,
    );
  }
  return { startDate, endDate, days, lastAvailableDate };
}

export function getDefaultHistoricalRange(today = getTodayCalendarDate()): { startDate: string; endDate: string } {
  const { lastAvailableDate } = getHistoricalDateLimits(today);
  const startDate = addCalendarDays(lastAvailableDate, -6);
  return { startDate: startDate ?? lastAvailableDate, endDate: lastAvailableDate };
}
