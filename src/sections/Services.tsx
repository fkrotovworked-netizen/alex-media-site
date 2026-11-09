import { AnimatePresence, motion, useTransform, type MotionValue } from 'motion/react';
import { useState, type PointerEvent, type ReactNode } from 'react';
import { BorderBeam } from '../components/BorderBeam';
import { SectionHead } from '../components/SectionHead';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { clamp01, springs, toMotion } from '../motion/tokens';
import './Services.css';

// Item 3 of Рома's list: the services hold a lot of text, and none of it is to be cut.
// So only the names stand in view, and one description at a time is shown — on a large
// acrylic panel beside the list (desktop), or unfolded under its name (phone).
const { label, title, lead, main, items, more } = content.services;
const ALL = [{ ...main, tag: main.tag as string | undefined }, ...items.map((item) => ({ ...item, tag: undefined }))];
const num = (i: number) => String(i + 1).padStart(2, '0');
const spring = { type: 'spring', ...toMotion(springs.glide) } as const;
const fade = { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] } as const;

const More = () => (
  <span className="sv-more">
    {more} <span aria-hidden="true">→</span>
  </span>
);

/** Desktop: the names on the left, the open service on a panel of black acrylic; the pointer chooses. */
const Stage = ({ progress }: { progress: MotionValue<number> }) => {
  const [open, setOpen] = useState(0);
  const [lit, setLit] = useState(false);
  const item = ALL[open];
  const pick = (i: number) => ({
    onPointerEnter: (e: PointerEvent) => e.pointerType === 'mouse' && setOpen(i),
    onFocus: () => setOpen(i),
    onClick: () => setOpen(i)
  });
  const panelIn = useTransform(progress, (p) => clamp01((p - 0.15) / 0.6));
  const panelY = useTransform(panelIn, (v) => (1 - v) * 24);

  return (
    <div className="sv-stage">
      <ul className="sv-stage__list">
        {ALL.map((it, i) => (
          <ListItem key={it.title} index={i} progress={progress}>
            <button type="button" className="sv-stage__item" data-open={open === i || undefined} aria-pressed={open === i} {...pick(i)}>
              <span className="sv-num">{num(i)}</span>
              <span>{it.title}</span>
            </button>
          </ListItem>
        ))}
      </ul>
      <motion.div
        className="sv-stage__panel acrylic"
        style={{ opacity: panelIn, y: panelY }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && setLit(true)}
        onPointerLeave={() => setLit(false)}
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          <motion.span
            key={open}
            className="sv-stage__big"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { ...fade, delay: 0.1 } }}
            exit={{ opacity: 0, transition: fade }}
          >
            {num(open)}
          </motion.span>
        </AnimatePresence>
        <AnimatePresence initial={false}>
          <motion.div
            key={open}
            className="sv-stage__content"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0, transition: { y: spring, opacity: fade } }}
            exit={{ opacity: 0, y: -8, transition: fade }}
          >
            <span className="eyebrow eyebrow--dot">{item.tag ?? `услуга ${num(open)} / ${num(ALL.length - 1)}`}</span>
            <h3 className="sv-stage__title">{item.title}</h3>
            <p className="sv-stage__text">{item.text}</p>
            <a className="btn btn--acrylic btn--sm" href={`#price-${item.price}`}>
              <span className="btn__label">Цены и сроки</span>
            </a>
          </motion.div>
        </AnimatePresence>
        <BorderBeam active={lit} />
      </motion.div>
    </div>
  );
};

/** One name of the list, arriving after the one above it. */
const ListItem = ({ index, progress, children }: { index: number; progress: MotionValue<number>; children: ReactNode }) => {
  const at = (p: number) => clamp01((p - index * 0.06) / 0.4);
  const opacity = useTransform(progress, at);
  const x = useTransform(progress, (p) => (1 - at(p)) * -12);
  return <motion.li style={{ opacity, x }}>{children}</motion.li>;
};

/** Phone: one column of names; the open one unfolds its description under it. */
const Index = () => {
  const [open, setOpen] = useState(0);
  const { reduced } = useStage();
  return (
    <ol className="sv-index">
      {ALL.map((item, i) => (
        <li key={item.title} className="sv-index__row" data-open={open === i || undefined}>
          <button type="button" className="sv-index__head" aria-expanded={open === i} onClick={() => setOpen(i)}>
            <span className="sv-num">{num(i)}</span>
            <span className="sv-index__title">{item.title}</span>
          </button>
          <AnimatePresence initial={false}>
            {open === i ? (
              <motion.div
                className="sv-index__body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1, transition: reduced ? { duration: 0 } : { height: spring, opacity: { ...fade, delay: 0.08 } } }}
                exit={{ height: 0, opacity: 0, transition: reduced ? { duration: 0 } : { height: spring, opacity: fade } }}
              >
                <div className="sv-index__inner">
                  <p className="sv-index__text">{item.text}</p>
                  <a className="sv-index__link" href={`#price-${item.price}`}>
                    <More />
                  </a>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </li>
      ))}
    </ol>
  );
};

export const Services = () => {
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const body = useReveal<HTMLDivElement>({ duration: 1.2 });
  const [narrow] = useState(() => window.matchMedia('(max-width: 760px)').matches);

  return (
    <section className="services block" id="services">
      <div className="wrap">
        <div ref={head.ref}>
          <SectionHead className="head--split" label={label} title={title} lead={lead} progress={head.progress} />
        </div>
        <div ref={body.ref}>{narrow ? <Index /> : <Stage progress={body.progress} />}</div>
      </div>
    </section>
  );
};
