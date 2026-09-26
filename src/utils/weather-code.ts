export type WeatherIconKey =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'showers'
  | 'thunderstorm'
  | 'thunderstorm-hail'
  | 'unavailable';

export interface WeatherCondition {
  code: number | null;
  label: string;
  iconKey: WeatherIconKey;
}

const CONDITIONS: Record<number, Omit<WeatherCondition, 'code'>> = {
  0: { label: 'Despejado', iconKey: 'clear' },
  1: { label: 'Mayormente despejado', iconKey: 'clear' },
  2: { label: 'Parcialmente nublado', iconKey: 'partly-cloudy' },
  3: { label: 'Nublado', iconKey: 'cloudy' },
  45: { label: 'Niebla', iconKey: 'fog' },
  48: { label: 'Niebla con escarcha', iconKey: 'fog' },
  51: { label: 'Llovizna ligera', iconKey: 'drizzle' },
  53: { label: 'Llovizna moderada', iconKey: 'drizzle' },
  55: { label: 'Llovizna intensa', iconKey: 'drizzle' },
  56: { label: 'Llovizna engelante ligera', iconKey: 'drizzle' },
  57: { label: 'Llovizna engelante intensa', iconKey: 'drizzle' },
  61: { label: 'Lluvia ligera', iconKey: 'rain' },
  63: { label: 'Lluvia moderada', iconKey: 'rain' },
  65: { label: 'Lluvia intensa', iconKey: 'rain' },
  66: { label: 'Lluvia engelante ligera', iconKey: 'rain' },
  67: { label: 'Lluvia engelante intensa', iconKey: 'rain' },
  71: { label: 'Nevada ligera', iconKey: 'snow' },
  73: { label: 'Nevada moderada', iconKey: 'snow' },
  75: { label: 'Nevada intensa', iconKey: 'snow' },
  77: { label: 'Granos de nieve', iconKey: 'snow' },
  80: { label: 'Chubascos ligeros', iconKey: 'showers' },
  81: { label: 'Chubascos moderados', iconKey: 'showers' },
  82: { label: 'Chubascos intensos', iconKey: 'showers' },
  85: { label: 'Chubascos de nieve ligeros', iconKey: 'snow' },
  86: { label: 'Chubascos de nieve intensos', iconKey: 'snow' },
  95: { label: 'Tormenta eléctrica', iconKey: 'thunderstorm' },
  96: { label: 'Tormenta eléctrica con granizo ligero', iconKey: 'thunderstorm-hail' },
  99: { label: 'Tormenta eléctrica con granizo intenso', iconKey: 'thunderstorm-hail' },
};

export function mapWeatherCode(value: number | null | undefined): WeatherCondition {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return { code: null, label: 'Condición no disponible', iconKey: 'unavailable' };
  }
  return { code: value, ...(CONDITIONS[value] ?? { label: 'Condición no disponible', iconKey: 'unavailable' }) };
}
