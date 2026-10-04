import { loadImage } from '@/lib/imageEdit';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not prepare preview artwork.'));
    reader.readAsDataURL(blob);
  });
}

async function inlineImages(svg: SVGSVGElement, localSources: ReadonlyMap<string, Blob> = new Map()) {
  const images = Array.from(svg.querySelectorAll('image'));
  await Promise.all(images.map(async (image) => {
    const href = image.getAttribute('href') ?? image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (!href || href.startsWith('data:')) return;
    const localBlob = localSources.get(href);
    if (localBlob) {
      image.setAttribute('href', await blobToDataUrl(localBlob));
    } else {
      const response = await fetch(href);
      if (!response.ok) throw new Error('Could not load preview artwork.');
      image.setAttribute('href', await blobToDataUrl(await response.blob()));
    }
    image.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
  }));
}

export async function exportSvgPreview(
  svg: SVGSVGElement,
  size = 1200,
  localSources: ReadonlyMap<string, Blob> = new Map(),
): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(size));
  await inlineImages(clone, localSources);

  const source = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create the saved design preview.');
    context.fillStyle = '#f8fafc';
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    return await new Promise((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Could not save the design preview.')),
      'image/jpeg', 0.92,
    ));
  } finally {
    URL.revokeObjectURL(url);
  }
}