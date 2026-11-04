// Displacement map for a rounded glass surface — inverse lens mapping.
// The interior is identity (nothing bends under the content); only the bezel
// pulls its samples toward the centre, the way a convex rim does.
// The filter scale is measured from the generated field, never guessed.

export interface LensMapOptions {
  width: number;
  height: number;
  radius: number;
  /** Bezel width as a share of the half short side. */
  bezelRatio?: number;
  magnify?: number;
  /** Below 1 the encoding overshoots: the mid-band gains contrast, the extreme rim saturates. */
  spread?: number;
  supersample?: number;
}

export interface LensMap {
  url: string;
  /** `feDisplacementMap` scale, in CSS pixels. */
  scale: number;
}

const cache = new Map<string, LensMap>();

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createLensMap(options: LensMapOptions): LensMap | null {
  const { bezelRatio = 0.62, magnify = 1.15, spread = 0.58, supersample = 2 } = options;
  const w = Math.round(options.width);
  const h = Math.round(options.height);
  if (w < 2 || h < 2) return null;
  const radius = Math.min(options.radius, w / 2, h / 2);

  const key = [w, h, radius, bezelRatio, magnify, spread, supersample].join(':');
  const hit = cache.get(key);
  if (hit) return hit;

  const W = w * supersample;
  const H = h * supersample;
  const bezel = bezelRatio * (Math.min(w, h) / 2);
  const dx = new Float32Array(W * H);
  const dy = new Float32Array(W * H);
  let max = 1e-6;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = (x + 0.5) / supersample - w / 2;
      const py = (y + 0.5) / supersample - h / 2;
      const qx = Math.abs(px) - w / 2 + radius;
      const qy = Math.abs(py) - h / 2 + radius;
      const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
      if (d > 0) continue;

      const pull = smooth(-bezel, 0, d);
      const eased = pull * pull * (3 - 2 * pull);
      // a slight extra curve mid-band, so the rim reads as rounded rather than chamfered
      const amount = (eased * magnify + Math.sin(eased * Math.PI) * 0.06) * bezel;
      // the outermost 2px fade to neutral so the filter never samples outside the element
      const edge = Math.min(1, -d / 2);
      const i = y * W + x;
      dx[i] = (-px / (w / 2)) * amount * edge;
      dy[i] = (-py / (h / 2)) * amount * edge;
      max = Math.max(max, Math.abs(dx[i]), Math.abs(dy[i]));
    }
  }

  const range = max * spread;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const image = ctx.createImageData(W, H);
  for (let i = 0; i < dx.length; i++) {
    image.data[i * 4] = Math.round(Math.min(1, Math.max(0, dx[i] / (2 * range) + 0.5)) * 255);
    image.data[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, dy[i] / (2 * range) + 0.5)) * 255);
    image.data[i * 4 + 2] = 128;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  const map = { url: canvas.toDataURL('image/png'), scale: 2 * range };
  cache.set(key, map);
  return map;
}
