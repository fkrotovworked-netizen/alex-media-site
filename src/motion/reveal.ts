import { useEffect, useRef } from 'react';
import { animate, useInView, useMotionValue, type MotionValue } from 'motion/react';
import { useStage } from './stage';

interface RevealOptions {
  /** Seconds the progress takes to run from 0 to `to`. */
  duration?: number;
  /** Where the progress ends; above 1 turns it into a short timeline in seconds. */
  to?: number;
  /** How far into the viewport the element has to be before it starts. */
  margin?: string;
}

/**
 * Drives a progress value 0 → `to` once, when the element comes into view.
 * It is linear on purpose: whatever reads it (BlurText, a message timeline)
 * shapes its own curve, the same way everything on load reads `intro`.
 */
export const useReveal = <T extends HTMLElement = HTMLDivElement>({
  duration = 1.1,
  to = 1,
  margin = '0px 0px -16% 0px'
}: RevealOptions = {}): { ref: React.RefObject<T | null>; progress: MotionValue<number>; inView: boolean } => {
  const { reduced } = useStage();
  const ref = useRef<T>(null);
  const progress = useMotionValue(reduced ? to : 0);
  const inView = useInView(ref, { once: true, margin: margin as never });

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(progress, to, { duration, ease: 'linear' });
    return () => controls.stop();
  }, [inView, reduced, progress, to, duration]);

  return { ref, progress, inView };
};
