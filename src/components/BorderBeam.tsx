// BorderBeam (Рома прислал, shadcn/Magic UI), adapted for Alex Media.
// Kept: a gradient band clipped to a thin ring by a mask, turning around the edge.
// Changed: no Tailwind, cn() or injected <style>. The original turned the gradient's angle
// (a CSS variable), which repaints the band every frame; here the ring's mask stays still and
// a square carrying the band is rotated with `transform` — Motion hands that to WAAPI, so the
// turn runs on the compositor at full frame rate. It turns only while `active`, and the band
// exists only from the moment it lights until it has faded out: a dozen idle squares, each its
// own GPU layer wider than its cell, weighed on the whole page.
// The band is the lime ramp of the logo — deep olive tail into a bright head — not one flat green.
// Reduced motion: the ring appears, still, with its head toward the key light.
import { animate, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useStage } from '../motion/stage';
import './BorderBeam.css';

interface BorderBeamProps {
  active: boolean;
  /** seconds per turn */
  duration?: number;
  borderWidth?: number;
}

// --light-angle is 300deg; the band's head faces the key light at this turn.
const REST = 210;

export const BorderBeam = ({ active, duration = 6, borderWidth = 1.5 }: BorderBeamProps) => {
  const { reduced } = useStage();
  const band = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (active) setShown(true);
  }, [active]);

  useEffect(() => {
    const el = band.current;
    if (!el || !active || reduced) return;
    const run = animate(
      el,
      { transform: [`rotate(${REST}deg)`, `rotate(${REST + 360}deg)`] },
      { duration, ease: 'linear', repeat: Infinity }
    );
    return () => run.stop();
  }, [active, shown, reduced, duration]);

  return (
    <motion.span
      aria-hidden
      className="border-beam"
      initial={false}
      animate={{ opacity: active ? 1 : 0 }}
      transition={{ duration: active ? 0.24 : 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      onAnimationComplete={() => !active && setShown(false)}
      style={{ '--beam-width': `${borderWidth}px` } as never}
    >
      {shown ? <span ref={band} className="border-beam__band" style={{ transform: `rotate(${REST}deg)` }} /> : null}
    </motion.span>
  );
};
