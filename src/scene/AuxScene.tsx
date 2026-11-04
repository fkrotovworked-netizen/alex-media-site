import { useEffect, useRef, type RefObject } from 'react';
import { frame, type MotionValue } from 'motion/react';
import { useStage } from '../motion/stage';
import { clamp01, easeInOut, lerp, settle } from '../motion/tokens';
import { SceneRenderer, type FrameState, type GlassState, type Rect } from './renderer';
import { createPacer, firm, FORM_SRC, loadTextures, scaleRect, solidGlass } from './shared';
import './scene.css';

/** Where a secondary scene puts the form and its one piece of glass, in CSS pixels of its root. */
export interface Composition {
  form: Rect;
  glass: Rect;
  /** Height the graphite field is laid out against (the root minus any tail). */
  fieldH: number;
  /** The glass at rest; the scene adds the entrance to it. */
  material: (rect: Rect) => GlassState;
}

export type Compose = (root: HTMLElement, formAspect: number) => Composition | null;

interface AuxSceneProps {
  rootRef: RefObject<HTMLElement | null>;
  /** Seconds since the section arrived; the same timeline as the page intro. */
  time: MotionValue<number>;
  compose: Compose;
  stillClassName?: string;
}

/**
 * A scene of its own outside the opening stage: its own canvas and renderer, the
 * same shader, lit by the same light and camera. The light comes on as `time` runs.
 * It is drawn only while its root is near the screen.
 */
export const AuxScene = ({ rootRef, time, compose, stillClassName = '' }: AuxSceneProps) => {
  const stage = useStage();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || !stage.gl) return;

    let renderer: SceneRenderer;
    try {
      renderer = new SceneRenderer(canvas);
    } catch (error) {
      console.error(error);
      root.dataset.gl = 'off';
      return;
    }

    let disposed = false;
    let near = false;
    let aspect = 1644 / 831;
    let L: (Composition & { w: number; viewH: number; top: number }) | null = null;
    const solid = solidGlass();

    const measure = () => {
      const next = compose(root, aspect);
      if (!next) return;
      const w = root.offsetWidth;
      L = { ...next, w, viewH: window.innerHeight, top: root.getBoundingClientRect().top + window.scrollY };
      renderer.resize(w, root.offsetHeight);
    };

    let pace: ((now: number) => void) | null = null;

    const draw = () => {
      if (disposed || !near || !L || !renderer.ready) return;
      pace?.(performance.now());

      const t = time.get();
      const camX = stage.cam.x.get();
      const camY = stage.cam.y.get();
      const viewTop = stage.scrollY.get() - L.top;
      const appear = settle(t - 1.05, 0.6);

      const glass = L.material(scaleRect({ ...L.glass, x: L.glass.x + camX * 5, y: L.glass.y + camY * 3 }, lerp(0.9, 1, appear)));
      glass.opacity *= appear;
      glass.blur += (1 - appear) * 3; // materialise: blur and scale arrive together

      const state: FrameState = {
        heroH: L.fieldH,
        seamTop: 260,
        form: { x: L.form.x - camX * 18, y: L.form.y - camY * 10, w: L.form.w, h: L.form.h },
        light: { x: stage.light.x.get() * L.w, y: viewTop + stage.light.y.get() * L.viewH },
        lightI: settle(t - 0.15, 1.1),
        lime: settle(t - 0.75, 0.9),
        sweep: lerp(-0.5, 1.8, easeInOut(clamp01((t - 0.3) / 1.6))),
        glass: [firm(glass, solid.matches), { ...glass, opacity: 0 }]
      };
      renderer.draw(state, viewTop, L.viewH);
    };

    const schedule = () => frame.render(draw);
    pace = createPacer(renderer, schedule);

    const sources = [time, stage.scrollY, stage.light.x, stage.light.y, stage.cam.x, stage.cam.y];
    const stops = sources.map((value) => value.on('change', schedule));

    const remeasure = () => {
      measure();
      schedule();
    };
    const resizes = new ResizeObserver(remeasure);
    resizes.observe(root);
    // the section moves when anything above it changes height
    resizes.observe(document.body);
    window.addEventListener('resize', remeasure);
    solid.addEventListener('change', schedule);

    const watcher = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        if (near) schedule();
      },
      { rootMargin: '60% 0px' }
    );
    watcher.observe(root);

    const lost = (event: Event) => event.preventDefault();
    canvas.addEventListener('webglcontextlost', lost);

    loadTextures()
      .then(([form, bevel]) => {
        if (disposed) return;
        aspect = form.naturalWidth / form.naturalHeight;
        renderer.setTextures(form, bevel);
        measure();
        root.dataset.ready = 'true';
        schedule();
      })
      .catch((error) => {
        console.error(error);
        root.dataset.gl = 'off';
      });

    return () => {
      disposed = true;
      stops.forEach((stop) => stop());
      resizes.disconnect();
      watcher.disconnect();
      window.removeEventListener('resize', remeasure);
      solid.removeEventListener('change', schedule);
      canvas.removeEventListener('webglcontextlost', lost);
      renderer.dispose();
    };
  }, [stage, rootRef, time, compose]);

  if (!stage.gl) return <img className={`scene-still ${stillClassName}`.trim()} src={FORM_SRC} alt="" aria-hidden="true" />;
  return <canvas ref={canvasRef} className="scene" aria-hidden="true" />;
};
