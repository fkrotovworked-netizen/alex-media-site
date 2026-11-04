import { motion, useTransform, type MotionValue } from 'motion/react';
import BlurText from './reactbits/BlurText/BlurText';
import { clamp01 } from '../motion/tokens';

interface SectionHeadProps {
  label: string;
  /** The setup, then the claim: the second part is the one that is lit. */
  title: readonly [string, string];
  lead?: string;
  progress: MotionValue<number>;
  className?: string;
}

/** Heading of a section, in the same voice as the slab: mono label, two-tone title, quiet lead. */
export const SectionHead = ({ label, title, lead, progress, className = '' }: SectionHeadProps) => {
  const labelIn = useTransform(progress, (p) => clamp01(p / 0.3));
  const leadIn = useTransform(progress, (p) => clamp01((p - 0.3) / 0.7));

  return (
    <header className={`head ${className}`.trim()}>
      <motion.p className="eyebrow" style={{ opacity: labelIn }}>
        {label}
      </motion.p>
      <h2 className="head__title">
        <BlurText as="span" className="head__quiet" text={title[0]} progress={progress} stagger={0.08} />{' '}
        <BlurText as="span" text={title[1]} progress={progress} stagger={0.2} />
      </h2>
      {lead ? <BlurText className="head__lead" text={lead} progress={leadIn} stagger={0.03} blur={5} rise={8} /> : null}
    </header>
  );
};
