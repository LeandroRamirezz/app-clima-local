export const GEOLOCATION_MESSAGES = {
  unsupported: 'La geolocalización no está disponible en este navegador.',
  permissionDenied: 'No se pudo acceder a su ubicación porque el permiso fue denegado. Puede buscar su ciudad manualmente o habilitar el permiso en la configuración del navegador.',
  timeout: 'Se agotó el tiempo para obtener su ubicación. Intente de nuevo o busque su ciudad manualmente.',
  positionUnavailable: 'No fue posible determinar su ubicación en este momento.',
  unknown: 'No fue posible obtener su ubicación. Intente nuevamente o busque su ciudad manualmente.',
  success: 'Ubicación obtenida correctamente.',
} as const;

export const GEOLOCATION_OPTIONS: PositionOptions = {
  timeout: 10_000,
  enableHighAccuracy: false,
  maximumAge: 60_000,
};
