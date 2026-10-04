import { placement, toLocal, transformPoint, type Matrix, type MockupTemplate } from './keychainGeometry.ts';
import { pathBounds } from './pathBounds.ts';
import { ACRYLIC_HEART_SURFACE } from './acrylicHeartSurface.ts';
import { MDF_HEART_SURFACE } from './mdfHeartSurface.ts';
import { MDF_SQUARE_SURFACE } from './mdfSquareSurface.ts';
import { METAL_SURFACES } from './metalSurfaces.ts';

interface ImageSurface {
  width: number;
  height: number;
  frame: { x: number; y: number; width: number; height: number };
  path: string;
  maskUrl: string;
}

// Match the SVG photograph's xMidYMid meet exactly, including its letterboxing.
// Keep both the matte and the interaction outline on the source image canvas.
function maskedSurface(surface: ImageSurface): MockupTemplate {
  const scale = 600 / Math.max(surface.width, surface.height);
  const transform: Matrix = [scale, 0, 0, scale,
    (600 - surface.width * scale) / 2, (600 - surface.height * scale) / 2];
  const frame = surface.frame;
  const bounds = {
    minX: frame.x * scale + transform[4],
    minY: frame.y * scale + transform[5],
    maxX: (frame.x + frame.width) * scale + transform[4],
    maxY: (frame.y + frame.height) * scale + transform[5],
  };
  // Frame the full matte, not its simplified interaction outline.
  return {
    box: { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY },
    regions: [
      { id: 'face', photo: 'active', matrix: placement(0, {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2,
      }), path: surface.path, pathTransform: transform, maskUrl: surface.maskUrl },
    ],
  };
}

function maskedProduct(product: {
  width: number;
  height: number;
  regions: readonly (Omit<ImageSurface, 'width' | 'height'> & { id: string; photo: number | 'active' })[];
}): MockupTemplate {
  const faces = product.regions.map((region) => {
    const face = maskedSurface({ ...region, width: product.width, height: product.height });
    face.regions[0].id = region.id;
    face.regions[0].photo = region.photo;
    return face;
  });
  // Keep one shared crop/export frame while covering every independently
  // positioned face. Only uniform photo scaling is used, never stretching.
  return {
    box: {
      width: Math.max(...faces.map((face) => face.box.width)),
      height: Math.max(...faces.map((face) => face.box.height)),
    },
    regions: faces.flatMap((face) => face.regions),
  };
}

// Asset-specific print surfaces in a 600x600 object-contain image space.
// Native artwork is mapped explicitly; older catalog-derived outlines retain
// their object-cover to object-contain compensation below.
// Update these paths if the corresponding catalog photograph is ever replaced.
export const KEYCHAIN_MOCKUPS: Record<string, MockupTemplate> = {
  // One source-image alpha matte for live, thumbnail and full-size previews.
  'keychain-acrylic-heart': maskedSurface(ACRYLIC_HEART_SURFACE),
  'keychain-mdf-square': maskedSurface(MDF_SQUARE_SURFACE),
  'keychain-mdf-heart': maskedSurface(MDF_HEART_SURFACE),
  'keychain-metal-love': maskedProduct(METAL_SURFACES['keychain-metal-love']),
  'keychain-metal-square': maskedProduct(METAL_SURFACES['keychain-metal-square']),
  'keychain-metal-rectangle': maskedProduct(METAL_SURFACES['keychain-metal-rectangle']),
  'keychain-metal-hexagon': maskedProduct(METAL_SURFACES['keychain-metal-hexagon']),
};

// One shared cover rectangle per product also keeps linked front/back crops
// identical. It must enclose EVERY outline in its own un-tilted photo frame.
// A small safety margin keeps raster antialiasing from revealing an image edge.
// Keep the authored minimums so products that already fit retain their framing.
for (const template of Object.values(KEYCHAIN_MOCKUPS)) {
  for (const region of template.regions) {
    const bounds = pathBounds(region.path, (point) => toLocal(region.matrix,
      region.pathTransform ? transformPoint(region.pathTransform, point) : point));
    template.box.width = Math.max(template.box.width, 2 * (Math.max(Math.abs(bounds.minX), Math.abs(bounds.maxX)) + 1));
    template.box.height = Math.max(template.box.height, 2 * (Math.max(Math.abs(bounds.minY), Math.abs(bounds.maxY)) + 1));
  }
}
