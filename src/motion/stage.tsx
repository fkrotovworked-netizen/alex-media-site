import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  animate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue
} from 'motion/react';
import { debug } from '../debug';
import { emptyLayout, type SceneLayout } from '../scene/layout';
import { springs, toMotion } from './tokens';

/** Length of the entrance, in seconds. Everything on load is a function of `intro`. */
export const INTRO_END = 3.2;

/**
 * The values the whole page moves by. The DOM and the shader read the same ones,
 * so a headline, a button rim and the glass all answer to one light and one camera.
 */
export interface Stage {
  /** Seconds since the scene was ready. */
  intro: MotionValue<number>;
  /** Key light, viewport-relative (0–1). */
  light: { x: MotionValue<number>; y: MotionValue<number> };
  /** Camera offset, −1…1. */
  cam: { x: MotionValue<number>; y: MotionValue<number> };
  scrollY: MotionValue<number>;
  layout: { current: SceneLayout };
  /** Bumped whenever `layout` is re-measured. */
  layoutVersion: MotionValue<number>;
  setLayout: (layout: SceneLayout) => void;
  /** Starts the entrance; safe to call more than once. */
  begin: () => void;
  reduced: boolean;
  /** WebGL2 is available, so the scene is drawn live. */
  gl: boolean;
  /** Nothing travels: reduced motion, or no WebGL. */
  still: boolean;
}

const StageContext = createContext<Stage | null>(null);

export const useStage = () => {
  const stage = useContext(StageContext);
  if (!stage) throw new Error('useStage must be used inside <StageProvider>');
  return stage;
};

export const StageProvider = ({ children }: { children: ReactNode }) => {
  const reduced = (useReducedMotion() ?? false) || debug.reducedMotion;
  const [gl] = useState(() => !debug.noGl && !!document.createElement('canvas').getContext('webgl2'));

  const intro = useMotionValue(reduced ? INTRO_END : (debug.t ?? 0));
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const layoutVersion = useMotionValue(0);
  const layout = useRef<SceneLayout>(emptyLayout);
  const { scrollY } = useScroll();

  const lightTargetX = useTransform(pointerX, (v) => 0.28 + v * 0.24);
  const lightTargetY = useTransform(pointerY, (v) => 0.2 + v * 0.15);
  const lightX = useSpring(lightTargetX, toMotion(springs.light));
  const lightY = useSpring(lightTargetY, toMotion(springs.light));

  const camX = useSpring(pointerX, toMotion(springs.camera));
  const camY = useSpring(pointerY, toMotion(springs.camera));

  // The pointer moves the light and the camera — on devices that have one.
  useEffect(() => {
    if (reduced || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      pointerX.set((e.clientX / window.innerWidth) * 2 - 1);
      pointerY.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    const rest = () => {
      pointerX.set(0);
      pointerY.set(0);
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', rest);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', rest);
    };
  }, [reduced, pointerX, pointerY]);

  const started = useRef(false);
  const begin = useCallback(() => {
    if (started.current || reduced || debug.t !== null) return;
    started.current = true;
    animate(intro, INTRO_END, { duration: INTRO_END, ease: 'linear' });
  }, [intro, reduced]);

  const setLayout = useCallback(
    (next: SceneLayout) => {
      layout.current = next;
      layoutVersion.set(layoutVersion.get() + 1);
    },
    [layoutVersion]
  );

  const stage = useMemo<Stage>(
    () => ({
      intro,
      light: { x: lightX, y: lightY },
      cam: { x: camX, y: camY },
      scrollY,
      layout,
      layoutVersion,
      setLayout,
      begin,
      reduced,
      gl,
      still: reduced || !gl
    }),
    [intro, lightX, lightY, camX, camY, scrollY, layoutVersion, setLayout, begin, reduced, gl]
  );

  return <StageContext.Provider value={stage}>{children}</StageContext.Provider>;
};
