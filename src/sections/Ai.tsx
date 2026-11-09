import { AnimatePresence, motion, useInView, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useState } from 'react';
import { asset } from '../asset';
import { SectionHead } from '../components/SectionHead';
import { Sheet } from '../components/Sheet';
import { content } from '../content';
import { chooseService } from '../lead';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { clamp01, settle, springs, toMotion } from '../motion/tokens';
import './Ai.css';

/** Seconds each direction stays open while nobody chooses. */
const DWELL = 4.5;

/**
 * Where each direction sits on the picture (share of its width and height): on the panel of
 * Sanya's android that shows that kind of work.
 */
const SPOTS: readonly { x: number; y: number }[] = [
  { x: 0.16, y: 0.64 }, // AI-сайты — the window with a picture and lines
  { x: 0.17, y: 0.3 }, // ассистенты и чат-боты — the speech bubble
  { x: 0.75, y: 0.39 }, // автоматизация — the checklist
  { x: 0.84, y: 0.15 }, // приложения — the chart panel
  { x: 0.72, y: 0.64 }, // креативы — the wave
  { x: 0.11, y: 0.46 } // интеграции — the people (CRM)
];

const num = (i: number) => String(i + 1).padStart(2, '0');
const spring = { type: 'spring', ...toMotion(springs.glide) } as const;
const fade = { duration: 0.24, ease: [0.2, 0.8, 0.2, 1] } as const;

interface SpotProps {
  index: number;
  open: boolean;
  progress: MotionValue<number>;
  onPick: (index: number, hover: boolean) => void;
}

/** A point of light on its panel, with the direction's name beside it; the points come up one by one. */
const Spot = ({ index, open, progress, onPick }: SpotProps) => {
  const { x, y } = SPOTS[index];
  const opacity = useTransform(progress, (p) => clamp01((p - 0.45 - index * 0.07) / 0.25));
  return (
    <motion.button
      type="button"
      className="ai__spot"
      data-open={open || undefined}
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, opacity }}
      aria-pressed={open}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onPick(index, true)}
      onFocus={() => onPick(index, false)}
      onClick={() => onPick(index, false)}
    >
      <span className="ai__dot" aria-hidden="true" />
      <span className="ai__tag">{content.ai.duties[index].title}</span>
    </motion.button>
  );
};

/**
 * Item 3 of Рома's list: the six directions are not a wall of text around the picture, they live
 * on it. Sanya's android is the map — each direction is a point on the panel that shows it, and
 * the open one unfolds a card of smoked glass beside its point. While nobody chooses, the points
 * take turns; a pointer over the picture pauses that, a click or the keyboard stops it.
 */
export const Ai = () => {
  const stage = useStage();
  const { label, title, lead, android, duties, cta } = content.ai;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const map = useReveal<HTMLDivElement>({ duration: 1.6, margin: '0px 0px -25% 0px' });
  const inView = useInView(map.ref, { amount: 0.4 });

  const [open, setOpen] = useState(0);
  const [chosen, setChosen] = useState(false);
  const [held, setHeld] = useState(false);
  const pick = (index: number, hover: boolean) => {
    setOpen(index);
    if (!hover) setChosen(true);
  };

  useEffect(() => {
    if (!inView || chosen || held || stage.reduced) return;
    const id = window.setInterval(() => setOpen((v) => (v + 1) % duties.length), DWELL * 1000);
    return () => window.clearInterval(id);
  }, [inView, chosen, held, stage.reduced, duties.length]);

  // the picture leans with the camera, as everything the cursor's light falls on
  const rotateY = useTransform(stage.cam.x, (v) => v * 4);
  const rotateX = useTransform(stage.cam.y, (v) => 2 - v * 3);
  const picIn = useTransform(map.progress, (p) => settle(p * 1.6, 0.7));
  const picY = useTransform(picIn, (v) => (1 - v) * 28);
  const cardIn = useTransform(map.progress, (p) => clamp01((p - 0.85) / 0.15));
  const ctaIn = useTransform(map.progress, (p) => clamp01((p - 0.7) / 0.3));

  const spot = SPOTS[open];
  const toLeft = spot.x > 0.5;

  return (
    <Sheet id="ai" className="ai">
      <div className="wrap block">
        <div ref={head.ref} className="ai__head">
          <SectionHead label={label} title={title} lead={lead} progress={head.progress} />
        </div>

        <div ref={map.ref} className="ai__map">
          <motion.figure
            className="ai__android"
            style={stage.reduced ? undefined : { rotateX, rotateY, opacity: picIn, y: picY, transformPerspective: 1600 }}
            onPointerEnter={() => setHeld(true)}
            onPointerLeave={() => setHeld(false)}
          >
            {/* the points are placed in shares of the picture, so they live in a box of its size alone */}
            <div className="ai__pic">
              <img src={asset(android.src)} alt={android.alt} width={1448} height={1086} loading="lazy" decoding="async" />
              {duties.map((_, i) => (
                <Spot key={i} index={i} open={open === i} progress={map.progress} onPick={pick} />
              ))}
            </div>
            <motion.div className="ai__card-slot" style={{ opacity: cardIn }} aria-live="polite">
              <AnimatePresence initial={false}>
                <motion.div
                  key={open}
                  className={`ai__card${toLeft ? ' ai__card--left' : ''}`}
                  style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1, transition: { scale: spring, opacity: fade } }}
                  exit={{ opacity: 0, transition: fade }}
                >
                  <span className="ai__num">{num(open)}</span>
                  <h3 className="ai__card-title">{duties[open].title}</h3>
                  <p className="ai__card-text">{duties[open].text}</p>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </motion.figure>
        </div>

        <motion.div className="ai__cta" style={{ opacity: ctaIn }}>
          <a className="btn btn--acrylic" href={cta.href} onClick={() => chooseService(cta.service)}>
            <span className="btn__dot" aria-hidden="true" />
            <span className="btn__label">{cta.label}</span>
          </a>
        </motion.div>
      </div>
    </Sheet>
  );
};
