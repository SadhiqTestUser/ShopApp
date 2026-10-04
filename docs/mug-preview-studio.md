# Mug preview studio

## Research and design direction

Reviewed public product/editor descriptions and the supplied Printshoppy screenshot;
these observations are not claims about the competitors' internal technology.

- [Printshoppy](https://www.printshoppy.com/photo-mugs): template-first photo/text
  personalization. The supplied screenshot shows left/front/right mockups together,
  with a separate 3D action and appearance controls alongside.
- [VistaPrint](https://www.vistaprint.sg/photo-gifts/personalised-mugs): templates or
  uploads, photo/text customization, wraparound versus two-sided layouts, and a
  dedicated 3D preview. This project retains its existing wraparound print format;
  viewing an angle does not create a separate print surface.
- [Printify](https://printify.com/custom-mugs/) and its
  [mockup generator](https://printify.com/mockup-generator/): photo/text composition
  followed by multi-angle product visualization.

The implemented layout uses a large, sticky preview on the left and editing/product
controls on the right. On small screens these stack without horizontal overflow.
All angles is the default, with individual Left, Front, Right, 3D view and Flat wrap
buttons. The flat wrap remains editable beneath product views.

## Library comparison

| Option | Strength | Decision |
| --- | --- | --- |
| Canvas 2D + React | Lightweight fixed-layout editor and cylindrical angle mockups; works without WebGL | Use existing canvas painter for every preview |
| Three.js + React Three Fiber + Drei | Real geometry, UV mapping, lighting, orbit/zoom, material simulation | Reuse installed libraries; lazy-load only on 3D selection |
| Fabric.js / Konva | Free-form layers, selection handles, arbitrary text positioning | Not needed for current template slots; consider if moving to a free-form editor |
| model-viewer + GLB | Good for viewing authored product models | Possible future upgrade with measured production mug assets; less direct fit for current procedural models |
| Hosted mockup/personalization services | Photographic product assets and production integrations | Adds vendor, licensing, privacy and network dependencies; not introduced |

No dependencies or versions were added/changed.

## Rendering architecture

- `MugConfig` is the source of truth for photos, transforms, text and appearance.
- `useMugArtwork` decodes uploads only when URLs change, guards asynchronous results,
  redraws after fonts load, and paints a shared 2048px-wide artwork canvas.
- `MugWrap` displays that exact canvas, with keyboard-accessible hit targets on top.
  Thumbnail canvases are limited to 600px to avoid gallery memory waste.
- `MugAnglePreview` projects vertical strips onto a cylinder using inverse sine,
  adding ceramic shading, a rim, a handle and a ground shadow. Text is not mirrored.
- `mugProjection` defines the same handle seam, print sector and view angles for
  the Canvas and WebGL renderers. The print sector leaves a gap beside the handle.
- `Mug3DView` uses the same canvas as a `CanvasTexture`, procedural geometry and
  local studio lighting (no externally hosted model/HDRI assets).
  Handles use bevelled ceramic profiles with smoothed normals and broad joins
  embedded in the mug wall, instead of a thin cut torus.
- 3D animation is off by default, respecting users who do not want motion. Rotation
  is opt-in; paused 3D renders on demand. Controls support mouse/touch and angle
  presets. Rendering errors/context loss do not prevent editing in 2D.

## Editing and data integrity

- JPG/PNG/WebP uploads up to 12 MB, with decode-error and unsupported-file feedback.
- Zoom and position controls; placement clamps to prevent empty crop edges.
- Brightness, contrast, saturation, highlights and shadows; one reset action.
- Caption fonts/colours and automatic text fitting, identical in every view.
- Only white mugs are available. Mug-body colour controls and non-white variants
  are removed; text/artwork colours remain editable. Legacy non-white drafts fall
  back to a regular white mug without losing photos or captions. Initial configs,
  saved drafts and new cart customizations normalize to the available white options.
- Gallery and studio both offer WhatsApp custom-design help using the public
  footer contact. The notice explains that without a chosen template or an agreed
  custom design, the shop chooses the final design. The link opens a prefilled
  message; it does not send anything automatically or upload the customer's photos.
- Effective photo DPI guidance accounts for slot size and zoom. Under 150 DPI
  triggers a warning, not an unsupported guarantee about print quality.
- Template changes carry matching content by slot order and reset crops to match
  the new layout. In-session template drafts are retained when switching back.
- Deterministic slot IDs repair reload/resume behaviour; legacy random-ID drafts
  migrate by slot order. Storage failures are shown instead of claiming a save.
- Cart customization retains the full mug configuration and template snapshot,
  not just caption strings. Original uploads are stored with transforms to avoid
  applying photo filters twice when reconstructing the design.

## Validation

Run focused tests with Node 22.15+ (uses built-in test runner and installed TypeScript):

- `node --import ./tests/register-typescript.mjs --test tests/mug.test.mjs`
- `npx --no-install eslint src/components/mug src/lib/mugs.ts`
- `npm run typecheck`
- `npm run build`

The isolated browser fixture does not access Firebase or customer accounts:

- Start Vite: `npm run dev -- --host 127.0.0.1 --port 5174 --strictPort`.
- `node tests/run-mug-browser.mjs desktop`
- `node tests/run-mug-browser.mjs mobile`
- `node tests/run-mug-browser.mjs desktop smoke --no-webgl` for fallback coverage.
- For screenshots only: `node tests/run-mug-browser.mjs desktop "3D view"`.
- Open `/tests/mug-studio.html` on that local server for manual review.

The optional runner uses local macOS Chrome and Node's built-in WebSocket client,
with isolated temporary profiles. Screenshots go into ignored `tests/artifacts/`.
This fixture is not an application route and is not included in the production build.

Initial studio validation: 14 unit tests passed; desktop (1440px) and mobile (390px)
interaction checks passed with WebGL active; the WebGL-disabled fallback check
passed. TypeScript, focused mug-code lint and the production build passed (exit 0).
Screenshots were generated, but image inspection was unavailable in the agent's
environment; human visual review is still recommended.

White-only/WhatsApp/handle update: TypeScript, focused lint, production build and
all 14 existing unit tests passed (exit 0). No new test cases were added; existing
colour-related expectations were adjusted to match white-only draft migration.
The updated handle has not been visually verified in a browser in this iteration.

Repository-wide lint remains blocked by seven pre-existing unused-variable errors
in `MagnetCustomizer`, `ProductDetailPage` and `UserDashboard`, plus three Fast Refresh
warnings. The installed TypeScript/ESLint compatibility and stale Browserslist
warnings also remain; no package upgrades were made as part of this work.

## Boundaries and production follow-up

- Mockups show placement on a white mug, not colour-calibrated print proofs.
- Procedural geometry is not a measured model of each supplier's mug. Replace it
  with calibrated GLB assets/UVs before claiming exact physical reproduction.
- The 2048px preview canvas is not a certified 300-DPI print export. The cart retains
  original photos and transforms for a future production-resolution export pipeline.
- Browser localStorage has finite capacity. Large signed-out drafts/cart images can
  exceed it; the draft warning is explicit. Durable asset-backed cart persistence
  remains an existing broader application limitation.
- Browser fixture checks do not replace authenticated Firebase checkout/storage
  integration tests or Safari/mobile-device checks.
- Existing application bundle-size warnings remain. The approximately 247 KB gzip
  3D chunk is deferred until 3D is selected.