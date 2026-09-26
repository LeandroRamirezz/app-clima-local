import { describe, expect, it } from 'vitest';
import { HistoricalDateError } from '../types/historical';
import { addCalendarDays, countCalendarDaysInclusive, formatHistoricalDate, getHistoricalDateLimits, getTodayCalendarDate, validateHistoricalDateRange } from './historical-dates';

describe('historical calendar dates', () => {
  it('accepts strict YYYY-MM-DD calendar dates and rejects impossible dates', () => {
    expect(validateHistoricalDateRange('2026-08-10', '2026-08-10', { today: '2026-09-25' }).days).toBe(1);
    expect(() => validateHistoricalDateRange('2026-02-30', '2026-03-01', { today: '2026-09-25' })).toThrow(HistoricalDateError);
    expect(() => validateHistoricalDateRange('10/08/2026', '2026-08-10', { today: '2026-09-25' })).toThrow(HistoricalDateError);
  });

  it('uses 1940-01-01 as the inclusive minimum', () => {
    expect(() => validateHistoricalDateRange('1939-12-31', '1940-01-01', { today: '2026-09-25' })).toThrow('Solo hay datos disponibles desde el 01/01/1940.');
    expect(validateHistoricalDateRange('1940-01-01', '1940-01-01', { today: '2026-09-25' }).days).toBe(1);
  });

  it('distinguishes future dates from recent Archive dates', () => {
    expect(() => validateHistoricalDateRange('2026-09-26', '2026-09-26', { today: '2026-09-25' })).toThrow('No es posible consultar fechas futuras. Consulte el pronóstico.');
    expect(() => validateHistoricalDateRange('2026-09-21', '2026-09-21', { today: '2026-09-25' })).toThrow('Los datos de esa fecha aún no están disponibles. La última fecha consultable es 20/09/2026.');
    expect(getHistoricalDateLimits('2026-09-25')).toEqual({ today: '2026-09-25', lastAvailableDate: '2026-09-20' });
  });

  it('counts inclusive ranges at 31 and rejects 32 calendar days', () => {
    expect(countCalendarDaysInclusive('2026-08-01', '2026-08-31')).toBe(31);
    expect(validateHistoricalDateRange('2026-08-01', '2026-08-31', { today: '2026-09-25' }).days).toBe(31);
    expect(() => validateHistoricalDateRange('2026-07-31', '2026-08-31', { today: '2026-09-25' })).toThrow('El rango máximo permitido es de 31 días.');
  });

  it('rejects a start date after the end date and allows a single day', () => {
    expect(() => validateHistoricalDateRange('2026-08-11', '2026-08-10', { today: '2026-09-25' })).toThrow('La fecha inicial no puede ser posterior a la final.');
    expect(countCalendarDaysInclusive('2026-08-10', '2026-08-10')).toBe(1);
  });

  it('formats calendar dates without timezone conversion and handles leap year and month/year boundaries', () => {
    expect(formatHistoricalDate('2026-08-10')).toBe('10/08/2026');
    expect(formatHistoricalDate('2024-02-29')).toBe('29/02/2024');
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addCalendarDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(formatHistoricalDate('2026-08-10')).toBe('10/08/2026');
  });

  it('uses calendar fields instead of UTC to determine the device-local today', () => {
    const localDate = new Date(2026, 8, 25, 0, 5);
    expect(getTodayCalendarDate(localDate)).toBe('2026-09-25');
  });
});
