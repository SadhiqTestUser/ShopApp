export interface CustomizationEntry {
  label: string;
  value: string;
}

const FIELDS: [string, string][] = [
  ['customization_type', 'Customization'], ['page_count', 'Pages'],
  ['pad_material', 'Pad material'], ['material_label', 'Material'], ['pad_size', 'Pad size'], ['child_name', 'Child name'],
  ['magnet_shape', 'Magnet shape'], ['magnets', 'Magnets'], ['shape', 'Shape'],
  ['layout', 'Layout'], ['frame_size', 'Frame size'], ['frame_orientation', 'Orientation'],
  ['frame_color', 'Frame colour'], ['number_of_people', 'People'], ['soft_copy', 'Soft copy'],
  ['keychain_material', 'Material'], ['keychain_shape', 'Keychain shape'], ['print_type', 'Print type'],
  ['pencil_packs', 'Pencil packs'], ['pencil_names', 'Names'], ['pen_packs', 'Pen packs'],
  ['pen_names', 'Names'], ['name_packs', 'Packs per name'], ['mug_type_label', 'Mug type'],
  ['design_name', 'Design'], ['mug_color', 'Mug colour'], ['handle_style', 'Handle'],
  ['mug_texts', 'Text'],
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/-/g, ' ');
}

function formatArray(key: string, value: unknown[]): string {
  if (key === 'name_packs') {
    return value.map(asRecord).filter(Boolean)
      .map((item) => `${String(item!.name ?? '')} (${String(item!.packs ?? '')} pack(s))`).join(', ');
  }
  if (key === 'magnets') {
    return value.map(asRecord).filter(Boolean)
      .map((item) => `${humanize(String(item!.shape ?? 'magnet'))} × ${String(item!.quantity ?? 1)}`).join(', ');
  }
  return value.filter((item) => ['string', 'number'].includes(typeof item)).map(String).join(', ');
}

export function customizationEntries(data: unknown): CustomizationEntry[] {
  const record = asRecord(data);
  if (!record) return [];
  return FIELDS.flatMap(([key, label]) => {
    const raw = record[key];
    if (raw === null || raw === undefined || raw === '' || raw === false) return [];
    const value = Array.isArray(raw) ? formatArray(key, raw)
      : typeof raw === 'boolean' ? 'Yes'
        : typeof raw === 'string' ? humanize(raw) : String(raw);
    return value ? [{ label, value }] : [];
  });
}

function addUrl(target: string[], value: unknown) {
  if (typeof value === 'string' && value && !target.includes(value)) target.push(value);
}

export function customizationImageGroups(data: unknown) {
  const record = asRecord(data);
  const previews: string[] = [];
  const originals: string[] = [];
  const production: string[] = [];
  if (!record) return { previews, originals, production, all: [] as string[] };
  if (Array.isArray(record.images)) record.images.forEach((url) => addUrl(previews, url));
  if (Array.isArray(record.original_images)) record.original_images.forEach((url) => addUrl(originals, url));
  if (Array.isArray(record.production_images)) record.production_images.forEach((url) => addUrl(production, url));

  const frame = asRecord(record.frame_design);
  addUrl(originals, frame?.original_url);
  const keychain = asRecord(record.keychain_design);
  if (Array.isArray(keychain?.photos)) keychain.photos.forEach((photo) => addUrl(originals, asRecord(photo)?.original_url));
  const mug = asRecord(record.mug_config);
  const mugPhotos = asRecord(mug?.photos);
  if (mugPhotos) Object.values(mugPhotos).forEach((photo) => addUrl(originals, asRecord(photo)?.url));

  return { previews, originals, production, all: [...new Set([...previews, ...originals, ...production])] };
}

export function primaryCustomizationImage(data: unknown): string | null {
  return customizationImageGroups(data).previews[0] ?? null;
}