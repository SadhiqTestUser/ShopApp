import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { MUG_DESIGNS, getDesign, quantityUnitPrice } from '../src/lib/mugs.ts';
import { defaultPhotoState, initConfig, restoreConfig, saveConfig, loadConfig } from '../src/components/mug/mugState.ts';
import { photoPlacement, photoDpi, switchMugDesign, validateMugPhoto } from '../src/components/mug/mugEditing.ts';
import { MUG_ANGLES, projectedWrapU, mugRotation, PRINT_START, PRINT_SPAN } from '../src/components/mug/mugProjection.ts';
import { drawMugWrap } from '../src/components/mug/mugTexture.ts';

const configFor = (id = 'photo-caption') => initConfig(getDesign(id), 'regular', '#ffffff', 'round');

test('all templates have unique, stable slot IDs', () => {
  const ids = MUG_DESIGNS.flatMap((design) => design.slots.map((slot, index) => {
    assert.equal(slot.id, `${design.id}-${slot.type}-${index + 1}`);
    return slot.id;
  }));
  assert.equal(new Set(ids).size, ids.length);
});

test('draft restoration preserves photos, crop, captions and appearance', () => {
  const config = configFor();
  const photo = Object.keys(config.photos)[0], text = Object.keys(config.texts)[0];
  config.photos[photo] = { ...defaultPhotoState(), url: 'data:image/png;base64,fixture', zoom: 2, width: 1200, height: 1600 };
  config.texts[text].text = 'For you'; config.quantity = 4; config.mugColor = '#6366f1';
  assert.deepEqual(restoreConfig(JSON.parse(JSON.stringify(config))), { ...config, mugColor: '#ffffff' });
});

test('legacy random slot IDs migrate without losing customer content', () => {
  const saved = configFor();
  saved.photos = { 'slot-random': { ...defaultPhotoState(), url: 'old-photo', zoom: 1.5 } };
  saved.texts = { 'slot-random-text': { text: 'Keep me', fontId: 'serif', color: '#123456' } };
  const restored = restoreConfig(saved);
  assert.equal(Object.values(restored.photos)[0].url, 'old-photo');
  assert.equal(Object.values(restored.texts)[0].text, 'Keep me');
  assert.equal(Object.values(restored.texts)[1].text, 'since 2016');
});

test('invalid drafts are rejected or normalized', () => {
  for (const value of [null, [], {}, 'bad', { designId: 'missing' }]) assert.equal(restoreConfig(value), null);
  const config = configFor();
  config.quantity = -3; config.photos[Object.keys(config.photos)[0]].zoom = -1;
  config.mugTypeId = 'magic'; config.mugColor = '#111827';
  const restored = restoreConfig(config);
  assert.equal(restored.quantity, 1); assert.equal(Object.values(restored.photos)[0].zoom, 1);
  assert.equal(restored.mugTypeId, 'regular'); assert.equal(restored.mugColor, '#ffffff');
});

test('storage failures are reported, malformed saved JSON is ignored', () => {
  globalThis.window = { localStorage: { setItem() { throw new Error('quota'); }, getItem() { return '{broken'; } } };
  assert.equal(saveConfig(configFor()), false);
  assert.equal(loadConfig(), null);
  delete globalThis.window;
});

test('template switching carries content and product choices, resets crops', () => {
  const config = configFor(); const photo = Object.keys(config.photos)[0];
  config.photos[photo] = { ...defaultPhotoState(), url: 'photo', zoom: 2, offsetX: 50 };
  config.quantity = 6; config.mugColor = '#ef4444'; config.handleStyle = 'love';
  const next = switchMugDesign(config, getDesign('photo-caption'), getDesign('love-hearts'));
  assert.equal(Object.values(next.photos)[0].url, 'photo');
  assert.equal(Object.values(next.photos)[0].zoom, 1);
  assert.equal(Object.values(next.photos)[0].offsetX, 0);
  assert.equal(next.quantity, 6); assert.equal(next.mugColor, '#ffffff'); assert.equal(next.handleStyle, 'love');
  assert.equal(config.photos[photo].zoom, 2);
});

test('upload validation rejects unsupported, empty and oversized images', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(validateMugPhoto({ type, size: 100 }), null);
  for (const file of [{ type: 'image/svg+xml', size: 20 }, { type: 'text/plain', size: 20 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 13 * 1024 * 1024 }]) assert.ok(validateMugPhoto(file));
});

test('photo placement covers the slot at all zooms and drag limits', () => {
  for (const [w, h] of [[100, 400], [400, 100], [200, 200]]) {
    for (const zoom of [1, 1.5, 3]) for (const offset of [-100, 0, 100]) {
      const result = photoPlacement(w, h, 250, 100, { ...defaultPhotoState(), zoom, offsetX: offset, offsetY: offset });
      assert.ok(result.x <= 0 && result.y <= 0);
      assert.ok(result.x + result.width >= 250 && result.y + result.height >= 100);
    }
  }
});

test('effective print DPI decreases when zoomed; unknown dimensions stay unknown', () => {
  const slot = getDesign('full-photo').slots[0];
  assert.equal(photoDpi(defaultPhotoState(), slot), null);
  const photo = { ...defaultPhotoState(), width: 2400, height: 1400 };
  assert.ok(photoDpi(photo, slot) >= 300);
  assert.ok(Math.abs(photoDpi({ ...photo, zoom: 2 }, slot) - photoDpi(photo, slot) / 2) <= 1);
});

test('left/front/right projection is distinct, monotonic and does not mirror text', () => {
  assert.ok(projectedWrapU(0, 'left') < projectedWrapU(0, 'front'));
  assert.equal(projectedWrapU(0, 'front'), 0.5);
  assert.ok(projectedWrapU(0, 'right') > projectedWrapU(0, 'front'));
  for (const angle of MUG_ANGLES) {
    let previous = -1;
    for (let x = -1; x <= 1; x += 0.02) {
      const u = projectedWrapU(x, angle);
      if (u === null) continue;
      assert.ok(u > previous); previous = u;
    }
  }
  assert.equal(projectedWrapU(-1, 'left'), null);
  assert.equal(projectedWrapU(1, 'right'), null);
});

test('WebGL UVs agree with 2D cylindrical projection for every angle', () => {
  for (const angle of MUG_ANGLES) for (const x of [-0.7, 0, 0.7]) {
    const u = projectedWrapU(x, angle);
    const theta = (PRINT_START + u * PRINT_SPAN) * Math.PI * 2;
    const point = new Vector3(Math.sin(theta), 0, Math.cos(theta)).applyAxisAngle(new Vector3(0, 1, 0), mugRotation(angle));
    assert.ok(Math.abs(point.x - x) < 1e-10);
    assert.ok(point.z > 0);
  }
});

test('shared artwork painter handles every template and fits long captions', () => {
  const calls = [];
  const ctx = new Proxy({ font: '700 12px sans-serif' }, {
    get(target, key) {
      if (key === 'measureText') return (text) => ({ width: text.length * Number(target.font.match(/[0-9.]+px/)[0].slice(0, -2)) * 0.55 });
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (key === 'fillText') return (text, x, y) => calls.push({ text, x, y, font: target.font });
      return key in target ? target[key] : () => {};
    },
  });
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  for (const design of MUG_DESIGNS) {
    const config = configFor(design.id);
    Object.values(config.texts).forEach((text) => { text.text = 'Averylongunbrokenpersonalizedcaption12345'; });
    drawMugWrap(canvas, design, config, {}, 600);
    assert.equal(canvas.width, 600); assert.equal(canvas.height, 291);
  }
  assert.ok(calls.length > 25);
  assert.ok(calls.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y)));
});

test('quantity pricing retains existing discount tiers', () => {
  assert.equal(quantityUnitPrice(249, 1), 249);
  assert.equal(quantityUnitPrice(249, 2), 237);
  assert.equal(quantityUnitPrice(249, 4), 224);
  assert.equal(quantityUnitPrice(249, 6), 212);
});

test('long unbroken captions are shrunk to fit their print area', () => {
  const design = { id: 'test', name: 'test', category: 'test', background: '#ffffff', slots: [{ id: 'text', type: 'text', x: 10, y: 10, w: 20, h: 10, fontScale: 0.8 }] };
  const config = initConfig(design, 'regular', '#ffffff', 'round');
  config.texts.text.text = 'THISISALONGUNBROKENCAPTION';
  let measured;
  const ctx = new Proxy({ font: '' }, {
    get(target, key) {
      const size = () => Number(target.font.match(/[0-9.]+px/)[0].slice(0, -2));
      if (key === 'measureText') return (text) => ({ width: text.length * size() * 0.6 });
      if (key === 'fillText') return (text) => { measured = { width: text.length * size() * 0.6, height: size() * 1.08 }; };
      return key in target ? target[key] : () => {};
    },
  });
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  drawMugWrap(canvas, design, config, {}, 600);
  assert.ok(measured.width <= 600 * 0.2 * 0.96);
  assert.ok(measured.height <= canvas.height * 0.1);
});