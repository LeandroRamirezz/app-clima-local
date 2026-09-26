import type { WeatherIconKey } from '../utils/weather-code';

const cloudy = <path d="M8 32h27a7 7 0 0 0 .2-14 11 11 0 0 0-21.5 1.5A6.4 6.4 0 0 0 8 32Z" />;
const sun = <><circle cx="24" cy="24" r="8" /><path d="M24 4v6m0 28v6M4 24h6m28 0h6M9.9 9.9l4.2 4.2m19.8 19.8 4.2 4.2M38.1 9.9l-4.2 4.2M14.1 33.9l-4.2 4.2" /></>;

function IconShape({ iconKey }: { iconKey: WeatherIconKey }) {
  switch (iconKey) {
    case 'clear': return sun;
    case 'partly-cloudy': return <><circle cx="31" cy="14" r="5" /><path d="M31 5v3m0 12v3M22 14h3m12 0h3" />{cloudy}</>;
    case 'cloudy': return cloudy;
    case 'fog': return <>{cloudy}<path d="M9 38h28M15 43h19" /></>;
    case 'drizzle': return <>{cloudy}<path d="m15 37-1 2m10-2-1 2m10-2-1 2" /></>;
    case 'rain':
    case 'showers': return <>{cloudy}<path d="m16 36-2 6m11-6-2 6m11-6-2 6" /></>;
    case 'snow': return <>{cloudy}<path d="M16 36v7m-3.5-3.5h7M31 36v7m-3.5-3.5h7" /></>;
    case 'thunderstorm':
    case 'thunderstorm-hail': return <>{cloudy}<path d="m25 35-5 8h6l-3 5" /></>;
    default: return <><circle cx="24" cy="24" r="17" /><path d="M24 14v13m0 7v.5" /></>;
  }
}

export function WeatherConditionIcon({ iconKey }: { iconKey: WeatherIconKey }) {
  return <span className="current-weather__icon" data-icon-key={iconKey} aria-hidden="true">
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false"><IconShape iconKey={iconKey} /></svg>
  </span>;
}
