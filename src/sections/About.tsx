import { motion, useTransform } from 'motion/react';
import { SectionHead } from '../components/SectionHead';
import { asset } from '../asset';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { clamp01 } from '../motion/tokens';
import './About.css';

/** Four reasons on one sheet of acrylic, and the founder's word beside them — the second meeting with him. */
export const About = () => {
  const { label, title, reasons, quote } = content.about;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const quoteIn = useTransform(head.progress, (p) => clamp01((p - 0.45) / 0.55));
  const sheet = useReveal<HTMLUListElement>({ duration: 1.2, to: 1.2 });

  return (
    <section className="about block" id="about">
      <div className="about__grid wrap">
        <div ref={head.ref} className="about__left">
          <SectionHead label={label} title={title} progress={head.progress} />

          <motion.figure className="quote" style={{ opacity: quoteIn }}>
            <img className="quote__photo" src={asset(quote.photo)} alt="" width={168} height={168} loading="lazy" decoding="async" />
            <blockquote className="quote__text">
              <p>«{quote.text}»</p>
            </blockquote>
            <figcaption className="quote__who">
              {quote.name} <span>— {quote.role}</span>
            </figcaption>
          </motion.figure>
        </div>

        <ul ref={sheet.ref} className="reasons acrylic">
          {reasons.map((reason, i) => (
            <Reason key={reason.title} index={i} title={reason.title} text={reason.text} time={sheet.progress} />
          ))}
        </ul>
      </div>
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
