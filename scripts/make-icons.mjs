// Generates simple PNG icons (192x192, 512x512) at install time so the PWA
// manifest is valid without requiring designers to produce binary assets.
// Pure-JS PNG writer — no native deps.
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "..", "public");
if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

// Brand palette (matches tailwind.config.ts + manifest.json)
const BRAND = [0x1a, 0x56, 0xdb]; // #1a56db
const WHITE = [0xff, 0xff, 0xff];
const LENA = [0x16, 0xa3, 0x4a];
const DENA = [0xdc, 0x26, 0x26];

function crc32(buf) {
  let c;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function buildPng(size) {
  // RGBA raster, drawn programmatically: rounded brand square with a stylized
  // ledger inside (3 horizontal "rows" tinted brand/lena/dena).
  const W = size;
  const H = size;
  const radius = Math.round(size * 0.18);
  const pad = Math.round(size * 0.18);
  const innerX = pad;
  const innerY = Math.round(size * 0.22);
  const innerW = size - pad * 2;
  const innerH = Math.round(size * 0.56);
  const innerR = Math.round(size * 0.05);

  const rowH = Math.round(innerH / 6);
  const rowGap = Math.round(rowH * 0.45);
  const rowX = innerX + Math.round(innerW * 0.1);
  const rowMaxW = Math.round(innerW * 0.78);
  const rows = [
    { y: innerY + rowGap, w: Math.round(rowMaxW * 0.85), color: BRAND, alpha: 0.22 },
    { y: innerY + rowGap + (rowH + rowGap), w: Math.round(rowMaxW * 0.62), color: LENA, alpha: 0.9 },
    { y: innerY + rowGap + 2 * (rowH + rowGap), w: Math.round(rowMaxW * 0.75), color: DENA, alpha: 0.9 },
    { y: innerY + rowGap + 3 * (rowH + rowGap), w: Math.round(rowMaxW * 0.5), color: BRAND, alpha: 0.22 },
    { y: innerY + rowGap + 4 * (rowH + rowGap), w: Math.round(rowMaxW * 0.7), color: BRAND, alpha: 0.22 },
  ];
  const spineW = Math.round(innerW * 0.04);

  function insideRoundedRect(x, y, rx, ry, rw, rh, rr) {
    if (x < rx || y < ry || x >= rx + rw || y >= ry + rh) return false;
    const dx = Math.max(rx + rr - x, x - (rx + rw - 1 - rr), 0);
    const dy = Math.max(ry + rr - y, y - (ry + rh - 1 - rr), 0);
    return dx * dx + dy * dy <= rr * rr;
  }

  function blend(base, color, alpha) {
    return [
      Math.round(base[0] * (1 - alpha) + color[0] * alpha),
      Math.round(base[1] * (1 - alpha) + color[1] * alpha),
      Math.round(base[2] * (1 - alpha) + color[2] * alpha),
    ];
  }

  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter byte
    for (let x = 0; x < W; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      if (insideRoundedRect(x, y, 0, 0, W, H, radius)) {
        [r, g, b] = BRAND;
        a = 255;
        if (insideRoundedRect(x, y, innerX, innerY, innerW, innerH, innerR)) {
          [r, g, b] = WHITE;
          // Brand spine on the left edge of the ledger card
          if (x < innerX + spineW) [r, g, b] = BRAND;
          for (const row of rows) {
            if (
              y >= row.y &&
              y < row.y + rowH &&
              x >= rowX &&
              x < rowX + row.w
            ) {
              [r, g, b] = blend([r, g, b], row.color, row.alpha);
              break;
            }
          }
        }
      }
      const idx = y * (1 + W * 4) + 1 + x * 4;
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const out = resolve(publicDir, `icon-${size}.png`);
  writeFileSync(out, buildPng(size));
  // eslint-disable-next-line no-console
  console.log(`Wrote ${out}`);
}
