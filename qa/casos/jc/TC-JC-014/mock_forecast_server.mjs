import http from 'node:http';

const mockForecastResponse = JSON.stringify({
  latitude: 2.9273,
  longitude: -75.2819,
  generationtime_ms: 0.12,
  utc_offset_seconds: -18000,
  timezone: 'America/Bogota',
  timezone_abbreviation: '-05',
  elevation: 442.0,
  current_units: {
    time: 'iso8601',
    interval: 'seconds',
    temperature_2m: '°C',
    relative_humidity_2m: '%',
  },
  current: {
    time: '2026-09-28T14:00',
    interval: 900,
    temperature_2m: 32.5,
    relative_humidity_2m: 65,
  },
  daily_units: {
    time: 'iso8601',
    sunrise: 'iso8601',
    sunset: 'iso8601',
    daylight_duration: 's',
  },
  daily: {
    time: ['2026-09-28', '2026-09-29', '2026-09-30'],
    sunrise: ['2026-09-28T05:55', '2026-09-29T05:55', '2026-09-30T05:55'],
    sunset: ['2026-09-28T18:02', '2026-09-29T18:01', '2026-09-30T18:01'],
    daylight_duration: [43620, 43560, 43500],
  },
});

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(mockForecastResponse);
});

server.listen(3456, '127.0.0.1', () => {
  console.log('Mock server running at http://127.0.0.1:3456/v1/forecast');
});
