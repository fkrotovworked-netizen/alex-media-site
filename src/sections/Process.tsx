import { useRef, useState } from 'react';
import { motion, useTransform } from 'motion/react';
import { SectionHead } from '../components/SectionHead';
import { Sheet } from '../components/Sheet';
import GlassSurface from '../components/reactbits/GlassSurface/GlassSurface';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { clamp01, springs, toMotion } from '../motion/tokens';
import './Process.css';

const two = (n: number) => String(n).padStart(2, '0');
const PANEL = { type: 'spring' as const, ...toMotion(springs.ui) };
const LENS = { type: 'spring' as const, ...toMotion(springs.glide) };

export const Process = () => {
  const stage = useStage();
  const { label, title, lead, note, stageLabel, resultLabel, stages } = content.process;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });

  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const go = (index: number, focus = false) => {
    const next = Math.min(stages.length - 1, Math.max(0, index));
    setActive(next);
    const tab = tabs.current[next];
    if (focus) tab?.focus({ preventScroll: true });
    // on a phone the track is wider than the screen
    tab?.scrollIntoView({ behavior: stage.reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next: number | null = step ? active + step : null;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = stages.length - 1;
    if (next === null) return;
    event.preventDefault();
    go(next, true);
  };

  const bodyIn = useTransform(head.progress, (p) => clamp01((p - 0.3) / 0.6));
  const bodyY = useTransform(bodyIn, (v) => (1 - v) * 16);

  return (
    <Sheet id="process" className="process">
      <div ref={head.ref} className="wrap block">
        <SectionHead label={label} title={title} lead={lead} progress={head.progress} />

        <motion.div className="process__body" style={{ opacity: bodyIn, y: bodyY }}>
          <div className="track-scroll">
            <div className="track acrylic" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
              {stages.map((item, i) => (
                <button
                  key={item.name}
                  ref={(el) => {
                    tabs.current[i] = el;
                  }}
                  className="track__cell"
                  type="button"
                  role="tab"
                  id={`stage-tab-${i}`}
                  aria-selected={active === i}
                  aria-controls={`stage-panel-${i}`}
                  tabIndex={active === i ? 0 : -1}
                  onPointerDown={(event) => event.pointerType === 'mouse' && go(i)}
                  onClick={() => go(i)}
                >
                  <span className="track__num">{two(i + 1)}</span>
                  <span className="track__name">{item.name}</span>
                </button>
              ))}
              {/* Above the labels, so it bends the one it lies on. It moves by a whole
                  `transform`, which Motion hands to the compositor as a spring (WAAPI):
                  the glide stays smooth while React swaps the panels below. Every cell
                  is the same width, so the refraction map is built once and never again. */}
              <motion.div
                className="track__lens"
                initial={false}
                animate={{ transform: `translateX(${active * 100}%)` }}
                transition={stage.reduced ? { duration: 0 } : LENS}
              >
                <GlassSurface tone="light" borderRadius={26} bezelRatio={0.5} dispersion={0.05} strength={1} className="track__glass" />
              </motion.div>
            </div>
          </div>

          <div className="stagebox">
            {stages.map((item, i) => (
              <motion.div
                key={item.name}
                className="stagebox__panel"
                role="tabpanel"
                id={`stage-panel-${i}`}
                aria-labelledby={`stage-tab-${i}`}
                inert={active !== i}
                initial={false}
                // panels leave towards the side the lens came from
                animate={
                  stage.reduced
                    ? { opacity: active === i ? 1 : 0 }
                    : { opacity: active === i ? 1 : 0, x: active === i ? 0 : i < active ? -32 : 32 }
                }
                transition={PANEL}
              >
                <p className="stagebox__num">
                  {stageLabel} {two(i + 1)} / {two(stages.length)}
                </p>
                <h3 className="stagebox__name">{item.name}</h3>
                <p className="stagebox__text">{item.text}</p>
                <p className="stagebox__result">
                  <span className="stagebox__label">{resultLabel}</span>
                  <span className="stagebox__value">{item.result}</span>
                </p>
              </motion.div>
            ))}
          </div>

          <p className="process__note">{note}</p>
        </motion.div>
      </div>
    </Sheet>
  );
};
