import type { CSSProperties } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { asset } from '../asset';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { clamp01 } from '../motion/tokens';
import './Trust.css';

type Logo = (typeof content.trust.logos)[number];

const Mark = ({ logo, index, time }: { logo: Logo; index: number; time: MotionValue<number> }) => {
  const opacity = useTransform(time, (t) => clamp01((t - 0.1 - index * 0.06) / 0.5));
  const width = Math.round((logo.w / 128) * logo.h);
  return (
    <motion.li className="trust__logo" style={{ opacity }}>
      <img style={{ '--h': `${logo.h}px` } as CSSProperties} src={asset(logo.src)} alt={logo.name} width={width} height={logo.h} loading="lazy" decoding="async" />
    </motion.li>
  );
};

/** A low strip on the graphite between the figures and the services: the clients, one ink, no colours. */
export const Trust = () => {
  const { label, logos } = content.trust;
  const strip = useReveal<HTMLDivElement>({ duration: 1.2 });

  return (
    <section className="trust" aria-label={label}>
      <div ref={strip.ref} className="wrap trust__row">
        <p className="eyebrow trust__label">{label}</p>
        <ul className="trust__logos">
          {logos.map((logo, i) => (
            <Mark key={logo.src} logo={logo} index={i} time={strip.progress} />
          ))}
        </ul>
      </div>
    </section>
  );
};
