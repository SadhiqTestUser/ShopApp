import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PHOTO_FRAMES_PRODUCT, PHOTO_FRAME_SIZES, frameDimensions, framePrice, withPhotoFrames } from '../src/lib/photoFrames.ts';
import { DEFAULT_FRAME_CROP, normalizeFrameCrop, framePlacement, panFrameCrop, wheelFrameZoom, frameAperture, frameSourceCrop, validateFramePhoto } from '../src/components/photo-frame/frameGeometry.ts';
import { exportFramePhoto } from '../src/components/photo-frame/frameExport.ts';
import FramePreview from '../src/components/photo-frame/FramePreview.tsx';
import PhotoFrameCustomizer from '../src/components/photo-frame/PhotoFrameCustomizer.tsx';
import { buildOrderItem, limitSuggestions, readSuggestions, withProductSuggestions, MAX_CUSTOMIZATION_SUGGESTIONS } from '../src/lib/orderSuggestions.ts';
import { CustomizationSuggestionsField, CustomizationSuggestionsNote } from '../src/components/CustomizationSuggestions.tsx';

test('Photo Frames has the requested thumbnail and exactly the six requested sizes', () => {
  assert.equal(PHOTO_FRAMES_PRODUCT.name, 'Photo Frames');
  assert.equal(PHOTO_FRAMES_PRODUCT.image_url, 'https://cdn.printshoppy.com/image/catalog/matte-photo-frames/webp/matte-photo-frames-s3.webp');
  assert.equal(PHOTO_FRAMES_PRODUCT.customization_type, 'matte_photo_frame');
  assert.deepEqual(PHOTO_FRAME_SIZES.map(({ width, height }) => [width, height]), [[8, 10], [10, 14], [12, 18], [14, 20], [20, 30], [20, 36]]);
});

test('built-in catalog entry does not duplicate or override persisted prices or visibility', () => {
  assert.deepEqual(withPhotoFrames([]), [PHOTO_FRAMES_PRODUCT]);
  const persisted = { ...PHOTO_FRAMES_PRODUCT, price: 599 };
  assert.deepEqual(withPhotoFrames([persisted]), [persisted]);
  assert.deepEqual(withPhotoFrames([{ ...persisted, active: false }]), []);
  const list = [{ ...PHOTO_FRAMES_PRODUCT, id: 'old', created_at: '2020-01-01' }];
  assert.equal(withPhotoFrames(list)[0].id, 'photo-frames');
  assert.equal(list.length, 1);
});

test('prices use the configured base unless a valid size-specific price is supplied', () => {
  for (const size of PHOTO_FRAME_SIZES) assert.equal(framePrice(PHOTO_FRAMES_PRODUCT, size.id), 399);
  const product = { ...PHOTO_FRAMES_PRODUCT, customization_options: { sizePrices: { '8x10': 499, '10x14': -1, '12x18': Infinity } } };
  assert.equal(framePrice(product, '8x10'), 499);
  assert.equal(framePrice(product, '10x14'), 399);
  assert.equal(framePrice(product, '12x18'), 399);
  const original = { customization_type: 'matte_photo_frame', page_count: null, magnet_shape: null, images: ['photo.jpg'], unit_price: 499, frame_color: 'black' };
  const customization = withProductSuggestions(product, original, '  Keep the name below the photo.\nPlease retain తెలుగు text.  ');
  const item = JSON.parse(JSON.stringify({ id: 'frame-line', product, quantity: 2, customization }));
  const submitted = buildOrderItem(item);
  assert.equal(submitted.price, 499);
  assert.equal(submitted.quantity, 2);
  assert.equal(submitted.customization_data.suggestions, 'Keep the name below the photo.\nPlease retain తెలుగు text.');
  assert.equal(submitted.customization_data.frame_color, 'black');
  assert.deepEqual(submitted.customization_data.images, ['photo.jpg']);
  assert.equal(original.suggestions, undefined);
  const standard = { ...product, customization_type: 'standard' };
  const standardItem = { id: 'standard-line', product: standard, quantity: 1, customization: withProductSuggestions(standard, null, 'Gift wrap please') };
  assert.equal(buildOrderItem(standardItem).customization_data.suggestions, 'Gift wrap please');
  assert.equal(buildOrderItem(standardItem).price, Number(standard.price));
  assert.equal(buildOrderItem({ ...standardItem, customization: null }).customization_data, null);
  assert.equal(readSuggestions(withProductSuggestions(product, customization, '')), '');
  assert.equal(readSuggestions({ suggestions: 42 }), '');
  assert.equal(limitSuggestions('x'.repeat(1200)).length, MAX_CUSTOMIZATION_SUGGESTIONS);
});

for (const size of PHOTO_FRAME_SIZES) for (const orientation of ['portrait', 'landscape']) {
  test(`${size.id} ${orientation}: dimensions, cover-fit, pan bounds and source crop agree`, () => {
    const dimensions = frameDimensions(size, orientation);
    assert.deepEqual(dimensions, orientation === 'portrait' ? { width: size.width, height: size.height } : { width: size.height, height: size.width });
    const area = frameAperture(dimensions);
    for (const image of [{ width: 1600, height: 900 }, { width: 900, height: 1600 }, { width: 1000, height: 1000 }, { width: 10, height: 10000 }]) {
      for (const zoom of [1, 1.01, 2, 4]) for (const offset of [-1e6, 0, 1e6]) {
        const view = panFrameCrop(image, area, { zoom, x: 0, y: 0 }, offset, -offset);
        const placed = framePlacement(image, area, view);
        assert.ok(placed.x <= 1e-8 && placed.y <= 1e-8);
        assert.ok(placed.x + placed.width >= area.width - 1e-8);
        assert.ok(placed.y + placed.height >= area.height - 1e-8);
        const source = frameSourceCrop(image, area, view);
        assert.ok(source.sx >= -1e-8 && source.sy >= -1e-8);
        assert.ok(source.sx + source.sw <= image.width + 1e-8);
        assert.ok(source.sy + source.sh <= image.height + 1e-8);
        assert.ok(Math.abs(source.sw / source.sh - area.width / area.height) < 1e-8);
      }
    }
  });

  test(`${size.id} ${orientation}: preview labels, arrows and clipping are rendered`, () => {
    const dimensions = frameDimensions(size, orientation);
    const markup = renderToStaticMarkup(createElement(FramePreview, {
      dimensions, crop: { zoom: 2, x: 1, y: -1 }, color: 'black', showDimensions: true,
      photo: { url: 'fixture.jpg', width: 1800, height: 1200 },
    }));
    assert.ok(markup.includes(`Width: ${dimensions.width}&quot;`));
    assert.ok(markup.includes(`Height: ${dimensions.height}&quot;`));
    assert.match(markup, /marker-start="url\(#.+-arrow\)"/);
    assert.match(markup, /marker-end="url\(#.+-arrow\)"/);
    assert.match(markup, /clip-path="url\(#.+-clip\)"/);
    assert.match(markup, /overflow="hidden"/);
    assert.match(markup, /preserveAspectRatio="none"/);
  });
}

test('orientation and responsive size changes preserve normalized placement without blank edges', () => {
  const image = { width: 1800, height: 1200 };
  const crop = { zoom: 2, x: 0.45, y: -0.6 };
  for (const orientation of ['portrait', 'landscape']) {
    const area = frameAperture(frameDimensions(PHOTO_FRAME_SIZES[3], orientation));
    const source = frameSourceCrop(image, area, crop);
    const responsive = frameSourceCrop(image, { width: area.width * 0.42, height: area.height * 0.42 }, crop);
    for (const key of Object.keys(source)) assert.ok(Math.abs(source[key] - responsive[key]) < 1e-8);
  }
  assert.deepEqual(crop, { zoom: 2, x: 0.45, y: -0.6 });
});

test('wheel direction, line/page delta modes, fit reset and extreme inputs stay bounded', () => {
  assert.ok(wheelFrameZoom(2, -10) > 2);
  assert.ok(wheelFrameZoom(2, 10) < 2);
  assert.equal(wheelFrameZoom(1, 5000), 1);
  assert.equal(wheelFrameZoom(4, -5000), 4);
  assert.equal(wheelFrameZoom(2, 1, 1), wheelFrameZoom(2, 16, 0));
  assert.equal(wheelFrameZoom(2, 1, 2), wheelFrameZoom(2, 400, 0));
  assert.deepEqual(normalizeFrameCrop({ zoom: NaN, x: Infinity, y: -Infinity }), DEFAULT_FRAME_CROP);
  assert.deepEqual(normalizeFrameCrop({ zoom: 99, x: -50, y: 50 }), { zoom: 4, x: -1, y: 1 });
});

test('image validation rejects unsupported, empty and oversized files', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(validateFramePhoto({ type, size: 1024 }), null);
  for (const file of [{ type: 'image/svg+xml', size: 100 }, { type: 'image/gif', size: 100 }, { type: 'text/plain', size: 100 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 10 * 1024 * 1024 + 1 }]) assert.ok(validateFramePhoto(file));
});

test('product opens the editor, exposes both orientations and disables saving without a photo', () => {
  const markup = renderToStaticMarkup(createElement(PhotoFrameCustomizer, {
    product: PHOTO_FRAMES_PRODUCT, signedIn: false, uploadPhoto: async () => 'stored.jpg', onAddToCart() {},
    suggestionsField: createElement(CustomizationSuggestionsField, { value: 'Keep blue text', onChange() {}, productName: 'Photo Frames' }),
  }));
  assert.match(markup, /Select orientation/);
  assert.match(markup, /aria-pressed="true"[^>]*>.*?portrait/s);
  assert.match(markup, /landscape/);
  assert.match(markup, /<button[^>]*disabled=""[^>]*>Save &amp; Select Size/);
  assert.match(markup, /aria-label="Photo zoom"/);
  assert.doesNotMatch(markup, /aria-label="Frame size in inches"/);
  assert.equal((markup.match(/Customization suggestions for Photo Frames/g) ?? []).length, 1);
  assert.ok(markup.indexOf('Customization suggestions for Photo Frames') > markup.indexOf('aria-label="Photo zoom"'));
  const field = renderToStaticMarkup(createElement(CustomizationSuggestionsField, { value: 'Keep blue text', onChange() {}, disabled: true, productName: 'Photo Frames' }));
  assert.match(field, /Customization suggestions for Photo Frames/);
  assert.match(field, /maxLength="1000"/i);
  assert.match(field, /disabled=""/);
  assert.match(field, /Keep blue text/);
  const note = renderToStaticMarkup(createElement(CustomizationSuggestionsNote, { data: { suggestions: '<script>alert(1)</script>\nKeep exact spelling.' } }));
  assert.match(note, /Customer customization suggestions/);
  assert.match(note, /&lt;script&gt;/);
  assert.doesNotMatch(note, /<script>/);
  assert.match(note, /whitespace-pre-wrap/);
  assert.equal(renderToStaticMarkup(createElement(CustomizationSuggestionsNote, { data: { suggestions: '  ' } })), '');
});

test('canvas export uses the exact visible source crop and reports encoding failures', async (t) => {
  const draws = [];
  let encodeFails = false;
  const canvas = { width: 0, height: 0, getContext: () => ({ fillRect() {}, drawImage: (...args) => draws.push(args) }), toBlob: (done) => done(encodeFails ? null : new Blob(['photo'], { type: 'image/jpeg' })) };
  const oldImage = globalThis.Image, oldDocument = globalThis.document;
  t.after(() => { globalThis.Image = oldImage; globalThis.document = oldDocument; });
  globalThis.Image = class {
    naturalWidth = 6000; naturalHeight = 9000;
    set src(value) { this.url = value; this.onload(); }
  };
  globalThis.document = { createElement: (tag) => { assert.equal(tag, 'canvas'); return canvas; } };
  const dimensions = { width: 8, height: 10 }, crop = { zoom: 1.5, x: 0.5, y: -0.5 };
  const expected = frameSourceCrop({ width: 6000, height: 9000 }, frameAperture(dimensions), crop);
  const blob = await exportFramePhoto('fixture.jpg', dimensions, crop);
  assert.equal(blob.type, 'image/jpeg');
  assert.deepEqual(draws[0].slice(1, 5), [expected.sx, expected.sy, expected.sw, expected.sh]);
  assert.ok(Math.max(canvas.width, canvas.height) <= 4096);
  assert.ok(Math.abs(canvas.width / canvas.height - expected.sw / expected.sh) < 0.001);
  encodeFails = true;
  await assert.rejects(exportFramePhoto('fixture.jpg', dimensions, crop), /Could not save/);
});