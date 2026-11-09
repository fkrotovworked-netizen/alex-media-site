import { useEffect, useRef, type RefObject } from 'react';
import { frame } from 'motion/react';
import { debug } from '../debug';
import { useStage } from '../motion/stage';
import { clamp01, easeInOut, lerp, settle } from '../motion/tokens';
import { measureLayout } from './layout';
import { SceneRenderer, type FrameState, type GlassState, type Rect } from './renderer';
import { createPacer, firm, FORM_SRC, loadTextures, paneGlass, scaleRect, solidGlass } from './shared';
import './scene.css';

/** The live scene behind the first screen: one canvas in page space. */
export const Scene = ({ stageRef }: { stageRef: RefObject<HTMLDivElement | null> }) => {
  const stage = useStage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = stageRef.current;
    const canvas = canvasRef.current;
    if (!root) return;

    let disposed = false;
    let renderer: SceneRenderer | null = null;
    const solid = solidGlass();
    let aspect = 1644 / 831;
    let stageTop = 0;

    if (canvas && stage.gl) {
      try {
        renderer = new SceneRenderer(canvas);
      } catch (error) {
        console.error(error);
        root.dataset.gl = 'off';
      }
    }

    const measure = () => {
      const next = measureLayout(root, aspect);
      if (!next) return;
      stageTop = root.getBoundingClientRect().top + window.scrollY;
      renderer?.resize(next.stageW, next.stageH);
      stage.setLayout(next);
    };

    let pace: ((now: number) => void) | null = null;
    let lastAngle = '';

    const draw = () => {
      const L = stage.layout.current;
      if (disposed || !L.ready) return;

      const t = stage.intro.get();
      const scroll = stage.scrollY.get();
      const camX = stage.cam.x.get();
      const camY = stage.cam.y.get();
      const lx = stage.light.x.get();
      const ly = stage.light.y.get();

      // Small controls share one light direction, as under a distant key light.
      // A custom property on the root restyles the whole page — written every frame while the light
      // followed the cursor, that recalc took most of each frame (Safari dropped the price folders to
      // ~20 fps). So the angle moves in 4° steps: a 1px rim shows no step, and a sweep of the cursor
      // now costs a dozen recalcs instead of one per frame.
      const raw = (Math.atan2((ly - 0.5) * L.viewH, (lx - 0.5) * L.stageW) * 180) / Math.PI + 90;
      const angle = `${Math.round(raw / 4) * 4}deg`;
      if (angle !== lastAngle) {
        lastAngle = angle;
        document.documentElement.style.setProperty('--light-angle', angle);
      }

      if (!renderer?.ready) return;

      const viewTop = scroll - stageTop;
      // once the stage has left the screen there is nothing to draw, and nothing to pace
      if (viewTop > L.stageH + L.viewH) return;
      pace?.(performance.now());
      const appear = stage.still ? 1 : settle(t - 1.05, 0.6);

      // the form stands behind the glass, so it moves more than the pane does,
      // and it sinks a little slower than the page as the screen scrolls away
      const form: Rect = {
        x: L.formX - camX * 18,
        y: L.formY + (stage.still ? 0 : scroll * 0.14) - camY * 10,
        w: L.formW,
        h: L.formH
      };

      const pane = paneGlass(scaleRect(L.pane, lerp(0.94, 1, appear)), L.paneRadius, appear);
      pane.blur += (1 - appear) * 3; // materialise: blur and scale arrive together
      const glass: [GlassState, GlassState] = [firm(pane, solid.matches), { ...pane, opacity: 0 }];

      const state: FrameState = {
        heroH: L.heroH,
        form,
        light: { x: lx * L.stageW, y: viewTop + ly * L.viewH },
        lightI: settle(t - 0.15, 1.1),
        lime: settle(t - 0.75, 0.9),
        sweep: lerp(-0.5, 1.8, easeInOut(clamp01((t - 0.3) / 1.6))),
        glass
      };
      renderer.draw(state, viewTop, L.viewH);
    };

    const schedule = () => frame.render(draw);
    if (renderer) pace = createPacer(renderer, schedule, meterRef.current);

    const sources = [stage.intro, stage.scrollY, stage.light.x, stage.light.y, stage.cam.x, stage.cam.y, stage.layoutVersion];
    const stops = sources.map((value) => value.on('change', schedule));

    const observer = new ResizeObserver(() => {
      measure();
      schedule();
    });
    observer.observe(root);
    const onResize = () => {
      measure();
      schedule();
    };
    window.addEventListener('resize', onResize);

    solid.addEventListener('change', schedule);

    const lost = (event: Event) => event.preventDefault();
    canvas?.addEventListener('webglcontextlost', lost);

    const textures = renderer ? loadTextures() : Promise.resolve(null);
    Promise.all([textures, document.fonts.ready])
      .then(([images]) => {
        if (disposed) return;
        if (images && renderer) {
          aspect = images[0].naturalWidth / images[0].naturalHeight;
          renderer.setTextures(images[0], images[1]);
        }
        measure();
        root.dataset.ready = 'true';
        stage.begin();
        schedule();
      })
      .catch((error) => {
        console.error(error);
        root.dataset.gl = 'off';
        root.dataset.ready = 'true';
        measure();
        stage.begin();
      });

    return () => {
      disposed = true;
      stops.forEach((stop) => stop());
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      solid.removeEventListener('change', schedule);
      canvas?.removeEventListener('webglcontextlost', lost);
      renderer?.dispose();
    };
  }, [stage, stageRef]);

  if (!stage.gl) return <img className="scene-still" src={FORM_SRC} alt="" aria-hidden="true" />;

  return (
    <>
      <canvas ref={canvasRef} className="scene" aria-hidden="true" />
      {debug.fps ? <div ref={meterRef} className="scene-meter" /> : null}
    </>
  );
};
