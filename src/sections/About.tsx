import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import '@fontsource-variable/oswald/wght.css';
import { SectionHead } from '../components/SectionHead';
import { asset } from '../asset';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { clamp01 } from '../motion/tokens';
import './About.css';

const q = content.about.quote;

/* ——— the founder's word, as a manifesto (Рома's pick of three concepts, 2026-11-12) ———
   The core of the quote in huge condensed capitals (Oswald), three lines drifting sideways in turn as they
   pass through the screen and filling in from an outline as they reach the middle, the last one in lime light;
   the full quote small under it, beside the photo. Reduced motion: the lines stand still, filled. */

const ManifestLine = ({ text, index, progress, lit }: { text: string; index: number; progress: MotionValue<number>; lit: boolean }) => {
  const { reduced } = useStage();
  const dir = index % 2 === 0 ? 1 : -1;
  // drifts across as the line passes through the screen; the ink fills in as it reaches the middle
  const x = useTransform(progress, (p) => `${(dir * (0.5 - p) * 26).toFixed(2)}vw`);
  const fill = useTransform(progress, (p) => clamp01((p - 0.22 - index * 0.06) / 0.22));
  const clipPath = useTransform(fill, (f) => `inset(-0.3em ${((1 - f) * 100).toFixed(1)}% -0.3em 0)`);
  return (
    <motion.p className={`manifest__line${lit ? ' manifest__line--lit' : ''}`} style={reduced ? undefined : { x }}>
      <span className="manifest__outline">{text}</span>
      <motion.span className="manifest__ink" style={reduced ? undefined : { clipPath }} aria-hidden="true">
        {text}
      </motion.span>
    </motion.p>
  );
};

const Manifest = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const tail = useReveal<HTMLDivElement>({ duration: 1.2 });
  const tailY = useTransform(tail.progress, (p) => (1 - clamp01(p)) * 20);
  return (
    <figure className="founder manifest">
      <div ref={ref} className="manifest__lines" aria-hidden="true">
        {q.manifesto.map((line, i) => (
          <ManifestLine key={line} text={line} index={i} progress={scrollYProgress} lit={i === q.manifesto.length - 1} />
        ))}
      </div>
      <motion.div ref={tail.ref} className="manifest__tail wrap" style={{ opacity: tail.progress, y: tailY }}>
        <img className="manifest__photo" src={asset(q.photo)} alt="" width={72} height={72} loading="lazy" decoding="async" />
        <blockquote className="manifest__quote">«{q.text}»</blockquote>
        <figcaption className="manifest__who">
          {q.name}
          <span>{q.role}</span>
        </figcaption>
      </motion.div>
    </figure>
  );
};

/** Four reasons on one sheet of acrylic beside the heading; the founder's word closes the section. */
export const About = () => {
  const { label, title, reasons } = content.about;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const sheet = useReveal<HTMLUListElement>({ duration: 1.2, to: 1.2 });

  return (
    <section className="about block" id="about">
      <div className="about__grid wrap">
        <div ref={head.ref} className="about__left">
          <SectionHead label={label} title={title} progress={head.progress} />
        </div>

        <ul ref={sheet.ref} className="reasons acrylic">
          {reasons.map((reason, i) => (
            <Reason key={reason.title} index={i} title={reason.title} text={reason.text} time={sheet.progress} />
          ))}
        </ul>
      </div>
      <Manifest />
    </section>
  );
};

const Reason = ({ index, title, text, time }: { index: number; title: string; text: string; time: ReturnType<typeof useReveal>['progress'] }) => {
  const at = index * 0.12;
  const opacity = useTransform(time, (t) => clamp01((t - at) / 0.5));
  const y = useTransform(opacity, (v) => (1 - v) * 12);
  return (
    <motion.li className="reason" style={{ opacity, y }}>
      <span className="reason__num">{String(index + 1).padStart(2, '0')}</span>
      <h3 className="reason__title">{title}</h3>
      <p className="reason__text">{text}</p>
    </motion.li>
  );
};
