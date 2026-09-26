export interface Location {
  id: number | 'geolocation';
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  elevation?: number;
  source?: 'geolocation';
}
