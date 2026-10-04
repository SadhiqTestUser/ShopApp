import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { buildSync } from 'esbuild';
import { exportCropped } from '../../src/lib/imageEdit.ts';
import { KEYCHAINS } from '../../src/lib/keychains.ts';
import { KEYCHAIN_MOCKUPS } from '../../src/components/keychain/keychainMockups.ts';
import { MDF_HEART_SURFACE } from '../../src/components/keychain/mdfHeartSurface.ts';
import { MDF_SQUARE_SURFACE } from '../../src/components/keychain/mdfSquareSurface.ts';
import { ACRYLIC_HEART_SURFACE } from '../../src/components/keychain/acrylicHeartSurface.ts';
import { METAL_SURFACES } from '../../src/components/keychain/metalSurfaces.ts';
import { pathBounds } from '../../src/components/keychain/pathBounds.ts';
import { INITIAL_VIEW, fitView, photoLayout, cropPixels, toLocal, placement,
  movePhoto, zoomAt, pinchPhoto, serializeDesign, transformPoint } from '../../src/components/keychain/keychainGeometry.ts';

const MASKED_PRODUCTS = [
  ...[['keychain-mdf-heart', MDF_HEART_SURFACE], ['keychain-mdf-square', MDF_SQUARE_SURFACE]]
    .map(([id, surface]) => [id, { ...surface, regions: [{ ...surface, id: 'face', photo: 'active' }] }]),
  ...Object.entries(METAL_SURFACES),
];
const MASK_FRAMES = new Map([
  [ACRYLIC_HEART_SURFACE.maskUrl, ACRYLIC_HEART_SURFACE.frame],
  ...MASKED_PRODUCTS.flatMap(([, product]) => product.regions.map((region) => [region.maskUrl, region.frame])),
]);

function regionBounds(region) {
  // Visible alpha bounds, not the smaller simplified pointer outline, must
  // remain covered at every drag limit, photo orientation and zoom level.
  const f = MASK_FRAMES.get(region.maskUrl);
  const path = f ? `M${f.x} ${f.y} H${f.x + f.width} V${f.y + f.height} H${f.x} Z` : region.path;
  return pathBounds(path, (p) => toLocal(region.matrix,
    region.pathTransform ? transformPoint(region.pathTransform, p) : p));
}

test('path bounds include curve extrema, not just endpoints or control points', () => {
  assert.deepEqual(pathBounds('M0 0 Q50 100 100 0 Z'), { minX: 0, maxX: 100, minY: 0, maxY: 50 });
  assert.deepEqual(pathBounds('M0 0 C0 100 100 100 100 0 Z'), { minX: 0, maxX: 100, minY: 0, maxY: 75 });
  assert.deepEqual(pathBounds('M0 0 H10 V20 L0 20 Z'), { minX: 0, minY: 0, maxX: 10, maxY: 20 });
  const matrix = placement(32, { x: 100, y: 200 });
  const bounds = pathBounds('M0 0 C0 100 100 100 100 0 Z', (p) => toLocal(matrix, p));
  assert.ok(Object.values(bounds).every(Number.isFinite));
  assert.throws(() => pathBounds('M0 0 A5 5 0 0 0 10 10'), /Unsupported/);
});

for (const product of KEYCHAINS) {
  const template = KEYCHAIN_MOCKUPS[product.id];
  test(`${product.id}: every print surface fits within the photo coverage box`, () => {
    assert.ok(template);
    for (const region of template.regions) {
      const b = regionBounds(region);
      const halfWidth = template.box.width / 2, halfHeight = template.box.height / 2;
      assert.ok(b.minX >= -halfWidth && b.maxX <= halfWidth && b.minY >= -halfHeight && b.maxY <= halfHeight,
        `${region.id}: outline ${JSON.stringify(b)} extends beyond ${JSON.stringify(template.box)}`);
    }
  });
  test(`${product.id}: portrait/landscape/square photos cannot reveal gaps at any drag limit or rotation`, () => {
    for (const photo of [{ width: 1600, height: 900 }, { width: 900, height: 1600 }, { width: 1000, height: 1000 }]) {
      for (const rotation of [0, 90, 180, 270]) for (const zoom of [1, 1.1, 2, 5]) {
        for (const x of [-10000, 0, 10000]) for (const y of [-10000, 0, 10000]) {
          const view = fitView({ ...INITIAL_VIEW, rotation, zoom, x, y }, photo, template.box);
          const layout = photoLayout(photo, template.box, view);
          for (const region of template.regions) {
            const b = regionBounds(region);
            assert.ok(view.x - layout.width / 2 <= b.minX + 1e-7 && view.x + layout.width / 2 >= b.maxX - 1e-7);
            assert.ok(view.y - layout.height / 2 <= b.minY + 1e-7 && view.y + layout.height / 2 >= b.maxY - 1e-7);
          }
          const crop = cropPixels(photo, template.box, view);
          const width = rotation % 180 ? photo.height : photo.width;
          const height = rotation % 180 ? photo.width : photo.height;
          assert.ok(crop.sx >= -1e-7 && crop.sy >= -1e-7);
          assert.ok(crop.sx + crop.sw <= width + 1e-7 && crop.sy + crop.sh <= height + 1e-7);
          assert.ok(Math.abs(crop.sw / crop.sh - template.box.width / template.box.height) < 1e-7);
        }
      }
    }
  });
}

test('wheel zoom, pinch and drag remain bounded and preserve source placement in serialized design', () => {
  const photo = { width: 1800, height: 1200, url: 'original.jpg' };
  const box = KEYCHAIN_MOCKUPS['keychain-acrylic-heart'].box;
  let view = zoomAt(INITIAL_VIEW, photo, box, 2, { x: 15, y: 20 });
  assert.equal(view.zoom, 2);
  assert.equal(view.x, -15);
  assert.equal(view.y, -20);
  view = movePhoto(view, photo, box, { x: 0, y: 0 }, { x: 9999, y: 9999 });
  view = pinchPhoto(view, photo, box, { x: 20, y: 0 }, { x: 40, y: 0 }, { x: 0, y: 0 });
  assert.equal(view.zoom, 4);
  const data = serializeDesign('keychain-acrylic-heart', [{ ...photo, view }]);
  assert.deepEqual(JSON.parse(JSON.stringify(data)).photos[0].view, view);
  assert.equal(data.photos[0].original_url, photo.url);
  assert.notEqual(data.photos[0].view, view);
});

test('source mattes match local catalog photos, photo slots and upright crop frames', () => {
  for (const [id, product] of MASKED_PRODUCTS) {
    const template = KEYCHAIN_MOCKUPS[id];
    const catalog = KEYCHAINS.find((item) => item.id === id);
    assert.equal(catalog.image_url, `/keychains/${id.replace('keychain-', '')}.png`);
    const source = readFileSync(new URL(`../../public${catalog.image_url}`, import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), product.sourceSha256,
      're-author the mask when replacing a source photograph');
    assert.equal(template.regions.length, product.regions.length);
    for (const [index, surface] of product.regions.entries()) {
      const region = template.regions[index];
      const mask = readFileSync(new URL(`../../public${surface.maskUrl}`, import.meta.url));
      // Sources may be JPEG-encoded; only the alpha masks must be PNGs.
      assert.equal(mask.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.deepEqual([mask.readUInt32BE(16), mask.readUInt32BE(20)], [product.width, product.height]);
      assert.deepEqual([region.id, region.photo, region.maskUrl], [surface.id, surface.photo, surface.maskUrl]);
      const scale = 600 / Math.max(product.width, product.height);
      assert.deepEqual(region.pathTransform, [scale, 0, 0, scale,
        (600 - product.width * scale) / 2, (600 - product.height * scale) / 2]);
      assert.deepEqual(region.matrix.slice(0, 4), placement(0, { x: 0, y: 0 }).slice(0, 4),
        'do not retain the old catalog photograph tilt');
      const f = surface.frame;
      for (const x of [f.x, f.x + f.width]) for (const y of [f.y, f.y + f.height]) {
        const p = toLocal(region.matrix, transformPoint(region.pathTransform, { x, y }));
        assert.ok(Math.abs(p.x) <= template.box.width / 2 + 1e-7);
        assert.ok(Math.abs(p.y) <= template.box.height / 2 + 1e-7);
      }
    }
  }
});

test('all preview instances retain their catalog image and use the configured mask or clip', () => {
  const require = createRequire(import.meta.url);
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const code = buildSync({ entryPoints: ['src/components/keychain/KeychainMockup.tsx'],
    bundle: true, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', write: false }).outputFiles[0].text;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  const Mockup = module.exports.default;
  const photos = [0, 1].map((id) => ({ id: String(id), url: `photo-${id}.jpg`, name: 'Photo',
    width: 1200, height: 1800, view: { ...INITIAL_VIEW }, blob: new Blob() }));
  const escape = (text) => text.replaceAll('&', '&amp;');
  for (const product of KEYCHAINS) {
    const template = KEYCHAIN_MOCKUPS[product.id];
    const props = { imageUrl: product.image_url, name: product.name, template, photos, activeSlot: 0 };
    const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
      React.createElement(Mockup, { ...props, onChange: () => {} }), React.createElement(Mockup, props)));
    assert.equal(html.split(`href="${escape(product.image_url)}"`).length - 1, 2);
    const ids = [...html.matchAll(/<(?:clipPath|mask) id="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, template.regions.length * 2, 'live/full previews must not share clip ids');
    for (const region of template.regions) {
      const slot = region.photo === 'active' ? 0 : region.photo;
      assert.equal(html.split(`href="photo-${slot}.jpg"`).length - 1, 2,
        'each preview must draw the photo assigned to this region');
      if (region.maskUrl) {
        assert.equal(html.split(`href="${region.maskUrl}"`).length - 1, 2, 'all previews share the source alpha matte');
        assert.equal(html.split(`d="${region.path}"`).length - 1, 1, 'vector outline is only the interactive hit target');
        for (const id of ids) assert.ok(html.includes(`mask="url(#${id})"`));
        assert.ok(html.includes('mask-type:alpha'));
        assert.ok(html.includes('maskContentUnits="userSpaceOnUse"'));
        assert.ok(!html.includes('<clipPath'), 'do not crop the matte a second time with the old curve');
      } else {
        assert.equal(html.split(`d="${region.path}"`).length - 1, 5, 'clip, backdrop and hit area must share the same outline');
      }
      if (region.pathTransform) {
        assert.ok(html.includes(`transform="matrix(${region.pathTransform.join(' ')})"`));
      }
    }
  }
});

test('print export uses the exact fractional crop chosen in the preview, including rotation', async () => {
  const oldImage = globalThis.Image, oldDocument = globalThis.document;
  const canvases = [];
  globalThis.Image = class {
    naturalWidth = 1600;
    naturalHeight = 900;
    set src(_value) { queueMicrotask(() => this.onload()); }
  };
  globalThis.document = { createElement: () => {
    const calls = [];
    const context = { translate: (...args) => calls.push(['translate', ...args]),
      rotate: (...args) => calls.push(['rotate', ...args]),
      drawImage: (...args) => calls.push(['drawImage', ...args]), fillRect: () => {} };
    const canvas = { width: 0, height: 0, context, calls, getContext: () => context,
      toBlob: (callback) => callback(new Blob(['jpeg'], { type: 'image/jpeg' })) };
    canvases.push(canvas);
    return canvas;
  } };
  try {
    const box = KEYCHAIN_MOCKUPS['keychain-mdf-heart'].box;
    const photo = { width: 1600, height: 900 };
    const view = fitView({ ...INITIAL_VIEW, rotation: 90, zoom: 1.37, x: 12.3, y: -7.4 }, photo, box);
    const crop = cropPixels(photo, box, view);
    const blob = await exportCropped('original.jpg', crop, view.rotation, view);
    assert.equal(blob.type, 'image/jpeg');
    assert.equal(canvases[0].width, photo.height);
    assert.equal(canvases[0].height, photo.width);
    const draw = canvases[1].calls.find(([name]) => name === 'drawImage');
    assert.deepEqual(draw.slice(2, 6), [crop.sx, crop.sy, crop.sw, crop.sh]);
    assert.equal(canvases[1].width, Math.round(crop.sw));
    assert.equal(canvases[1].height, Math.round(crop.sh));
  } finally {
    globalThis.Image = oldImage;
    globalThis.document = oldDocument;
  }
});