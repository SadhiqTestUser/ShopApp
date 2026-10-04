# Personalized Name Pen photo mockup

- `source-photo.webp`: the product photograph supplied by the user, downloaded from the thumbnail URL in `src/data/name-pen.json` (578 × 582).
- `preview-photo.jpg`: the same photograph with the sample inscription removed using adjacent barrel texture. No pen geometry is drawn or generated.
- The thumbnail remains unchanged. The preview asset is served locally so typing never uploads a customer's name or depends on a competitor's rendering API.

Regenerate the blank photograph on macOS from the repository root with `swift scripts/prepare-name-pen-photo.swift`. This offline helper uses system AppKit, not an application dependency.

`src/components/PenPreview.tsx` positions silver lettering at image coordinate (212.72, 367.96), rotated −50.905° to follow the barrel. Its full-photo and close-up views share these coordinates, keeping the lettering aligned on every screen size.

For higher-resolution photography, replace the source with an approved supplier photo and recalibrate the print area and retouching coordinates together. Do not substitute an arbitrary image under the existing overlay.