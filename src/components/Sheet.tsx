import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useScroll, useSpring, useTransform, type MotionStyle } from 'motion/react';
import { useStage } from '../motion/stage';
import { lerp, smoother, springs, toMotion } from '../motion/tokens';

type Tone = 'light' | 'lime';

interface SheetProps {
  tone?: Tone;
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A light section is not a slide that replaces the dark one: it is a sheet laid on
 * the graphite. It comes in as an object — inset, with rounded corners, lit on its
 * upper rim and casting a shadow — and opens to the full width as it takes the screen.
 * On the way out it lifts off the same way, and the graphite shows round it again.
 *
 * Only the plate behind the content moves; the content itself never reflows.
 */
export const Sheet = ({ tone = 'light', id, className = '', children }: SheetProps) => {
  const { reduced } = useStage();
  const ref = useRef<HTMLElement>(null);

  // 0 → 1 while the top edge rises from the fold to the top of the screen…
  const { scrollYProgress: enter } = useScroll({ target: ref, offset: ['start end', 'start 0.08'] });
  // …and 0 → 1 while the bottom edge rises from the fold and leaves.
  // A sheet shorter than the screen never opens fully: it stays an object on the graphite.
  const { scrollYProgress: leave } = useScroll({ target: ref, offset: ['end 0.92', 'end start'] });

  const top = useSpring(enter, toMotion(springs.follow));
  const bottom = useSpring(leave, toMotion(springs.follow));

  // opened mid-page (a reload, an anchor): the sheet is already where the scroll puts it
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      top.jump(enter.get());
      bottom.jump(leave.get());
    });
    return () => cancelAnimationFrame(id);
  }, [top, bottom, enter, leave]);

  // The plate itself never changes size: it is painted once, on its own layer, and the
  // opening is a clip on top of it. Animating left/right/radius instead repainted a plate
  // the size of the section — grain, gradients and all — on every frame, and Safari
  // could not keep up. The clip is the same rounded inset that left/right/radius drew.
  const clip = useTransform(() => {
    const t = top.get();
    const b = bottom.get();
    const open = smoother(Math.min(t, 1 - b));
    const side = `calc(var(--sheet-inset) * ${(1 - open).toFixed(4)})`;
    const rt = `calc(var(--sheet-radius) * ${(1 - t * t).toFixed(4)})`;
    const rb = `calc(var(--sheet-radius) * ${Math.sqrt(b).toFixed(4)})`;
    return `inset(0 ${side} round ${rt} ${rt} ${rb} ${rb})`;
  });
  // the shadow it casts is longest while it is still in the air; it is a layer of its own,
  // so only its opacity changes
  const lift = useTransform(() => lerp(1, 0.35, smoother(Math.min(top.get(), 1 - bottom.get()))));

  return (
    <section ref={ref} id={id} className={`sheet sheet--${tone} tone-${tone} ${className}`.trim()} data-tone={tone}>
      <motion.div className="sheet__shadow" aria-hidden="true" style={reduced ? undefined : { opacity: lift }} />
      <motion.div
        className="sheet__plate"
        aria-hidden="true"
        style={reduced ? undefined : ({ clipPath: clip, WebkitClipPath: clip } as MotionStyle)}
      />
      <div className="sheet__body">{children}</div>
    </section>
  );
};
