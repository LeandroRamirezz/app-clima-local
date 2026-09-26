export type UvCategory = 'Bajo' | 'Moderado' | 'Alto' | 'Muy alto' | 'Extremo';

export function getUvCategory(value: number | null | undefined): UvCategory | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  if (value <= 2) return 'Bajo';
  if (value <= 5) return 'Moderado';
  if (value <= 7) return 'Alto';
  if (value <= 10) return 'Muy alto';
  return 'Extremo';
}
