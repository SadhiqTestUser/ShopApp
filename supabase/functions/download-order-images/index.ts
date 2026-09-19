import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DownloadRequest {
  images: { url: string; filename: string }[];
}

async function downloadFile(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

// Minimal ZIP writer: stores files uncompressed (STORE method, method 0).
// This avoids needing a zip compression library while still producing a
// valid .zip that all OS file managers can open.
async function buildZip(
  files: { filename: string; data: Uint8Array }[],
): Promise<Uint8Array> {
  const encoder = new TextEncoder();

  const fileRecords: Uint8Array[] = [];
  const centralDirRecords: Uint8Array[] = [];
  let offset = 0;

  const crc32Table = (() => {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c >>> 0;
    }
    return table;
  })();

  function crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc = crc32Table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function u16(n: number): number[] {
    return [n & 0xFF, (n >>> 8) & 0xFF];
  }
  function u32(n: number): number[] {
    return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];
  }

  for (const file of files) {
    const nameBytes = encoder.encode(file.filename);
    const crc = crc32(file.data);
    const size = file.data.length;

    // Local file header
    const localHeader = [
      ...u32(0x04034b50), // signature
      ...u16(20),        // version needed
      ...u16(0),         // flags
      ...u16(0),         // compression method (0 = store)
      ...u16(0),         // mod time
      ...u16(0),         // mod date
      ...u32(crc),       // crc-32
      ...u32(size),      // compressed size
      ...u32(size),      // uncompressed size
      ...u16(nameBytes.length), // filename length
      ...u16(0),         // extra field length
    ];
    const localHeaderBytes = new Uint8Array(localHeader);
    const localRecord = new Uint8Array(localHeader.length + nameBytes.length + size);
    localRecord.set(localHeaderBytes, 0);
    localRecord.set(nameBytes, localHeader.length);
    localRecord.set(file.data, localHeader.length + nameBytes.length);
    fileRecords.push(localRecord);

    // Central directory header
    const centralHeader = [
      ...u32(0x02014b50), // signature
      ...u16(20),        // version made by
      ...u16(20),        // version needed
      ...u16(0),         // flags
      ...u16(0),         // compression method
      ...u16(0),         // mod time
      ...u16(0),         // mod date
      ...u32(crc),       // crc-32
      ...u32(size),      // compressed size
      ...u32(size),      // uncompressed size
      ...u16(nameBytes.length),
      ...u16(0),         // extra field length
      ...u16(0),         // comment length
      ...u16(0),         // disk number start
      ...u16(0),         // internal attrs
      ...u32(0),         // external attrs
      ...u32(offset),    // offset of local header
    ];
    const centralHeaderBytes = new Uint8Array(centralHeader);
    const centralRecord = new Uint8Array(centralHeader.length + nameBytes.length);
    centralRecord.set(centralHeaderBytes, 0);
    centralRecord.set(nameBytes, centralHeader.length);
    centralDirRecords.push(centralRecord);

    offset += localRecord.length;
  }

  // End of central directory
  const centralDirSize = centralDirRecords.reduce((s, r) => s + r.length, 0);
  const eocd = [
    ...u32(0x06054b50), // signature
    ...u16(0),          // disk number
    ...u16(0),          // disk with central dir
    ...u16(files.length),
    ...u16(files.length),
    ...u32(centralDirSize),
    ...u32(offset),     // offset of central dir
    ...u16(0),          // comment length
  ];
  const eocdBytes = new Uint8Array(eocd);

  const totalLen =
    fileRecords.reduce((s, r) => s + r.length, 0) +
    centralDirSize +
    eocdBytes.length;
  const zip = new Uint8Array(totalLen);
  let pos = 0;
  for (const r of fileRecords) { zip.set(r, pos); pos += r.length; }
  for (const r of centralDirRecords) { zip.set(r, pos); pos += r.length; }
  zip.set(eocdBytes, pos);
  return zip;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { images } = await req.json() as DownloadRequest;
    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: 'No images provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const files: { filename: string; data: Uint8Array }[] = [];
    for (const { url, filename } of images) {
      try {
        const data = await downloadFile(url);
        files.push({ filename, data });
      } catch (err) {
        console.error(`Failed to download ${filename}:`, err);
      }
    }

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: 'Could not download any images' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const zip = await buildZip(files);
    const zipName = (images[0]?.filename ?? 'order').split('_')[0] || 'order';

    return new Response(zip, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}_images.zip"`,
      },
    });
  } catch (err) {
    console.error('download-order-images error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
