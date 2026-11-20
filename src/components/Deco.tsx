import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionStyle } from 'motion/react';
import { asset } from '../asset';
import { useStage } from '../motion/stage';
import './Deco.css';

/**
 * One of Sanya's glossy lime-and-black pieces (cut from his sticker sheet into public/deco/), laid on the page
 * as an object at some depth: the deeper it lies, the softer its focus and the further it drifts against the
 * scroll. Purely decorative — hidden from reading, never in the way of a click. Placed sparingly, one or two
 * to a section, only where the layout leaves room.
 */
interface DecoProps {
  name: 'wave' | 'cross' | 'drip' | 'sphere' | 'bubble' | 'bubble-lime' | 'hook';
  /** Where and how large: a class from the section's own CSS. */
  className: string;
  /** Drift against the scroll, in px over the piece's pass through the screen; deeper pieces drift more. */
  depth?: number;
  /** Out-of-focus blur, px. */
  blur?: number;
  rotate?: number;
}

export const Deco = ({ name, className, depth = 40, blur = 0, rotate = 0 }: DecoProps) => {
  const { reduced } = useStage();
  const ref = useRef<HTMLImageElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, (p) => (0.5 - p) * depth);
  return (
    <motion.img
      ref={ref}
      className={`deco${blur ? '' : ' deco--sharp'} ${className}`}
      src={asset(`deco/${name}.webp`)}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      draggable={false}
      style={{ y: reduced ? 0 : y, rotate, '--deco-blur': `${blur}px` } as MotionStyle}
    />
  );
};
