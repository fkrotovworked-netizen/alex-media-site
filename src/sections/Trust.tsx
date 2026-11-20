import type { CSSProperties } from 'react';
import { motion } from 'motion/react';
import { asset } from '../asset';
import { BorderBeam } from '../components/BorderBeam';
import { LogoLoop } from '../components/reactbits/LogoLoop/LogoLoop';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import './Trust.css';

type Logo = (typeof content.trust.logos)[number];

/** One client: the mark in one ink, and over it the brand's own colours, which come up under the pointer. */
const Mark = ({ logo }: { logo: Logo }) => {
  const width = Math.round(logo.ratio * logo.h);
  return (
    <span className="trust__logo" style={{ '--h': `${logo.h}px` } as CSSProperties}>
      <img className="trust__mark" src={asset(logo.src)} alt={logo.name} width={width} height={logo.h} decoding="async" />
      <img
        className="trust__mark trust__mark--color"
        src={asset(logo.color ?? logo.src)}
        alt=""
        aria-hidden="true"
        width={width}
        height={logo.h}
        decoding="async"
      />
    </span>
  );
};

/** The label on a plate of black acrylic, a band of lime light running round its rim: the one moving light on the strip. */
const Label = ({ text }: { text: string }) => (
  <p className="trust__badge acrylic">
    <span className="trust__dot" aria-hidden="true" />
    <span>{text}</span>
    <BorderBeam active duration={5} borderWidth={1.5} />
  </p>
);

/** A low strip on the graphite between the figures and the services: the label, then the clients running past in one ink. */
export const Trust = () => {
  const { label, logos } = content.trust;
  const strip = useReveal<HTMLDivElement>({ duration: 1.2 });

  return (
    <section className="trust" aria-label={label}>
      <motion.div ref={strip.ref} className="wrap trust__row" style={{ opacity: strip.progress }}>
        <Label text={label} />
        <LogoLoop className="trust__loop" items={logos} itemKey={(logo) => logo.src} render={(logo) => <Mark logo={logo} />} />
      </motion.div>
    </section>
  );
};
