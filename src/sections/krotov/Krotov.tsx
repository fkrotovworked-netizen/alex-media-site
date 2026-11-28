import { memo, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useMotionTemplate,
  useTransform,
  type MotionValue
} from 'motion/react';
import '@fontsource/dela-gothic-one/latin-400.css';
import '@fontsource/dela-gothic-one/cyrillic-400.css';
import { asset } from '../../asset';
import { content } from '../../content';
import { markOrigin } from '../../lead';
import { useStage } from '../../motion/stage';
import { clamp01, smoother, springs, toMotion } from '../../motion/tokens';
import { SignatureInk, type SignaturePen } from './SignatureInk';
import './krotov.css';

/*
 * Krotov Work — Рома's own scenes, stepping out of the Alex Media look on purpose:
 * black instead of graphite, the red of the signature instead of lime, English heads.
 *
 *   Scene 01 — the maker: the portrait, the signature writing itself across it (the renderer of the
 *              CarsCity deck, see SignatureInk), and the four crafts.
 *   Scene 02 — selected works: four sites as screen recordings on a reel the page scroll drives.
 *              Only the shot in front plays.
 *
 * Heads in Dela Gothic One — the heading face of GIRIN × ROMAN (Рома, 2026-11-28; the serif and the
 * mono of the first pass did not suit). Small type: the page's text face in spaced capitals.
 *
 * React Bits: the crafts' hover band is FlowingMenu's idea (a band slides in from the edge the
 * cursor came through, a marquee runs inside), rewritten on Motion — the original has its own rAF
 * loop and an icon package. ScrollStack (own smooth scroll) and TiltedCard are not taken.
 */

const k = content.krotov;
const spring = toMotion(springs.glide);

const pad = (n: number) => String(n).padStart(2, '0');
/** seconds → timecode, 25 fps */
const timecode = (s: number) => {
  const f = Math.max(0, Math.floor(s * 25));
  return `${pad(Math.floor(f / 1500) % 60)}:${pad(Math.floor(f / 25) % 60)}:${pad(f % 25)}`;
};

/** calls `tick` every frame while `on` */
const useTicker = (on: boolean, tick: () => void) => {
  const fn = useRef(tick);
  fn.current = tick;
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const loop = () => {
      fn.current();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);
};

const useMedia = (query: string) => {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
};

/** A line that rises out of its own mask once it comes into view. */
const Rise = ({
  children,
  delay = 0,
  className = '',
  on
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  /** set: rises when this turns true (a group going up together), not on its own entry */
  on?: boolean;
}) => {
  const { reduced } = useStage();
  const trigger =
    on === undefined
      ? { whileInView: { y: '0%' }, viewport: { once: true, margin: '0px 0px -12% 0px' } }
      : { animate: { y: on ? '0%' : '108%' } };
  return (
    <span className={`kw-rise ${className}`}>
      <motion.span
        className="kw-rise__in"
        initial={reduced ? false : { y: '108%' }}
        {...trigger}
        transition={{ type: 'spring', ...toMotion({ response: 0.9, damping: 1 }), delay }}
      >
        {children}
      </motion.span>
    </span>
  );
};

/**
 * The dark lacquered button — «Свет под рукой» (Рома's pick of three, 2026-11-28).
 * Quiet at rest; under the cursor a red light moves inside the lacquer, the rim burns where the hand
 * is nearest. The button itself stays put (no magnet — Рома). Label in the Krotov Work face.
 */
export const GlossButton = ({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(60);
  const my = useMotionValue(30);
  const sx = useSpring(mx, toMotion(springs.follow));
  const sy = useSpring(my, toMotion(springs.follow));
  const [hot, setHot] = useState(false);
  const move = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const b = ref.current!.getBoundingClientRect();
    mx.set(e.clientX - b.left);
    my.set(e.clientY - b.top);
  };
  const enter = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const b = ref.current!.getBoundingClientRect();
    // the light starts where the hand came in, not across the button
    sx.jump(e.clientX - b.left);
    sy.jump(e.clientY - b.top);
    setHot(true);
  };
  const leave = () => setHot(false);
  const rim = useMotionTemplate`radial-gradient(160px circle at ${sx}px ${sy}px, #ffd2c4 0%, #ff4a3a 18%, rgb(215 25 31 / 0.5) 42%, rgb(237 230 220 / 0.12) 75%)`;
  const glow = useMotionTemplate`radial-gradient(140px circle at ${sx}px ${sy}px, rgb(255 70 55 / 0.42), transparent 70%)`;
  return (
    <motion.a
      ref={ref}
      className="kw-btn"
      href={href}
      onClick={onClick}
      data-hot={hot || undefined}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', ...toMotion(springs.ui) }}
      onPointerEnter={enter}
      onPointerMove={move}
      onPointerLeave={leave}
    >
      <motion.span className="kw-btn__rim" style={{ background: rim }} aria-hidden="true" />
      <span className="kw-btn__body" aria-hidden="true" />
      <motion.span className="kw-btn__glow" style={{ background: glow }} aria-hidden="true" />
      <span className="kw-btn__label">{label}</span>
      <span className="kw-btn__arrow" aria-hidden="true">
        →
      </span>
    </motion.a>
  );
};

/* ——— Scene 01: the maker ——— */

type Craft = (typeof k.crafts)[number];

/** One craft. On hover a red band slides in from the edge the cursor crossed, a marquee runs in it. */
const CraftRow = ({ craft, index, on }: { craft: Craft; index: number; on: boolean }) => {
  const row = useRef<HTMLLIElement>(null);
  const [hot, setHot] = useState(false);
  // where the band stands, in % of the row: −101 above, 0 in, 101 below
  const band = useMotionValue(101);
  const y = useTransform(band, (v) => `${v}%`);
  const innerY = useTransform(band, (v) => `${-v}%`);
  const edge = (e: ReactPointerEvent) => {
    const r = row.current!.getBoundingClientRect();
    return e.clientY - r.top < r.height / 2 ? -101 : 101;
  };
  const enter = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    band.jump(edge(e));
    animate(band, 0, { type: 'spring', ...spring });
    setHot(true);
  };
  const leave = (e: ReactPointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    animate(band, edge(e), { type: 'spring', ...spring });
    setHot(false);
  };
  const words = Array.from({ length: 6 }, () => [craft.en, craft.ru]).flat();
  return (
    <li ref={row} className="kw-craft" data-hot={hot || undefined} onPointerEnter={enter} onPointerLeave={leave}>
      <span className="kw-craft__num">{pad(index + 1)}</span>
      <Rise className="kw-craft__en" on={on}>
        {craft.en}
      </Rise>
      <span className="kw-craft__side">
        <span className="kw-craft__ru">{craft.ru}</span>
        <span className="kw-craft__line">{craft.line}</span>
      </span>
      <motion.span className="kw-craft__band" style={{ y }} aria-hidden="true">
        <motion.span className="kw-craft__band-in" style={{ y: innerY }}>
          <span className="kw-craft__track">
            {[0, 1].map((half) => (
              <span key={half} className="kw-craft__half">
                {words.map((w, i) => (
                  <span key={i} className={i % 2 ? 'kw-craft__w kw-craft__w--ru' : 'kw-craft__w'}>
                    {w}
                    <i>✦</i>
                  </span>
                ))}
              </span>
            ))}
          </span>
        </motion.span>
      </motion.span>
    </li>
  );
};

export const KrotovIntro = () => {
  const { reduced } = useStage();
  const section = useRef<HTMLElement>(null);
  const sig = useRef<HTMLDivElement>(null);
  const pen = useRef<SignaturePen | null>(null);
  const signed = useRef(false);
  const sigIn = useInView(sig, { once: true, margin: '0px 0px -28% 0px' });
  const photo = useRef<HTMLDivElement>(null);
  const lit = useInView(photo, { once: true, margin: '0px 0px -25% 0px' });
  // the four crafts go up together, the moment the list shows (Рома: «сразу и все»)
  const list = useRef<HTMLUListElement>(null);
  const crafted = useInView(list, { once: true, margin: '0px 0px -8% 0px' });

  // the pen goes once the line it signs is well on screen
  const sign = () => {
    if (signed.current || !pen.current) return;
    signed.current = true;
    pen.current.write(0.35);
  };
  useEffect(() => {
    if (sigIn) sign();
  }, [sigIn]);

  // the portrait drifts a little slower than the page
  const { scrollYProgress } = useScroll({ target: section, offset: ['start end', 'end start'] });
  const photoY = useTransform(scrollYProgress, (p) => `${((0.5 - p) * 7).toFixed(2)}%`);

  // the cursor carries a warm light across the black (as the key light does on the rest of the page)
  const lx = useMotionValue(0);
  const ly = useMotionValue(0);
  const x = useSpring(lx, toMotion(springs.light));
  const y = useSpring(ly, toMotion(springs.light));
  const [aim, setAim] = useState(false);
  const move = (e: ReactPointerEvent) => {
    if (reduced || e.pointerType !== 'mouse') return;
    const r = section.current!.getBoundingClientRect();
    lx.set(e.clientX - r.left);
    ly.set(e.clientY - r.top);
    if (!aim) {
      x.jump(e.clientX - r.left);
      y.jump(e.clientY - r.top);
      setAim(true);
    }
  };

  return (
    <section ref={section} id="krotov" className="kw kw-intro" aria-labelledby="kw-title" onPointerMove={move} onPointerLeave={() => setAim(false)}>
      <span className="kw-cursor-field" aria-hidden="true">
        <motion.span className="kw-cursor-light" style={{ x, y, opacity: aim ? 1 : 0 }} />
      </span>
      <div className="kw-intro__grid">
        <div ref={photo} className="kw-portrait" data-lit={lit || reduced || undefined}>
          <motion.img
            src={asset('krotov/portrait.webp')}
            alt={`${k.name}, ${k.role}`}
            width={1116}
            height={2000}
            loading="lazy"
            decoding="async"
            style={reduced ? undefined : { y: photoY }}
          />
          <span className="kw-portrait__glow" aria-hidden="true" />
        </div>

        <div className="kw-intro__body">
          <p className="kw-kicker">{k.kicker}</p>
          <h2 id="kw-title" className="kw-sr">
            Krotov Work — {k.name}
          </h2>
          <div ref={sig} className="kw-sig-box">
            <SignatureInk
              className="kw-sig"
              onPen={(p) => {
                pen.current = p;
                p.warm();
                // the line may have arrived before the pen was ready: sign now, not never
                if (sigIn) sign();
              }}
            />
          </div>
          <p className="kw-who">
            <span className="kw-who__name">{k.name}</span>
            <span className="kw-who__role">{k.role}</span>
          </p>
          <p className="kw-lead">{k.lead}</p>
          <ul ref={list} className="kw-crafts">
            {k.crafts.map((c, i) => (
              <CraftRow key={c.en} craft={c} index={i} on={crafted || reduced} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

/* ——— Scene 02: selected works ——— */

const works = k.works;
const items = works.items;
const N = items.length;

/** position along the reel (0…N−1), resting on every shot for a while */
const detent = (p: number) => {
  const x = clamp01((p - 0.05) / 0.9) * (N - 1);
  const i = Math.min(Math.floor(x), N - 2);
  const fr = x - i;
  const hold = 0.2;
  return i + smoother(clamp01((fr - hold) / (1 - 2 * hold)));
};

type Work = (typeof items)[number];

// memo: the reel re-renders when the shot in front changes; the shots themselves need not
const Shot = memo(({
  work,
  index,
  at,
  video,
  stamp,
  onSeen
}: {
  work: Work;
  index: number;
  /** where the reel stands; null on a phone, where shots simply stack */
  at: MotionValue<number> | null;
  video: (el: HTMLVideoElement | null) => void;
  stamp: (el: HTMLSpanElement | null) => void;
  onSeen: (index: number) => void;
}) => {
  const box = useRef<HTMLElement>(null);
  const seen = useInView(box, { amount: 0.65 });
  useEffect(() => {
    if (seen && !at) onSeen(index);
  }, [seen, at, index, onSeen]);
  const fallback = useMotionValue(index);
  const pos = at ?? fallback;
  const far = useTransform(pos, (v) => Math.min(1, Math.abs(v - index)));
  const scale = useTransform(far, (d) => 1 - 0.1 * d);
  const dim = useTransform(far, (d) => d * 0.72);
  const capOpacity = useTransform(far, (d) => 1 - d);
  return (
    <motion.figure ref={box} className="kw-shot" style={at ? { scale } : undefined}>
      <div className="kw-shot__screen">
        <video
          ref={video}
          src={asset(`krotov/${work.key}.mp4`)}
          poster={asset(`krotov/${work.key}_0.jpg`)}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
        />
        <span className="kw-shot__hud" aria-hidden="true">
          <span>
            <i className="kw-rec" /> REC
          </span>
          <span ref={stamp}>00:00:00</span>
        </span>
        {work.here && <span className="kw-here">{works.here}</span>}
        {at && <motion.span className="kw-shot__dim" style={{ opacity: dim }} aria-hidden="true" />}
      </div>
      <motion.figcaption className="kw-shot__cap" style={at ? { opacity: capOpacity } : undefined}>
        <span className="kw-shot__name">{work.name}</span>
        <span className="kw-shot__what">{work.what}</span>
        <a className="kw-shot__link" href={work.href} target="_blank" rel="noopener">
          {works.open} <span aria-hidden="true">↗</span>
        </a>
      </motion.figcaption>
    </motion.figure>
  );
});

export const KrotovWorks = () => {
  const { reduced } = useStage();
  const phone = useMedia('(max-width: 899px)');
  const track = useRef<HTMLDivElement>(null);
  const reel = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const stamps = useRef<(HTMLSpanElement | null)[]>([]);
  const inView = useInView(track, { margin: '-10% 0px -10% 0px' });
  const [active, setActive] = useState(0);
  // stable ref callbacks, so the memoised shots really skip re-rendering
  const videoRefs = useMemo(() => items.map((_, i) => (el: HTMLVideoElement | null) => void (videos.current[i] = el)), []);
  const stampRefs = useMemo(() => items.map((_, i) => (el: HTMLSpanElement | null) => void (stamps.current[i] = el)), []);

  const { scrollYProgress } = useScroll({ target: track, offset: ['start start', 'end end'] });
  // the reel follows the scroll through a soft critically damped spring: wheel steps and Safari's
  // uneven scroll events arrive as one smooth travel, never as jumps (Рома, 2026-11-28: «дёрганно»)
  const raw = useTransform(scrollYProgress, detent);
  const smooth = useSpring(raw, { ...toMotion(springs.reel), restDelta: 0.0005 });
  const at = reduced ? raw : smooth;
  useMotionValueEvent(at, 'change', (v) => {
    if (!phone) setActive(Math.round(v));
  });

  // the reel's geometry, measured: shot width, step, the box it travels in
  const shotW = useMotionValue(0);
  const step = useMotionValue(0);
  const boxW = useMotionValue(0);
  useEffect(() => {
    const el = reel.current;
    if (!el || phone) return;
    const measure = () => {
      const first = el.firstElementChild as HTMLElement | null;
      if (!first) return;
      const w = first.offsetWidth;
      shotW.set(w);
      step.set(w + parseFloat(getComputedStyle(el).columnGap || '0'));
      boxW.set(el.parentElement!.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el.parentElement!);
    return () => ro.disconnect();
  }, [phone, shotW, step, boxW]);
  const reelX = useTransform([at, shotW, step, boxW], (v: number[]) => (v[3] - v[1]) / 2 - v[0] * v[2]);

  // the red marker under the names travels with the reel and spans exactly the name in front
  // (not the whole column: it ran on past the word toward the next one)
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const geo = useMotionValue<{ l: number[]; w: number[] }>({ l: [], w: [] });
  useEffect(() => {
    if (phone) return;
    const measure = () => {
      const els = labels.current;
      if (els.some((e) => !e)) return;
      const base = els[0]!.closest('.kw-tl')!.getBoundingClientRect().left;
      const r = els.map((e) => e!.getBoundingClientRect());
      geo.set({ l: r.map((b) => b.left - base), w: r.map((b) => b.width) });
    };
    measure();
    document.fonts?.ready.then(measure);
    const ro = new ResizeObserver(measure);
    labels.current.forEach((e) => e && ro.observe(e));
    return () => ro.disconnect();
  }, [phone, geo]);
  const along = (a: number[], v: number) => {
    if (!a.length) return 0;
    const i = Math.max(0, Math.min(a.length - 2, Math.floor(v)));
    const f = Math.max(0, Math.min(1, v - i));
    return a[i] + (a[i + 1] - a[i]) * f;
  };
  const markX = useTransform(() => along(geo.get().l, at.get()));
  const markW = useTransform(() => along(geo.get().w, at.get()));

  // only the shot in front plays (two videos at once drop Chrome on macOS to 30 fps — see the deck's notes)
  // Pausing is immediate; starting waits until the shot has stayed in front for a moment, so a fast
  // scroll past the reel (or a phone flicking through the stack) never wakes a decoder per shot —
  // that churn left Chrome pinned at 30 fps for the rest of the page (measured, 6× CPU throttle).
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (v && (i !== active || !inView || reduced)) v.pause();
    });
    if (!inView || reduced) return;
    const t = window.setTimeout(() => videos.current[active]?.play().catch(() => {}), 350);
    return () => window.clearTimeout(t);
  }, [active, inView, reduced]);
  useTicker(inView, () => {
    const v = videos.current[active];
    const s = stamps.current[active];
    if (!v || !s) return;
    // touch the DOM only when the code really changes: a text write is a style + layout pass
    const t = timecode(v.currentTime);
    if (s.textContent !== t) s.textContent = t;
  });

  /** the scroll position that brings shot i to the front */
  const seek = (i: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    const p = 0.05 + 0.9 * (i / (N - 1));
    window.scrollTo({ top: top + travel * p, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <section id="krotov-works" className="kw kw-works" aria-labelledby="kw-works-title">
      <div ref={track} className="kw-works__track">
        <div className="kw-works__pin">
          <header className="kw-works__head">
            <div>
              <p className="kw-kicker">{works.eyebrow}</p>
              <h2 id="kw-works-title" className="kw-works__title">
                <Rise className="kw-red">{works.title}</Rise>
              </h2>
            </div>
            <p className="kw-works__lead">{works.lead}</p>
            <p className="kw-count" aria-hidden="true">
              <span className="kw-count__now">{pad(active + 1)}</span>
              <span className="kw-count__all">/ {pad(N)}</span>
            </p>
          </header>

          <div className="kw-reel-box">
            <motion.div ref={reel} className="kw-reel" style={phone ? undefined : { x: reelX }}>
              {items.map((w, i) => (
                <Shot
                  key={w.key}
                  work={w}
                  index={i}
                  at={phone ? null : at}
                  video={videoRefs[i]}
                  stamp={stampRefs[i]}
                  onSeen={setActive}
                />
              ))}
            </motion.div>
          </div>

          <div className="kw-foot">
            <div className="kw-tl" role="tablist" aria-label="Сайты">
              {items.map((w, i) => (
                <button key={w.key} type="button" role="tab" aria-selected={i === active} className="kw-tab" onClick={() => seek(i)}>
                  <span
                    ref={(el) => {
                      labels.current[i] = el;
                    }}
                  >
                    {w.name}
                  </span>
                </button>
              ))}
              <span className="kw-tl__rail" aria-hidden="true">
                <motion.span className="kw-tl__marker" style={{ x: markX, width: markW }} />
              </span>
            </div>
            <div className="kw-cta">
              <GlossButton href="#contact" label={works.cta.label} onClick={() => markOrigin(`Krotov Work: «${works.cta.label}»`)} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
