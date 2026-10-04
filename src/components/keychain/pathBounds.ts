import type { Point } from './keychainGeometry.ts';

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

// Exact extrema for the absolute M/L/H/V/Q/C/Z paths used by our mockup assets.
// Transform the control points FIRST: bounds must be measured in the un-tilted
// photo frame, not in the screen-aligned bounding rectangle of a rotated heart.
export function pathBounds(path: string, transform: (point: Point) => Point = (point) => point): Bounds {
  const tokens = path.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g) ?? [];
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  let i = 0;
  let command = '';
  let current: Point = { x: 0, y: 0 };
  let start = current;
  const number = () => {
    const n = Number(tokens[i++]);
    if (!Number.isFinite(n)) throw new Error('Invalid mockup path coordinate.');
    return n;
  };
  const point = () => ({ x: number(), y: number() });
  const include = (p: Point) => {
    bounds.minX = Math.min(bounds.minX, p.x);
    bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.minY = Math.min(bounds.minY, p.y);
    bounds.maxY = Math.max(bounds.maxY, p.y);
  };
  const curve = (points: Point[]) => {
    const p = points.map(transform);
    include(p[0]);
    include(p[p.length - 1]);
    for (const axis of ['x', 'y'] as const) {
      const v = p.map((entry) => entry[axis]);
      let roots: number[];
      if (p.length === 3) {
        const denominator = v[0] - 2 * v[1] + v[2];
        roots = denominator === 0 ? [] : [(v[0] - v[1]) / denominator];
      } else {
        const a = -v[0] + 3 * v[1] - 3 * v[2] + v[3];
        const b = 2 * (v[0] - 2 * v[1] + v[2]);
        const c = v[1] - v[0];
        const discriminant = b * b - 4 * a * c;
        roots = Math.abs(a) < 1e-10 ? (Math.abs(b) < 1e-10 ? [] : [-c / b])
          : discriminant < 0 ? [] : [(-b + Math.sqrt(discriminant)) / (2 * a), (-b - Math.sqrt(discriminant)) / (2 * a)];
      }
      for (const t of roots) {
        if (t <= 0 || t >= 1) continue;
        // de Casteljau works for both quadratic and cubic curves.
        let levels = p;
        while (levels.length > 1) {
          levels = levels.slice(0, -1).map((entry, index) => ({
            x: entry.x * (1 - t) + levels[index + 1].x * t,
            y: entry.y * (1 - t) + levels[index + 1].y * t,
          }));
        }
        include(levels[0]);
      }
    }
  };
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) command = tokens[i++];
    switch (command) {
      case 'M': current = point(); start = current; include(transform(current)); command = 'L'; break;
      case 'L': current = point(); include(transform(current)); break;
      case 'H': current = { x: number(), y: current.y }; include(transform(current)); break;
      case 'V': current = { x: current.x, y: number() }; include(transform(current)); break;
      case 'Q': {
        const control = point(), end = point();
        curve([current, control, end]); current = end; break;
      }
      case 'C': {
        const control1 = point(), control2 = point(), end = point();
        curve([current, control1, control2, end]); current = end; break;
      }
      case 'Z': current = start; include(transform(current)); command = ''; break;
      default: throw new Error(`Unsupported mockup path command: ${command}`);
    }
  }
  if (!Number.isFinite(bounds.minX)) throw new Error('Empty mockup path.');
  return bounds;
}