import { useRef, type ReactNode } from 'react';
import { motion, useTransform, type MotionStyle } from 'motion/react';
import BlurText from '../components/reactbits/BlurText/BlurText';
import GlassSurface from '../components/reactbits/GlassSurface/GlassSurface';
import ShinyText from '../components/reactbits/ShinyText/ShinyText';
import { asset } from '../asset';
import { content } from '../content';
import { useStage } from '../motion/stage';
import { clamp01, easeInOut, lerp, settle } from '../motion/tokens';
import './Hero.css';

/** One line of the title, rising out of its mask as the light arrives. */
const Rise = ({ index, children }: { index: number; children: ReactNode }) => {
  const { intro } = useStage();
  const y = useTransform(intro, (t) => `${(1 - settle(t - 0.45 - index * 0.1, 0.85)) * 110}%`);
  return (
    <span className="hero__word">
      <motion.span style={{ y }}>{children}</motion.span>
    </span>
  );
};

export const Hero = () => {
  const stage = useStage();
  const { intro, light, scrollY, layoutVersion } = stage;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { eyebrow, title, lead, primary, secondary, photo } = content.hero;

  // The title needs the scene's light in its own pixel space. Its place on the
  // page is re-read only when the layout changes.
  const box = useRef({ left: 0, top: 0, version: -1 });
  const place = () => {
    const version = layoutVersion.get();
    const el = titleRef.current;
    if (el && box.current.version !== version) {
      const rect = el.getBoundingClientRect();
      box.current = { left: rect.left + window.scrollX, top: rect.top + window.scrollY, version };
    }
    return box.current;
  };

  // the same sweep that crosses the form crosses the letters
  const sweepX = useTransform(() => {
    const { left } = place();
    const L = stage.layout.current;
    const along = lerp(-0.5, 1.8, easeInOut(clamp01((intro.get() - 0.3) / 1.6)));
    return `${L.formX + along * L.formW - left}px`;
  });
  const keyX = useTransform(() => `${light.x.get() * window.innerWidth - place().left}px`);
  // past the first screen the title is out of sight: stop restyling it on every scroll frame
  const keyY = useTransform(() => `${Math.min(scrollY.get(), window.innerHeight * 1.5) + light.y.get() * window.innerHeight - place().top}px`);
  const keyI = useTransform(intro, (t) => settle(t - 0.9, 1.1));
  const limeI = useTransform(intro, (t) => settle(t - 0.9, 0.9));

  const eyebrowIn = useTransform(intro, (t) => settle(t - 0.35, 0.6));
  const leadIn = useTransform(intro, (t) => clamp01((t - 0.95) / 1.1));
  const actionsIn = useTransform(intro, (t) => settle(t - 1.45, 0.6));
  const actionsY = useTransform(actionsIn, (v) => (1 - v) * 10);
  // the portrait arrives with the glass it stands on
  const paneIn = useTransform(intro, (t) => settle(t - 1.05, 0.6));
  const plaqueIn = useTransform(intro, (t) => settle(t - 1.6, 0.6));
  const plaqueY = useTransform(plaqueIn, (v) => (1 - v) * 12);

  return (
    <section className="hero" id="top" data-scene="hero">
      <div className="hero__grid wrap">
        <motion.p className="eyebrow eyebrow--dot hero__eyebrow" style={{ opacity: eyebrowIn }}>
          {eyebrow}
        </motion.p>

        <motion.h1
          ref={titleRef}
          className="hero__title"
          data-shine-root
          style={{ '--sweep-x': sweepX, '--key-x': keyX, '--key-y': keyY, '--key-i': keyI, '--lime-i': limeI } as MotionStyle}
        >
          <Rise index={0}>
            <ShinyText>{title[0]}</ShinyText>
          </Rise>{' '}
          <Rise index={1}>
            <ShinyText bounce className="hero__lit">
              {title[1]}
            </ShinyText>
          </Rise>
        </motion.h1>

        <BlurText className="hero__lead" text={lead} progress={leadIn} stagger={0.02} />

        <motion.div className="hero__actions" style={{ opacity: actionsIn, y: actionsY }}>
          <a className="btn btn--lime" href={primary.href}>
            <span className="btn__label">{primary.label}</span>
          </a>
          <a className="btn btn--outline" href={secondary.href}>
            <span className="btn__label">{secondary.label}</span>
            <span className="btn__label textlink__arrow" aria-hidden="true">
              →
            </span>
          </a>
        </motion.div>

        {/* the glass of the pane is drawn by the scene; the form glows through it from behind */}
        <figure className="hero__photo" data-scene="pane">
          <motion.div className="hero__portrait" style={{ opacity: paneIn }}>
            {/* the cut-out stands in the scene's light: a shadow behind him, shade across him */}
            <div className="hero__person">
              <img className="hero__img" src={asset(photo.src)} alt={photo.alt} width={1254} height={1254} decoding="async" fetchPriority="high" />
              <span className="hero__shade" aria-hidden="true" />
            </div>
          </motion.div>
          <motion.figcaption className="hero__plaque" style={{ opacity: plaqueIn, y: plaqueY }}>
            <GlassSurface className="hero__plaque-glass" borderRadius={20} bezelRatio={0.4} dispersion={0.03} strength={0.9} />
            <span className="hero__plaque-text">
              <span className="hero__name">
                {photo.name} <span className="hero__role">— {photo.role}</span>
              </span>
              <span className="hero__line">{photo.line}</span>
              <span className="hero__quote">«{photo.quote}»</span>
            </span>
          </motion.figcaption>
        </figure>
      </div>
    </section>
  );
};
