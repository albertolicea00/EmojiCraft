/* ─────────────────────────────────────────────
   export.js — SVG fetch, canvas render, ZIP
───────────────────────────────────────────── */

/**
 * Fetch raw SVG text for an emoji from the active style CDN.
 */
async function fetchSvg(emoji) {
  const src = SOURCES[state.style];
  if (src.isSystem) throw new Error('System style has no SVG');
  const url = src.url(emoji.unified);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

/**
 * Render an emoji onto a <canvas> at the given pixel size.
 * Returns the canvas element.
 */
async function toCanvas(emoji, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const src = SOURCES[state.style];

  if (src.isSystem) {
    const ch = toChar(emoji);
    const fs = Math.round(size * 0.72);
    ctx.font = `${fs}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ch, size / 2, size / 2 + fs * 0.04);
  } else {
    const url = src.url(emoji.unified);
    await new Promise((ok, fail) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => { ctx.drawImage(img, 0, 0, size, size); ok(); };
      img.onerror = fail;
      img.src = url;
    });
  }
  return canvas;
}

/**
 * Convert canvas to Blob for a given mime format.
 */
function canvasBlob(canvas, fmt) {
  return new Promise((ok, fail) => {
    canvas.toBlob(
      b => b ? ok(b) : fail(new Error('toBlob failed')),
      `image/${fmt}`,
      fmt === 'png' ? undefined : 0.95
    );
  });
}

/**
 * Export single emoji as SVG Blob.
 */
async function exportSvg(emoji) {
  const text = await fetchSvg(emoji);
  return new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
}

/**
 * Export single emoji as PNG or WebP Blob at given size.
 */
async function exportRaster(emoji, fmt, size) {
  const c = await toCanvas(emoji, size);
  return canvasBlob(c, fmt);
}

/**
 * Export all sizes (64/128/256/512/1024) + SVG into a ZIP Blob.
 * Uses the currently selected raster format (PNG or WebP).
 */
async function exportZip(emoji) {
  const zip = new JSZip();
  const n   = emoji.short_name;
  const fmt = state.fmt === 'svg' ? 'png' : state.fmt;

  for (const sz of EXPORT_SIZES) {
    const c   = await toCanvas(emoji, sz);
    const buf = await (await canvasBlob(c, fmt)).arrayBuffer();
    zip.file(`${n}_${sz}px.${fmt}`, buf);
  }

  if (!SOURCES[state.style].isSystem) {
    try {
      zip.file(`${n}.svg`, await fetchSvg(emoji));
    } catch (_) { /* skip if CDN unavailable */ }
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Export single emoji as ICO Blob (modern PNG-in-ICO format).
 */
async function exportIco(emoji, size) {
  const canvas   = await toCanvas(emoji, size);
  const pngBlob  = await canvasBlob(canvas, 'png');
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  const offset = 22; // 6 (ICONDIR) + 16 (ICONDIRENTRY)
  const buf    = new ArrayBuffer(offset + pngBytes.length);
  const dv     = new DataView(buf);

  // ICONDIR
  dv.setUint16(0, 0, true); // reserved
  dv.setUint16(2, 1, true); // type: ICO
  dv.setUint16(4, 1, true); // count

  // ICONDIRENTRY
  dv.setUint8(6,  size >= 256 ? 0 : size); // width  (0 = 256)
  dv.setUint8(7,  size >= 256 ? 0 : size); // height
  dv.setUint8(8,  0);                       // color count
  dv.setUint8(9,  0);                       // reserved
  dv.setUint16(10, 1,  true);               // planes
  dv.setUint16(12, 32, true);               // bpp
  dv.setUint32(14, pngBytes.length, true);  // data size
  dv.setUint32(18, offset,          true);  // data offset

  new Uint8Array(buf, offset).set(pngBytes);
  return new Blob([buf], { type: 'image/x-icon' });
}

/**
 * Export SVG + PNG + WebP at the given size into a ZIP Blob.
 */
async function exportZipFormats(emoji, size) {
  const zip = new JSZip();
  const n   = emoji.short_name;

  for (const fmt of ['png', 'webp']) {
    const c   = await toCanvas(emoji, size);
    const buf = await (await canvasBlob(c, fmt)).arrayBuffer();
    zip.file(`${n}_${size}px.${fmt}`, buf);
  }

  if (!SOURCES[state.style].isSystem) {
    try { zip.file(`${n}.svg`, await fetchSvg(emoji)); } catch (_) {}
  }

  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Trigger a browser file download.
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
