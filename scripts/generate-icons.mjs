/**
 * Membuat ikon PNG tanpa dependensi eksternal.
 * Menggambar dengan supersampling 4x lalu diperkecil agar tepi halus,
 * kemudian mengemas piksel menjadi PNG (zlib + CRC32).
 *
 * Jalankan: npm run icons
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
const SS = 4; // supersampling

const BRAND_TOP = [15, 118, 110];
const BRAND_BOTTOM = [11, 93, 87];
const ACCENT = [94, 234, 212];

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function insideRoundedRect(x, y, left, top, right, bottom, radius) {
  if (x < left || x > right || y < top || y > bottom) return false;
  const r = Math.min(radius, (right - left) / 2, (bottom - top) / 2);
  const cx = Math.min(Math.max(x, left + r), right - r);
  const cy = Math.min(Math.max(y, top + r), bottom - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * @param {number} size ukuran akhir (piksel)
 * @param {{ rounded: boolean, glyph: number }} options
 *   glyph = skala glyph relatif terhadap kotak ikon (1 = normal, 0.8 = maskable)
 */
function drawIcon(size, { rounded = true, glyph = 1 } = {}) {
  const big = size * SS;
  const buffer = Buffer.alloc(big * big * 4);
  const corner = rounded ? big * 0.225 : 0;

  // Glyph: tiga batang naik (bar chart) di area aman.
  const glyphBox = big * 0.54 * glyph;
  const originX = (big - glyphBox) / 2;
  const originY = (big - glyphBox) / 2;
  const barWidth = glyphBox * 0.26;
  const gap = glyphBox * 0.12;
  const baseY = originY + glyphBox * 0.88;
  const heights = [0.42, 0.66, 0.9].map((ratio) => glyphBox * ratio * 0.88);
  const totalWidth = barWidth * 3 + gap * 2;
  const startX = originX + (glyphBox - totalWidth) / 2;

  for (let y = 0; y < big; y += 1) {
    for (let x = 0; x < big; x += 1) {
      const index = (y * big + x) * 4;

      const inBody = corner === 0 || insideRoundedRect(x, y, 0, 0, big - 1, big - 1, corner);
      if (!inBody) {
        buffer[index + 3] = 0;
        continue;
      }

      const t = (x / big) * 0.45 + (y / big) * 0.55;
      let [r, g, b] = mix(BRAND_TOP, BRAND_BOTTOM, Math.min(1, Math.max(0, t)));

      // Batang grafik.
      for (let i = 0; i < 3; i += 1) {
        const left = startX + i * (barWidth + gap);
        const top = baseY - heights[i];
        if (insideRoundedRect(x, y, left, top, left + barWidth, baseY, barWidth / 2)) {
          const shade = 1 - i * 0.06;
          const tone = i === 2 ? ACCENT : [255, 255, 255];
          [r, g, b] = mix([r, g, b], tone, 0.95 * shade);
        }
      }

      // Garis dasar tipis di bawah batang.
      if (y > baseY + big * 0.03 && y < baseY + big * 0.03 + big * 0.022 && x > startX && x < startX + totalWidth) {
        [r, g, b] = mix([r, g, b], [255, 255, 255], 0.5);
      }

      buffer[index] = r;
      buffer[index + 1] = g;
      buffer[index + 2] = b;
      buffer[index + 3] = 255;
    }
  }

  // Turunkan resolusi (box filter).
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const src = ((y * SS + sy) * big + (x * SS + sx)) * 4;
          const alpha = buffer[src + 3] / 255;
          r += buffer[src] * alpha;
          g += buffer[src + 1] * alpha;
          b += buffer[src + 2] * alpha;
          a += buffer[src + 3];
        }
      }
      const count = SS * SS;
      const alpha = a / count;
      const weight = alpha / 255 || 1;
      const dest = (y * size + x) * 4;
      out[dest] = Math.round(r / count / weight);
      out[dest + 1] = Math.round(g / count / weight);
      out[dest + 2] = Math.round(b / count / weight);
      out[dest + 3] = Math.round(alpha);
    }
  }

  return encodePng(size, size, out);
}

const targets = [
  { name: 'icon-192.png', size: 192, options: { rounded: true, glyph: 1 } },
  { name: 'icon-512.png', size: 512, options: { rounded: true, glyph: 1 } },
  { name: 'icon-maskable-512.png', size: 512, options: { rounded: false, glyph: 0.78 } },
  { name: 'apple-touch-icon.png', size: 180, options: { rounded: false, glyph: 0.92 } },
];

mkdirSync(OUT_DIR, { recursive: true });

for (const target of targets) {
  const png = drawIcon(target.size, target.options);
  writeFileSync(join(OUT_DIR, target.name), png);
  console.log(`✓ ${target.name} (${target.size}×${target.size}, ${(png.length / 1024).toFixed(1)} KB)`);
}

console.log(`Selesai. Berkas ada di ${OUT_DIR}`);
