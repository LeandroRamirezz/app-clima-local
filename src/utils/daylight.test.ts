import { describe, expect, it } from 'vitest';
import { formatDaylightDuration } from './daylight';

describe('formatDaylightDuration', () => {
  it('convierte segundos a horas y minutos sin alterar el dato fuente', () => {
    const seconds = 43_740;
    expect(formatDaylightDuration(seconds)).toBe('12 h 9 min');
    expect(seconds).toBe(43_740);
  });

  it('muestra horas completas sin segundos ni minutos innecesarios', () => {
    expect(formatDaylightDuration(43_200)).toBe('12 h');
  });

  it.each([null, Number.NaN, Number.POSITIVE_INFINITY, -60])('devuelve No disponible ante duración inválida: %s', (value) => {
    expect(formatDaylightDuration(value)).toBe('No disponible');
  });
});
