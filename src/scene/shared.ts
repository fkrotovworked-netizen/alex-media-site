// What the two scenes (the opening stage and the closing one) have in common.
import { lerp } from '../motion/tokens';
import type { GlassState, Rect, SceneRenderer } from './renderer';
import { asset } from '../asset';

export const FORM_SRC = asset('brand/form.webp');
const BEVEL_SRC = asset('brand/form-bevel.webp');

const load = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });

let textures: Promise<[HTMLImageElement, HTMLImageElement]> | null = null;

/** The brand render and its bevel map; decoded once, however many scenes ask. */
export const loadTextures = () => (textures ??= Promise.all([load(FORM_SRC), load(BEVEL_SRC)]));

export const mixRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t)
});

export const scaleRect = (r: Rect, k: number): Rect => ({
  x: r.x + (r.w * (1 - k)) / 2,
  y: r.y + (r.h * (1 - k)) / 2,
  w: r.w * k,
  h: r.h * k
});

/** The pane behind the portrait: thick glass, so the form reads as light, not as a picture. */
export const paneGlass = (rect: Rect, radius: number, opacity: number): GlassState => ({
  rect,
  radius,
  bezel: 34,
  refraction: 28,
  dispersion: 0.02,
  blur: 4.6,
  dim: 0.56,
  saturation: 1.3,
  opacity,
  shadowOffset: 24,
  shadowBlur: 72,
  shadowAlpha: 0.5,
  sheen: 0.03
});

/** Reduced transparency or more contrast: the glass becomes a solid dark pane. */
export const solidGlass = () => window.matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more)');
export const firm = (glass: GlassState, solid: boolean): GlassState =>
  solid ? { ...glass, dim: 0.97, blur: 5.5, refraction: 0, dispersion: 0 } : glass;

/**
 * Frame pacing: if a scene cannot hold its rate, lower its resolution, not its motion.
 * Call the returned function once per drawn frame; `onDegrade` asks for a redraw.
 */
export const createPacer = (renderer: SceneRenderer, onDegrade: () => void, meter?: HTMLElement | null) => {
  let last = 0;
  let slow = 0;
  let samples = 0;
  return (now: number) => {
    const dt = now - last;
    last = now;
    if (dt > 100) return; // not a continuous run
    samples++;
    if (dt > 26) slow++;
    if (meter) meter.textContent = `${dt.toFixed(1)} ms · ×${renderer.scale.toFixed(2)}`;
    if (samples >= 45) {
      if (slow > 22 && renderer.degrade()) onDegrade();
      slow = 0;
      samples = 0;
    }
  };
};
