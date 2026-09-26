export type AppErrorCode = 'E-01' | 'E-02' | 'E-03' | 'E-04' | 'E-05';
export const APP_ERROR_MESSAGES: Record<AppErrorCode, string> = {
  'E-01': 'No hay conexión a internet. Verifique su red e intente nuevamente.',
  'E-02': 'La consulta tardó demasiado. Intente nuevamente.',
  'E-03': 'Se alcanzó el límite de consultas del servicio meteorológico. Espere unos minutos e intente de nuevo.',
  'E-04': 'No fue posible procesar la consulta. Verifique los datos ingresados.',
  'E-05': 'El servicio meteorológico no está disponible en este momento. Intente más tarde.',
};
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly technicalCause?: unknown;
  constructor(code: AppErrorCode, technicalCause?: unknown) {
    super(APP_ERROR_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.technicalCause = technicalCause;
  }
}
export class RequestAbortedError extends Error {
  constructor() { super('La solicitud fue cancelada.'); this.name = 'AbortError'; }
}
