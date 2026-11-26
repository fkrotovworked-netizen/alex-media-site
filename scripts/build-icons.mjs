// Tab, home-screen and search icons from the brand logo (the form only, without the wordmark).
// Run with `npm run icons` whenever the source logo changes. The logo file itself is only read.
//   favicon.ico        32 + 16 (PNG inside ICO) — Yandex and old browsers ask for /favicon.ico
//   icon-192/512.png   web manifest; 512 also for Yandex search results (≥120 px, square)
//   apple-touch-icon   180, on graphite — iOS fills transparency with black anyway
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'Логотип и айдентика.jpg'); // PNG with alpha despite the extension
const PUB = path.join(root, 'public');
const WORDMARK_TOP = 750; // same cut as build-assets.mjs
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const graphite = { r: 0x13, g: 0x14, b: 0x15, alpha: 1 };

const source = sharp(SOURCE).ensureAlpha();
const meta = await source.metadata();
const upper = await source.clone().extract({ left: 0, top: 0, width: meta.width, height: WORDMARK_TOP }).png().toBuffer();
const mark = await sharp(upper).trim({ background: clear, threshold: 4 }).png().toBuffer();

/** The mark centred in a square of `size`, taking `fill` of it, on `background`. */
const square = (size, fill, background = clear) => {
  const inner = Math.round(size * fill);
  return sharp(mark)
    .resize({ width: inner, height: inner, fit: 'contain', background: clear })
    .toBuffer()
    .then((buf) =>
      sharp({ create: { width: size, height: size, channels: 4, background } })
        .composite([{ input: buf, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toBuffer()
    );
};

const out = (name, buf) => writeFile(path.join(PUB, name), buf);

const ico16 = await square(16, 0.96);
const ico32 = await square(32, 0.92);
await out('favicon.png', await square(64, 0.875)); // as before: 56 inside 64
await out('icon-192.png', await square(192, 0.8, graphite));
await out('icon-512.png', await square(512, 0.8, graphite));
await out('apple-touch-icon.png', await square(180, 0.76, graphite));

// ICO with PNG entries: 6-byte header, 16-byte directory entry per image, then the data.
const images = [ico16, ico32];
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((img, i) => {
  const size = i === 0 ? 16 : 32;
  const at = 6 + 16 * i;
  header.writeUInt8(size, at);
  header.writeUInt8(size, at + 1);
  header.writeUInt8(0, at + 2);
  header.writeUInt8(0, at + 3);
  header.writeUInt16LE(1, at + 4);
  header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(img.length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += img.length;
});
await out('favicon.ico', Buffer.concat([header, ...images]));
console.log('icons: favicon.ico, favicon.png, icon-192.png, icon-512.png, apple-touch-icon.png');
