import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { motion, useInView, useMotionValue, useMotionValueEvent, useSpring, useTransform, type MotionStyle, type MotionValue } from 'motion/react';
import { SectionHead } from '../components/SectionHead';
import OptionWheel from '../components/reactbits/OptionWheel/OptionWheel';
import { wheel as cases } from '../cases';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { tick } from '../motion/tick';
import { clamp01, lerp, smoother, springs, toMotion } from '../motion/tokens';
import './Cases.css';

/** The wheel ends on the visitor's own project, after the published cases. */
const NAMES = [...cases.map((item) => item.name), content.cases.yours.name];
const LAST = NAMES.length - 1;
/** Rows of scroll the first and the last case hold before the section moves on. */
const DWELL = 0.6;

/** The wheel is notched: between two cases it rests, then crosses over. */
const detent = (v: number) => {
  const i = Math.floor(v);
  return i + smoother(clamp01((v - i - 0.2) / 0.6));
};

const two = (n: number) => String(n).padStart(2, '0');

const warmed = new Map<number, HTMLImageElement>();
/**
 * Fetches and decodes a cover off the main thread, so it never costs the wheel a frame.
 * The decoded image is kept, so the browser does not drop it before the wheel gets there.
 */
const preload = (index: number) => {
  const item = cases[index];
  if (!item || warmed.has(index)) return;
  const image = new Image();
  image.decoding = 'async';
  image.src = item.cover;
  warmed.set(index, image);
  image.decode?.().catch(() => warmed.delete(index));
};

/** The preview of one case. It is there only while the wheel rests on that case. */
const Preview = ({ index, focus }: { index: number; focus: MotionValue<number> }) => {
  const stage = useStage();
  const item = cases[index];
  const [loaded, setLoaded] = useState(-1);

  // it materialises: blur, scale and opacity arrive together
  const y = useTransform(focus, (v) => (1 - v) * 14);
  const scale = useTransform(focus, (v) => lerp(0.965, 1, v));
  const filter = useTransform(focus, (v) => (v > 0.99 ? 'none' : `blur(${((1 - v) * 12).toFixed(2)}px)`));
  const rotateY = useTransform(stage.cam.x, (v) => -4 + v * 2.5);
  const rotateX = useTransform(stage.cam.y, (v) => 1.5 - v * 2);

  // The acrylic and its content stay mounted whatever they show: Motion lets go of the values
  // bound to an element when it unmounts, and the focus spring would stop following the wheel.
  return (
    <motion.article
      className="preview acrylic"
      style={{ ...(stage.reduced ? null : { rotateX, rotateY }), '--focus': focus } as MotionStyle}
      aria-live="polite"
    >
      {/* light crosses the acrylic as a case lands on it */}
      <span className="preview__glare" aria-hidden="true" />
      <motion.div className="preview__content" style={stage.reduced ? { opacity: focus } : { opacity: focus, y, scale, filter }}>
        {item ? <Story index={index} loaded={loaded === index} onLoad={() => setLoaded(index)} /> : <Yours />}
      </motion.div>
    </motion.article>
  );
};

/** One published case: what was done, the figure it is remembered by, and the article. */
const Story = ({ index, loaded, onLoad }: { index: number; loaded: boolean; onLoad: () => void }) => {
  const item = cases[index];
  const { read, anti } = content.cases;
  const contain = item.ratio < 1.3;
  const place = item.services ? item.services.join(' · ') : [item.city, item.channel].filter(Boolean).join(' · ');
  const tag = item.kicker ? [item.kicker, item.city].filter(Boolean).join(' · ') : item.niche;

  return (
    <>
      <div className="preview__bar">
        <span className="preview__count">
          {two(index + 1)} / {two(cases.length)}
        </span>
        <span className="tag">{tag}</span>
        {item.anti ? <span className="tag tag--lit">{anti}</span> : null}
      </div>

      <div className={`preview__cover${contain ? ' preview__cover--contain' : ''}`}>
        {contain ? <img key={`b${index}`} className="preview__backdrop" src={item.cover} alt="" decoding="async" /> : null}
        <img
          key={index}
          className="preview__image"
          src={item.cover}
          alt={`Обложка кейса «${item.name}»`}
          decoding="async"
          data-loaded={loaded || undefined}
          onLoad={onLoad}
        />
      </div>

      {item.headline ? <p className="preview__headline">{item.headline}</p> : null}
      <p className={`preview__value${item.anti ? ' preview__value--plain' : ''}${item.headline ? ' preview__value--tight' : ''}`}>{item.value}</p>
      <p className="preview__unit">{item.unit}</p>
      {item.note ? <p className="preview__note">{item.note}</p> : null}

      <div className="preview__foot">
        <span className="preview__place">{place}</span>
        <a className="textlink preview__link" href={item.href} target="_blank" rel="noreferrer">
          {read}
          <span className="textlink__arrow" aria-hidden="true">
            →
          </span>
        </a>
      </div>
    </>
  );
};

/** The last stop of the wheel: an empty slot for the visitor's project, and the one way into it. */
const Yours = () => {
  const { yours } = content.cases;
  return (
    <>
      <div className="preview__bar">
        <span className="preview__count preview__count--word">{yours.name}</span>
        <span className="tag">{yours.tag}</span>
      </div>
      <div className="preview__cover preview__cover--empty">
        <span>{yours.slot}</span>
      </div>
      <p className="preview__headline preview__headline--yours">{yours.title}</p>
      <p className="preview__note">{yours.text}</p>
      <div className="preview__foot preview__foot--yours">
        <a className="btn btn--lime btn--sm" href="#contact">
          <span className="btn__label">{yours.cta}</span>
        </a>
      </div>
    </>
  );
};

export const Cases = () => {
  const stage = useStage();
  const { scrollY, reduced } = stage;
  const { label, title, lead, hint, all } = content.cases;

  const sectionRef = useRef<HTMLElement>(null);
  const geo = useRef({ top: 0, step: 90 });
  const version = useMotionValue(0);
  const head = useReveal<HTMLDivElement>({ duration: 1.3, margin: '0px 0px -30% 0px' });
  const near = useInView(sectionRef, { once: true, margin: '100% 0px' });

  // Where the page is, in cases: the scroll position is the only source of truth.
  const raw = useTransform(() => {
    version.get();
    const { top, step } = geo.current;
    return Math.min(LAST, Math.max(0, (scrollY.get() - top) / step - DWELL));
  });

  // While the page moves the wheel follows it through its notches; once it stops, it closes on the nearest case.
  const idle = useMotionValue(1);
  useEffect(() => {
    let timer = 0;
    const stop = raw.on('change', () => {
      idle.set(0);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => idle.set(1), 150);
    });
    return () => {
      stop();
      window.clearTimeout(timer);
    };
  }, [raw, idle]);

  const target = useTransform(() => (idle.get() === 1 || reduced ? Math.round(raw.get()) : detent(raw.get())));
  const spring = useSpring(target, toMotion(springs.follow));
  const position = reduced ? target : spring;

  useLayoutEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let first = true;
    const measure = () => {
      const step = parseFloat(getComputedStyle(el).getPropertyValue('--step')) || 90;
      geo.current = { top: el.getBoundingClientRect().top + window.scrollY, step };
      version.set(version.get() + 1);
      if (first) {
        // never spin into the first frame
        first = false;
        spring.jump(Math.round(raw.get()));
      }
    };
    measure();
    // anything above that changes height moves the section
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [raw, spring, version]);

  const [selected, setSelected] = useState(0);
  const selectedAt = useMotionValue(0);
  useMotionValueEvent(position, 'change', (v) => {
    const index = Math.min(LAST, Math.max(0, Math.round(v)));
    if (index === selectedAt.get()) return;
    selectedAt.set(index);
    setSelected(index);
    tick();
  });

  // The preview shows one case and changes it only while it is out of sight:
  // it leaves as the wheel turns away, and comes back once the wheel has arrived.
  const [shown, setShown] = useState(0);
  const shownAt = useMotionValue(0);
  // Every value is read before it is compared: a computed value subscribes only to what it read,
  // and a short-circuited `&&` would leave it deaf to the rest.
  const arrived = useTransform((): number => {
    const p = position.get();
    const t = target.get();
    return Math.abs(p - Math.round(p)) < 0.14 && Math.abs(t - p) < 0.3 ? 1 : 0;
  });
  const focusTarget = useTransform((): number => {
    const landed = arrived.get();
    const showing = shownAt.get();
    const picked = selectedAt.get();
    return landed === 1 && showing === picked ? 1 : 0;
  });
  const focusSpring = useSpring(focusTarget, toMotion(springs.reveal));
  const focus = reduced ? focusTarget : focusSpring;

  useEffect(() => {
    const swap = () => {
      if (arrived.get() !== 1 || focus.get() > 0.06 || shownAt.get() === selectedAt.get()) return;
      shownAt.set(selectedAt.get());
      setShown(selectedAt.get());
    };
    const stops = [focus.on('change', swap), arrived.on('change', swap), selectedAt.on('change', swap)];
    return () => stops.forEach((stop) => stop());
  }, [arrived, focus, selectedAt, shownAt]);

  // All covers (~1.5 MB of local webp) are fetched a screen before the section,
  // the ones round the wheel's current case first.
  useEffect(() => {
    if (!near) return;
    for (let d = 0; d <= LAST; d++) {
      preload(selected + d);
      preload(selected - d);
    }
  }, [near, selected]);

  const scrollTo = (index: number, smooth = true) => {
    const { top, step } = geo.current;
    window.scrollTo({ top: top + (index + DWELL) * step, behavior: smooth && !reduced ? 'smooth' : 'auto' });
  };

  const dragFrom = useRef(0);
  const onDrag = (rows: number, phase: 'start' | 'move' | 'end') => {
    if (phase === 'start') dragFrom.current = window.scrollY;
    else window.scrollTo(0, dragFrom.current + rows * geo.current.step);
  };

  const bodyIn = useTransform(head.progress, (p) => clamp01((p - 0.25) / 0.6));
  // the mark beside the wheel is lit while a case is in focus
  const mark = useTransform(focus, (v) => lerp(0.35, 1, v));

  return (
    <section ref={sectionRef} className="cases" id="cases" style={{ '--count': NAMES.length, '--dwell': DWELL } as CSSProperties}>
      <div className="cases__pin">
        <div ref={head.ref} className="cases__grid wrap">
          <div className="cases__left">
            <SectionHead className="head--compact" label={label} title={title} lead={lead} progress={head.progress} />

            <motion.div className="cases__wheel" style={{ opacity: bodyIn }}>
              <motion.span className="cases__mark" style={{ opacity: mark, scaleY: mark }} aria-hidden="true" />
              <OptionWheel
                items={NAMES}
                position={position}
                selected={selected}
                onSeek={scrollTo}
                onDrag={onDrag}
                label={`${label}: выберите проект`}
                blur={reduced ? 0 : 1.6}
              />
            </motion.div>

            <motion.div className="cases__hint" style={{ opacity: bodyIn }}>
              <span>{hint}</span>
              <a className="btn btn--acrylic btn--sm cases__all" href={all.href} target="_blank" rel="noreferrer">
                <span className="btn__label">{all.label}</span>
              </a>
            </motion.div>
          </div>

          <motion.div className="cases__right" style={{ opacity: bodyIn }}>
            <Preview index={shown} focus={focus} />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
