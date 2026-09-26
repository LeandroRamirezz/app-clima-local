export type ForecastInputErrorCode =
  | 'invalid-latitude'
  | 'invalid-longitude'
  | 'invalid-forecast-days'
  | 'invalid-temperature-unit'
  | 'invalid-wind-speed-unit'
  | 'invalid-precipitation-unit'
  | 'invalid-model';

const MESSAGES: Record<ForecastInputErrorCode, string> = {
  'invalid-latitude': 'La latitud debe estar entre -90 y 90 grados.',
  'invalid-longitude': 'La longitud debe estar entre -180 y 180 grados.',
  'invalid-forecast-days': 'El pronóstico admite entre 1 y 16 días.',
  'invalid-temperature-unit': 'La unidad de temperatura no es válida.',
  'invalid-wind-speed-unit': 'La unidad de velocidad del viento no es válida.',
  'invalid-precipitation-unit': 'La unidad de precipitación no es válida.',
  'invalid-model': 'El modelo meteorológico no es válido.',
};

export class ForecastInputError extends Error {
  readonly code: ForecastInputErrorCode;

  constructor(code: ForecastInputErrorCode) {
    super(MESSAGES[code]);
    this.name = 'ForecastInputError';
    this.code = code;
  }
}
