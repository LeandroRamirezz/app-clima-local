import { describe, expect, it } from 'vitest';
import type { AirQualityData, AirQualityHourly } from '../types/air-quality';
import { formatAirQualityTime, getNextAirQualityHours, getUsAqiCategory } from './air-quality';

function hourlyAt(time: string, usAqi: number | null = 42): AirQualityHourly {
  return { time, usAqi, pm25: 5, pm10: 8, ozone: 10, nitrogenDioxide: 1, sulphurDioxide: 1, carbonMonoxide: 100 };
}

function data(currentTime = '2026-09-25T10:15', hours = Array.from({ length: 30 }, (_, index) => {
  const day = index < 24 ? '25' : '26';
  return hourlyAt(`2026-09-${day}T${String(index % 24).padStart(2, '0')}:00`, index);
})): AirQualityData {
  return {
    location: { latitude: 2.93, longitude: -75.28, timezone: 'America/Bogota' },
    current: { ...hourlyAt(currentTime), time: currentTime },
    hourly: hours,
    units: {
      current: { usAqi: 'USAQI', pm25: 'μg/m³', pm10: 'μg/m³', ozone: 'μg/m³', nitrogenDioxide: 'μg/m³', sulphurDioxide: 'μg/m³', carbonMonoxide: 'μg/m³' },
      hourly: { usAqi: 'USAQI', pm25: 'μg/m³', pm10: 'μg/m³', ozone: 'μg/m³', nitrogenDioxide: 'μg/m³', sulphurDioxide: 'μg/m³', carbonMonoxide: 'μg/m³' },
    },
  };
}

describe('getUsAqiCategory', () => {
  it.each([
    [0, 'Buena', 'good'],
    [50, 'Buena', 'good'],
    [51, 'Moderada', 'moderate'],
    [100, 'Moderada', 'moderate'],
    [101, 'Dañina para grupos sensibles', 'unhealthy-sensitive'],
    [150, 'Dañina para grupos sensibles', 'unhealthy-sensitive'],
    [151, 'Dañina', 'unhealthy'],
    [200, 'Dañina', 'unhealthy'],
    [201, 'Muy dañina', 'very-unhealthy'],
    [300, 'Muy dañina', 'very-unhealthy'],
    [301, 'Peligrosa', 'hazardous'],
    [500, 'Peligrosa', 'hazardous'],
    [750, 'Peligrosa', 'hazardous'],
  ] as const)('clasifica AQI %i como %s', (value, label, level) => {
    expect(getUsAqiCategory(value)).toMatchObject({ label, level });
    expect(getUsAqiCategory(value)?.message.length).toBeGreaterThan(0);
  });

  it.each([null, undefined, Number.NaN, -1, Number.POSITIVE_INFINITY])('devuelve no disponible para %s', (value) => {
    expect(getUsAqiCategory(value)).toBeNull();
  });
});

describe('getNextAirQualityHours', () => {
  it('toma hasta 24 horas desde el bloque horario que corresponde a current.time local', () => {
    const result = getNextAirQualityHours(data());
    expect(result).toHaveLength(20);
    expect(result[0]?.time).toBe('2026-09-25T10:00');
    expect(result[0]?.usAqi).toBe(10);
    expect(result.at(-1)?.time).toBe('2026-09-26T05:00');
  });

  it('limita a 24 registros cuando hay suficientes horas', () => {
    const result = getNextAirQualityHours(data('2026-09-25T00:00'));
    expect(result).toHaveLength(24);
    expect(result.at(-1)?.time).toBe('2026-09-25T23:00');
  });

  it('si falta la hora local exacta, empieza en el siguiente registro horario', () => {
    const source = data('2026-09-25T10:45', [
      hourlyAt('2026-09-25T09:00'),
      hourlyAt('2026-09-25T11:00'),
      hourlyAt('2026-09-25T12:00'),
    ]);
    expect(getNextAirQualityHours(source).map((entry) => entry.time)).toEqual(['2026-09-25T11:00', '2026-09-25T12:00']);
  });

  it('devuelve lista vacía si no hay registros posteriores ni del bloque actual', () => {
    const source = data('2026-09-25T10:00', [hourlyAt('2026-09-25T09:00')]);
    expect(getNextAirQualityHours(source)).toEqual([]);
    expect(getNextAirQualityHours(data(), 0)).toEqual([]);
  });

  it('formatea hora 24 h sin convertir el día mediante la zona horaria del navegador', () => {
    expect(formatAirQualityTime('2026-09-25T00:15')).toBe('00:15');
    expect(formatAirQualityTime('2026-09-25T23:00')).toBe('23:00');
  });
});
