// Shared cylindrical coordinates: the seam/handle is u=0; front is u=0.5.
export const MUG_ANGLES = ['left', 'front', 'right'] as const;
export type MugAngle = typeof MUG_ANGLES[number];
export const ANGLE_CENTER: Record<MugAngle, number> = { left: 0.25, front: 0.5, right: 0.75 };
export const PRINT_START = 0.06;
export const PRINT_SPAN = 0.88;
export const PRINT_HEIGHT = 0.9;

export function mugRotation(angle: MugAngle): number {
  return -ANGLE_CENTER[angle] * Math.PI * 2;
}

// Inverse orthographic cylinder projection. Unlike a stretched rectangle,
// artwork compresses naturally near the silhouette and never mirrors text.
export function projectedWrapU(x: number, angle: MugAngle): number | null {
  const u = ANGLE_CENTER[angle] + Math.asin(Math.max(-1, Math.min(1, x))) / (2 * Math.PI);
  const printU = (u - PRINT_START) / PRINT_SPAN;
  return printU >= 0 && printU <= 1 ? printU : null;
}