// Cuts the acrylic form out of the brand logo and derives the maps the scene needs.
// Run with `npm run assets` whenever the source logo changes.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'Логотип и айдентика.jpg'); // PNG with alpha despite the extension
const OUT = path.join(root, 'public', 'brand');

const WORDMARK_TOP = 750; // rows below this hold the wordmark, which is near-black and unused here
const PAD = 64; // transparent margin so blurred mips and the bevel never clip at the texture edge

/** Three box passes approximate a gaussian of the given sigma. */
function blur(src, w, h, sigma) {
  const radius = Math.max(1, Math.round(Math.sqrt((12 * sigma * sigma) / 3 + 1) / 2));
  let a = Float32Array.from(src);
  let b = new Float32Array(a.length);
  const pass = (from, to, horizontal) => {
    const outer = horizontal ? h : w;
    const inner = horizontal ? w : h;
    const step = horizontal ? 1 : w;
    for (let o = 0; o < outer; o++) {
      const base = horizontal ? o * w : o;
      let sum = 0;
      for (let i = -radius; i <= radius; i++) sum += from[base + Math.min(inner - 1, Math.max(0, i)) * step];
      for (let i = 0; i < inner; i++) {
        to[base + i * step] = sum / (radius * 2 + 1);
        const add = Math.min(inner - 1, i + radius + 1);
        const drop = Math.max(0, i - radius);
        sum += from[base + add * step] - from[base + drop * step];
      }
    }
  };
  for (let n = 0; n < 3; n++) {
    pass(a, b, true);
    pass(b, a, false);
  }
  return a;
}

await mkdir(OUT, { recursive: true });

const source = sharp(SOURCE).ensureAlpha();
const meta = await source.metadata();

// 1. The form: drop the wordmark rows, trim to the alpha box, add a margin.
//    sharp reorders operations inside one pipeline, so each step gets its own.
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const upper = await source.clone().extract({ left: 0, top: 0, width: meta.width, height: WORDMARK_TOP }).png().toBuffer();
const trimmed = await sharp(upper).trim({ background: clear, threshold: 4 }).png().toBuffer();
const cropped = await sharp(trimmed).extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: clear }).png().toBuffer();

const form = sharp(cropped);
const { width: W, height: H } = await form.metadata();
await form.clone().webp({ quality: 93, alphaQuality: 100, effort: 6 }).toFile(path.join(OUT, 'form.webp'));

// 2. Bevel map: the silhouette inflated into a soft height field, stored as normals.
//    R,G = surface tilt, B = height. Lets the scene light the rim of a flat render.
const nw = Math.round(W / 2);
const nh = Math.round(H / 2);
const alpha = await form.clone().resize(nw, nh).extractChannel('alpha').raw().toBuffer();
const a = Float32Array.from(alpha, (v) => v / 255);
const tight = blur(a, nw, nh, 5);
const broad = blur(a, nw, nh, 20);
const height = new Float32Array(nw * nh);
for (let i = 0; i < height.length; i++) height[i] = 0.4 * tight[i] + 0.6 * broad[i];

const TILT = 26;
const normals = Buffer.alloc(nw * nh * 3);
for (let y = 0; y < nh; y++) {
  for (let x = 0; x < nw; x++) {
    const i = y * nw + x;
    const l = height[y * nw + Math.max(0, x - 1)];
    const r = height[y * nw + Math.min(nw - 1, x + 1)];
    const u = height[Math.max(0, y - 1) * nw + x];
    const d = height[Math.min(nh - 1, y + 1) * nw + x];
    let nx = -(r - l) * TILT;
    let ny = -(d - u) * TILT;
    const len = Math.hypot(nx, ny, 1);
    nx /= len;
    ny /= len;
    normals[i * 3] = Math.round((nx * 0.5 + 0.5) * 255);
    normals[i * 3 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    normals[i * 3 + 2] = Math.round(Math.min(1, height[i]) * 255);
  }
}
await sharp(normals, { raw: { width: nw, height: nh, channels: 3 } })
  .webp({ lossless: true, effort: 6 })
  .toFile(path.join(OUT, 'form-bevel.webp'));

// 3. Small mark for the navigation and the tab icon.
await sharp(trimmed).resize({ width: 240 }).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT, 'mark.webp'));
const icon = await sharp(trimmed).resize({ width: 56, height: 56, fit: 'contain', background: clear }).png().toBuffer();
await sharp(icon).extend({ top: 4, bottom: 4, left: 4, right: 4, background: clear }).png().toFile(path.join(root, 'public', 'favicon.png'));

// 4. Grain tile for the sections that are plain CSS: breaks up banding in dark gradients.
const TILE = 256;
let seed = 0x9e3779b9;
const random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const grain = Buffer.alloc(TILE * TILE * 4);
for (let i = 0; i < TILE * TILE; i++) {
  const v = random() - 0.5;
  const tone = v > 0 ? 255 : 0;
  grain[i * 4] = grain[i * 4 + 1] = grain[i * 4 + 2] = tone;
  grain[i * 4 + 3] = Math.round(Math.abs(v) * 2 * 13);
}
await sharp(grain, { raw: { width: TILE, height: TILE, channels: 4 } }).png().toFile(path.join(OUT, 'grain.png'));

console.log(`form.webp ${W}×${H} (aspect ${(W / H).toFixed(3)}), bevel ${nw}×${nh}`);
