import type { Rect } from './renderer';

/** Where things sit on the stage, in CSS pixels from its top-left corner. */
export interface SceneLayout {
  ready: boolean;
  stageW: number;
  stageH: number;
  heroH: number;
  viewH: number;
  /** The glass pane the portrait stands on. */
  pane: Rect;
  paneRadius: number;
  formX: number;
  formW: number;
  formH: number;
  formY: number;
}

const zero: Rect = { x: 0, y: 0, w: 0, h: 0 };

export const emptyLayout: SceneLayout = {
  ready: false,
  stageW: 1,
  stageH: 1,
  heroH: 1,
  viewH: 1,
  pane: zero,
  paneRadius: 32,
  formX: 0,
  formW: 1,
  formH: 1,
  formY: 0
};

/** Layout box relative to `root`, ignoring transforms (those belong to motion, not layout). */
export function offsetRect(el: HTMLElement, root: HTMLElement): Rect {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

export function measureLayout(stage: HTMLElement, formAspect: number): SceneLayout | null {
  const hero = stage.querySelector<HTMLElement>('[data-scene="hero"]');
  const paneEl = stage.querySelector<HTMLElement>('[data-scene="pane"]');
  if (!hero || !paneEl) return null;

  const stageW = stage.offsetWidth;
  const stageH = stage.offsetHeight;
  const heroH = hero.offsetHeight;
  const pane = offsetRect(paneEl, stage);
  // the copy stacks above and below the pane on narrow screens (see Hero.css)
  const narrow = pane.w > stageW * 0.6;

  // The form is no longer the landscape: it stands behind the portrait, wider than
  // the pane so its peaks frame it, and its lime catches the figure from behind.
  const formW = Math.min(pane.w * (narrow ? 1.45 : 2.15), stageW * (narrow ? 2 : 1.25), 2400);
  const formH = formW / formAspect;
  const formX = pane.x + pane.w / 2 - formW * 0.5;
  // on a phone the copy sits right under the pane, so the form has to stay inside it
  const formY = pane.y + pane.h * (narrow ? 0.06 : 0.12);

  return {
    ready: true,
    stageW,
    stageH,
    heroH,
    viewH: window.innerHeight,
    pane,
    paneRadius: parseFloat(getComputedStyle(paneEl).borderTopLeftRadius) || 32,
    formX,
    formW,
    formH,
    formY
  };
}
