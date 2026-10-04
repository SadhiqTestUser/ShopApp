# Photo Frames

- Product URL: `/products/photo-frames`.
- The thumbnail, six sizes and provisional base price live in
  `src/data/photo-frames.json`, shared by the storefront and seed script.
- The storefront supplements the Firestore catalog with this product when its
  document is absent. A persisted document takes precedence; setting it inactive
  hides the product from listing, search and direct navigation.
- ₹399 is taken from the supplied reference screenshot. All sizes currently use
  that base price because no size-specific prices were provided. Confirm pricing
  before launch. Merchant overrides can be stored in
  `customization_options.sizePrices`, keyed by `8x10`, `10x14`, etc.
- Digi Painting uses its own sample-artwork flow with one photo upload, a
  people-count selection, and WhatsApp proof approval before printing. This
  product uses `digi_painting`.

## Editing and saving

1. Select portrait/landscape and black/white, then upload JPG, PNG or WebP (10 MB
   maximum). Editing is local and does not require a sign-in or a network upload.
2. Drag with a mouse/touch pointer and scroll over the photo to zoom. A slider,
   reset control and keyboard controls provide alternatives. Minimum zoom fills
   the opening; drag bounds and SVG clipping prevent gaps and overflow.
3. **Save & Select Size** keeps the current edit in memory and displays all six
   sizes. Selecting a size updates its proportions and inch arrows; landscape
   swaps width/height. The image is not stretched. **Edit Again** edits the new
   aspect ratio without discarding the source or previous normalized placement.
4. Sign in before adding to the cart. The app uploads both the original and the
   exact visible crop under the existing user-scoped Storage path. The crop goes
   in `images` for the existing order download flow; `frame_design` preserves the
   original URL, source dimensions, selected dimensions and crop for production.
   Crop exports are capped at 4096 pixels and never upscaled. The preview border
   is illustrative (0.3 inches per side), not a manufacturing specification.

Draft edits are in memory only; navigating away or reloading clears them. Cart
items use permanent Storage URLs, not blob URLs, and retain their choices after
a reload. Original object URLs are revoked on replacement/unmount.

## Publishing the database entry

After approving the price and target Firebase project, run
`node scripts/seed-products.mjs --only=photo-frames` with existing admin seed
credentials. This writes just that product and skips legacy-document deletion.
It is not necessary for the storefront preview, but makes the product editable
in the existing admin product manager. Do not run the unrestricted seed script
to publish only this product.

## Verification

Run `node --import ./tests/register-typescript.mjs --test tests/photo-frames.test.mjs`,
then `npm run typecheck` and `npm run build`.

Manual UI checks: open the product from the catalog; upload tall and wide photos;
drag beyond each edge; zoom in/out with the wheel and slider; switch orientation;
save; select all sizes and verify arrows; edit again; try an invalid photo; test
a narrow screen and keyboard controls. In an authenticated test environment,
verify upload failure/retry, add-to-cart, reload the cart, and inspect the saved
crop and orientation in order details. No payment or production data write is
needed for editor verification.