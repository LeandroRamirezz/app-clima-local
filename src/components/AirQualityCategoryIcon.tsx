import type { UsAqiLevel } from '../types/air-quality';

const NEEDLE_END: Record<UsAqiLevel, [number, number]> = {
  good: [5.7, 14.1],
  moderate: [7.3, 11.4],
  'unhealthy-sensitive': [10.1, 9.3],
  unhealthy: [13.9, 9.3],
  'very-unhealthy': [16.7, 11.4],
  hazardous: [18.3, 14.1],
};

export function AirQualityCategoryIcon({ level }: { level: UsAqiLevel }) {
  const [x, y] = NEEDLE_END[level];

  return (
    <svg
      className="air-quality__category-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 17a8 8 0 0 1 16 0" />
      <path d={`M12 17L${x} ${y}`} />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
