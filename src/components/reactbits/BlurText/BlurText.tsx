// From React Bits (reactbits.dev) — BlurText, adapted for Alex Media.
// Kept: words resolve from blur to sharp, one after another.
// Changed: instead of its own in-view trigger and keyframes, the text follows a
// progress MotionValue (0–1). The page timeline and the scroll morph drive it, so
// it can be scrubbed, reversed and frozen with everything else. Travel and blur
// are smaller: the text materialises, it does not fly in.
import { motion, useTransform, type MotionValue } from 'motion/react';
import type { ElementType } from 'react';

interface BlurTextProps {
  text: string;
  progress: MotionValue<number>;
  as?: ElementType;
  className?: string;
  /** Share of the progress each next word waits. */
  stagger?: number;
  blur?: number;
  rise?: number;
}

interface WordProps {
  word: string;
  from: number;
  span: number;
  progress: MotionValue<number>;
  blur: number;
  rise: number;
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

const Word = ({ word, from, span, progress, blur, rise }: WordProps) => {
  const local = useTransform(progress, (p) => ease(Math.min(1, Math.max(0, (p - from) / span))));
  const opacity = local;
  const y = useTransform(local, (v) => (1 - v) * rise);
  const filter = useTransform(local, (v) => (v > 0.995 ? 'none' : `blur(${((1 - v) * blur).toFixed(2)}px)`));

  return (
    <motion.span style={{ display: 'inline-block', opacity, y, filter }}>
      {word}
    </motion.span>
  );
};

const BlurText = ({ text, progress, as: Tag = 'p', className, stagger = 0.045, blur = 7, rise = 10 }: BlurTextProps) => {
  const words = text.split(' ');
  const span = Math.max(0.2, 1 - (words.length - 1) * stagger);

  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <span key={i}>
          <Word word={word} from={i * stagger} span={span} progress={progress} blur={blur} rise={rise} />
          {i < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </Tag>
  );
};

export default BlurText;
