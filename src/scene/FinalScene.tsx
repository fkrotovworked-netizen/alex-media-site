import type { RefObject } from 'react';
import type { MotionValue } from 'motion/react';
import { AuxScene, type Compose } from './AuxScene';
import { offsetRect } from './layout';
import type { GlassState, Rect } from './renderer';

/** Pixels below the fold of the closing screen in which the form sinks into the graphite. */
export const FINAL_TAIL = 220;

/** The glass that holds the field: a capsule thick enough to keep a line of text readable. */
const fieldGlass = (rect: Rect): GlassState => ({
  rect,
  radius: rect.h / 2,
  bezel: rect.h * 0.31,
  refraction: 20,
  dispersion: 0.07,
  blur: 3.1,
  dim: 0.74,
  saturation: 1.38,
  opacity: 1,
  shadowOffset: 10,
  shadowBlur: 30,
  shadowAlpha: 0.4,
  sheen: 0.045
});

const compose: Compose = (root, aspect) => {
  const fieldEl = root.querySelector<HTMLElement>('[data-scene="field"]');
  const copyEl = root.querySelector<HTMLElement>('[data-scene="final-copy"]');
  if (!fieldEl || !copyEl) return null;
  const w = root.offsetWidth;
  const fieldH = root.offsetHeight - FINAL_TAIL;
  const narrow = w < 760;
  const field = offsetRect(fieldEl, root);
  const copy = offsetRect(copyEl, root);

  // The same landscape as in the hero, leaning the other way: this is the way out.
  const formW = Math.min(w * (narrow ? 2.05 : 1.32), 2600);
  const formH = formW / aspect;
  const formX = (w - formW) / 2 - (narrow ? 0 : w * 0.05);
  const formY = Math.max(copy.y + copy.h + formH * 0.03, fieldH * 0.4, field.y + field.h / 2 - formH * 0.76);

  return { form: { x: formX, y: formY, w: formW, h: formH }, glass: field, fieldH, material: fieldGlass };
};

/** The closing scene: the form comes back and the light comes on again as the section enters the screen. */
export const FinalScene = ({ rootRef, time }: { rootRef: RefObject<HTMLElement | null>; time: MotionValue<number> }) => (
  <AuxScene rootRef={rootRef} time={time} compose={compose} stillClassName="scene-still--final" />
);
