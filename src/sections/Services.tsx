import { motion, useTransform } from 'motion/react';
import { useState, type PointerEvent } from 'react';
import { BorderBeam } from '../components/BorderBeam';
import { SectionHead } from '../components/SectionHead';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { clamp01 } from '../motion/tokens';
import './Services.css';

const Arrow = () => (
  <span className="svc__more-arrow" aria-hidden="true">
    →
  </span>
);

/** Lead generation is the heart; everything around it is one sheet of acrylic, scored into cells. */
export const Services = () => {
  const { label, title, lead, main, items, more } = content.services;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const sheet = useReveal<HTMLDivElement>({ duration: 1 });
  const sheetY = useTransform(sheet.progress, (p) => (1 - clamp01(p * 1.4)) * 24);
  // the cell under the mouse (or holding focus) gets a band of light round its edge, as the tariffs do
  const [lit, setLit] = useState<string | null>(null);
  const light = (id: string) => ({
    onPointerEnter: (e: PointerEvent) => e.pointerType === 'mouse' && setLit(id),
    onPointerLeave: () => setLit((v) => (v === id ? null : v)),
    onFocus: () => setLit(id),
    onBlur: () => setLit((v) => (v === id ? null : v))
  });

  return (
    <section className="services block" id="services">
      <div className="wrap">
        <div ref={head.ref}>
          <SectionHead className="head--split" label={label} title={title} lead={lead} progress={head.progress} />
        </div>

        <motion.div ref={sheet.ref} className="svc acrylic" style={{ opacity: sheet.progress, y: sheetY }}>
          <a className="svc__cell svc__cell--main" href={`#price-${main.price}`} {...light('main')}>
            <span className="eyebrow eyebrow--dot">{main.tag}</span>
            <h3 className="svc__title svc__title--main">{main.title}</h3>
            <p className="svc__text">{main.text}</p>
            <span className="svc__more">
              {more} <Arrow />
            </span>
            <BorderBeam active={lit === 'main'} />
          </a>
          {items.map((item) => (
            <a key={item.title} className="svc__cell" href={`#price-${item.price}`} {...light(item.title)}>
              <h3 className="svc__title">{item.title}</h3>
              <p className="svc__text">{item.text}</p>
              <span className="svc__more">
                {more} <Arrow />
              </span>
              <BorderBeam active={lit === item.title} />
            </a>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
