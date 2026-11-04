import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, type MotionStyle, type MotionValue } from 'motion/react';
import { content } from '../content';
import { useStage } from '../motion/stage';
import { lerp, settle, springs, toMotion } from '../motion/tokens';
import GlassSurface from './reactbits/GlassSurface/GlassSurface';
import GradualBlur from './reactbits/GradualBlur/GradualBlur';
import './Nav.css';
import { asset } from '../asset';

const SHEET = { type: 'spring' as const, ...toMotion(springs.ui) };

type Ground = 'light' | 'lime';
interface Plate {
  top: number;
  bottom: number;
  tone: Ground;
}

/** Height the shade reaches under the bar, px. */
const SHADE = 132;
/** The line the brand and the links stand on, px from the top of the screen. */
const LINE = 38;

type Span = [number, number];

/** A mask that keeps the spans (px), feathered a little so a frame of scroll lag never shows a seam. */
const NONE = 'linear-gradient(transparent, transparent)';
const FEATHER = 6;
const keep = (spans: Span[]) => {
  const open = spans.filter(([a, b]) => b - a >= 0.5);
  if (!open.length) return NONE;
  const stops = open.flatMap(([a, b]) => [
    `transparent ${a - FEATHER}px`,
    `#000 ${a + FEATHER}px`,
    `#000 ${b - FEATHER}px`,
    `transparent ${b + FEATHER}px`
  ]);
  return `linear-gradient(${stops.join(', ')})`;
};

/**
 * What is under the bar, read without touching the layout while the page scrolls:
 * sheet positions are measured on resize, on scroll it is arithmetic.
 *
 * - `paper`, `lime` — the ground under the brand line (0 or 1), eased by a spring, so the
 *   ink and the capsule change over in time, never flip, and never hang half-way.
 * - `masks` — each shade lies only over its own ground: the paper one over the light
 *   sheets inside its reach, the lime one over the lime sheet, the dark one over whatever
 *   is left. Every sheet in reach counts, so where two sheets meet (FAQ → the lime form)
 *   the cut still runs along the real edge instead of jumping when one of them leaves.
 */
const useGround = (scrollY: MotionValue<number>, open: boolean) => {
  const paper = useMotionValue(0);
  const lime = useMotionValue(0);
  const maskDark = useMotionValue('none');
  const maskPaper = useMotionValue(NONE);
  const maskLime = useMotionValue(NONE);
  const openRef = useRef(open);

  const update = useRef(() => {});
  useEffect(() => {
    let plates: Plate[] = [];
    update.current = () => {
      // the open menu is a sheet of black acrylic: the bar over it is dark
      const shown = openRef.current ? [] : plates;
      const y = scrollY.get();
      const on = shown.find((p) => p.top - y <= LINE && p.bottom - y > LINE);
      paper.set(on?.tone === 'light' ? 1 : 0);
      lime.set(on?.tone === 'lime' ? 1 : 0);

      // spans of each sheet in reach, in px from the top of the screen (sorted, as on the page)
      const reach = shown
        .filter((p) => p.top - y < SHADE + FEATHER && p.bottom - y > -FEATHER)
        .map((p) => ({ tone: p.tone, span: [p.top - y, p.bottom - y] as Span }));
      maskPaper.set(keep(reach.filter((r) => r.tone === 'light').map((r) => r.span)));
      maskLime.set(keep(reach.filter((r) => r.tone === 'lime').map((r) => r.span)));
      if (!reach.length) {
        maskDark.set('none');
        return;
      }
      // the graphite is what lies between the sheets
      const gaps: Span[] = [];
      let at = -SHADE;
      for (const { span } of reach) {
        gaps.push([at, span[0]]);
        at = Math.max(at, span[1]);
      }
      gaps.push([at, 2 * SHADE]);
      maskDark.set(keep(gaps));
    };
    const measure = () => {
      const y = window.scrollY;
      plates = [...document.querySelectorAll<HTMLElement>('[data-tone]')]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return { top: rect.top + y, bottom: rect.bottom + y, tone: el.dataset.tone as Ground };
        })
        .sort((p, q) => p.top - q.top);
      update.current();
    };
    measure();
    const stop = scrollY.on('change', () => update.current());
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      stop();
      observer.disconnect();
    };
  }, [scrollY, paper, lime, maskDark, maskPaper, maskLime]);
  useEffect(() => {
    openRef.current = open;
    update.current();
  }, [open]);

  const spring = toMotion(springs.ui);
  return { paper: useSpring(paper, spring), lime: useSpring(lime, spring), maskDark, maskPaper, maskLime };
};

export const Nav = () => {
  const stage = useStage();
  const enter = useTransform(stage.intro, (t) => settle(t - 0.2, 0.7));
  const [open, setOpen] = useState(false);
  const ground = useGround(stage.scrollY, open);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Over the hero the links stand on bare graphite. Once content scrolls under
  // them they get a glass capsule, which arrives as a material: opacity and scale together.
  const scrolled = useTransform(stage.scrollY, (y): number => (y > 48 ? 1 : 0));
  const solid = useSpring(scrolled, toMotion(springs.ui));
  const scale = useTransform(solid, (v) => lerp(0.94, 1, v));

  // Over the edge of a sheet the bar does not flip: the ink and the capsule ease over…
  const paper = useTransform(() => Math.min(1, ground.paper.get() + ground.lime.get()));
  const limeShare = useTransform(() => {
    const all = ground.paper.get() + ground.lime.get();
    return all > 0.001 ? ground.lime.get() / all : 0;
  });
  // …and the shade is cut along the sheets' own edges (useGround)
  const { maskDark, maskPaper, maskLime } = ground;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      burgerRef.current?.focus();
    };
    // the menu exists only on narrow screens: widening the window closes it
    const wide = window.matchMedia('(min-width: 921px)');
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  // A link in the menu: close first, then go — the page cannot scroll while the menu holds it.
  const go = (event: MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute('href');
    if (!href?.startsWith('#')) return;
    event.preventDefault();
    setOpen(false);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: stage.reduced ? 'auto' : 'smooth' });
        history.replaceState(null, '', href);
      })
    );
  };

  const { links, cta, telegram, menu, close } = content.nav;

  return (
    <>
      {/* content dissolves under the bar instead of meeting a hard edge */}
      <GradualBlur target="page" position="top" height="6.5rem" strength={1.6} divCount={4} curve="bezier" zIndex={-60} />
      <motion.header className="nav" style={{ '--on-paper': paper, '--lime-share': limeShare } as MotionStyle}>
        {/* …and under a soft shade, so the bar stays legible over the headline */}
        <motion.div className="nav__shade" style={{ opacity: solid, maskImage: maskDark, WebkitMaskImage: maskDark }} aria-hidden="true" />
        <motion.div className="nav__shade nav__shade--paper" style={{ opacity: solid, maskImage: maskPaper, WebkitMaskImage: maskPaper }} aria-hidden="true" />
        <motion.div className="nav__shade nav__shade--lime" style={{ opacity: solid, maskImage: maskLime, WebkitMaskImage: maskLime }} aria-hidden="true" />
        <div className="nav__inner wrap">
          <motion.a className="brand" href="#top" style={{ opacity: enter }} onClick={open ? go : undefined}>
            <img src={asset('brand/mark.webp')} alt="" width={240} height={111} />
            <span className="brand__text">
              <span className="brand__name">{content.brand}</span>
              <span className="brand__note">{content.brandNote}</span>
            </span>
          </motion.a>

          <nav className="nav__pill" aria-label="Разделы">
            <GlassSurface
              className="nav__glass"
              borderRadius={23}
              bezelRatio={0.42}
              dispersion={0.03}
              strength={1}
              style={{ opacity: solid, scale }}
            />
            <motion.ul className="nav__links" style={{ opacity: enter }}>
              {links.map((link) => (
                <li key={link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </motion.ul>
          </nav>

          <motion.div className="nav__end" style={{ opacity: enter }}>
            <a className="btn btn--lime btn--sm nav__cta" href={cta.href}>
              <span className="btn__label">{cta.label}</span>
            </a>
            <a className="btn btn--acrylic btn--sm nav__tg" href={telegram.href} target="_blank" rel="noreferrer">
              <span className="btn__label">{telegram.label}</span>
            </a>
            <button
              ref={burgerRef}
              className="btn btn--acrylic btn--sm nav__burger"
              type="button"
              aria-expanded={open}
              aria-controls="nav-menu"
              aria-label={open ? close : menu}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="nav__bars" data-open={open || undefined} aria-hidden="true">
                <span />
                <span />
              </span>
            </button>
          </motion.div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="nav-menu"
            className="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <motion.nav
              className="menu__sheet acrylic"
              aria-label="Разделы"
              initial={stage.reduced ? false : { y: -16, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={stage.reduced ? undefined : { y: -12, scale: 0.98 }}
              transition={SHEET}
            >
              <ul>
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} onClick={go}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <a className="btn btn--lime menu__cta" href={cta.href} onClick={go}>
                <span className="btn__label">{cta.label}</span>
              </a>
            </motion.nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
