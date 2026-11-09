// Glass Folder Cards (Рома прислал), adapted for Alex Media as the folder of a tariff's cases.
// Kept: the object itself — a back panel, real files between real panels, a frosted front panel
// hinged on its bottom edge; its outlines, the fan (slot, depth, a little seeded jitter per file).
// Changed: every move is a Motion spring from tokens (the original overshot, cubic-bezier 1.36);
// no generated artwork, add key, menu or counter — the files are the case covers and open the
// articles; no tilt after the cursor (the cursor moves the light, not single elements); smoked
// glass only. It is not clicked open: it rises out of the cell's top edge and fans while the
// tariff is lit, and sinks back when it is not.
// Frame rate (Safari dropped to ~20 fps with the original build): no backdrop-filter and no
// clip-path on anything that moves — the panels are filled SVG shapes, the edge the folder rises
// from is a plain overflow box, every moving part is its own layer (will-change: transform), so
// a frame only recomposites — but only while it moves (`data-live`): idle layers cost the whole
// page memory. Covers are decoded as the prices come near the screen, not at page load and not
// mid-flight.
import { motion, type Variants } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import type { CaseStudy } from '../cases';
import { useStage } from '../motion/stage';
import { springs, toMotion } from '../motion/tokens';
import './CasesFolder.css';

// The stage is drawn at 340 × 272 and scaled to `width`, so the outlines can be fixed paths.
const W = 340;
const H = 272;
const HEADROOM = 54;
const FRONT_H = 198;
const MAX_VISIBLE = 4;

const BACK_PATH =
  'M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z';
const FRONT_PATH = `M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 ${FRONT_H - 22}A22 22 0 0 1 318 ${FRONT_H}L22 ${FRONT_H}A22 22 0 0 1 0 ${FRONT_H - 22}Z`;

// soft and long: the folder is a heavy object, nothing overshoots
const spring = { type: 'spring', ...toMotion(springs.glide) } as const;
const fade = { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] } as const;

/** A stable jitter per file, so the stack never looks machine-squared. */
const jitter = (name: string) => {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return {
    x: (((h >>> 0) % 1000) / 1000 - 0.5) * 10,
    r: (((h >>> 10) % 1000) / 1000 - 0.5) * 3.2
  };
};

const plural = (n: number) =>
  n % 10 === 1 && n % 100 !== 11
    ? 'кейс'
    : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)
      ? 'кейса'
      : 'кейсов';

interface CasesFolderProps {
  open: boolean;
  label: string;
  files: readonly CaseStudy[];
  /** Width in px; the rest scales with it. */
  width?: number;
}

export const CasesFolder = ({ open, label, files, width = 216 }: CasesFolderProps) => {
  const { reduced } = useStage();
  const filesRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');
  const rootRef = useRef<HTMLDivElement>(null);
  // its parts are layers from the moment it starts to rise until it has sunk again
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (open) setLive(true);
  }, [open]);
  const k = width / W;
  const visible = files.slice(0, MAX_VISIBLE);
  const state = open ? 'open' : 'shut';

  // a sunk folder is out of the tab order
  useEffect(() => {
    filesRef.current?.toggleAttribute('inert', !open);
  }, [open]);

  // decode the covers once the prices are a screen away, so the first rise never waits on them
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        for (const file of files.slice(0, MAX_VISIBLE)) {
          const img = new Image();
          img.src = file.cover;
          img.decode().catch(() => {});
        }
      },
      { rootMargin: '100% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [files]);

  const rise: Variants = reduced
    ? { shut: { opacity: 0 }, open: { opacity: 1, transition: fade } }
    : {
        shut: { y: '100%', transition: { ...spring, delay: 0.06 } },
        open: { y: '0%', transition: spring }
      };
  const hinge: Variants = {
    shut: { rotateX: 0, transition: reduced ? { duration: 0 } : spring },
    open: {
      rotateX: -24,
      transition: reduced ? { duration: 0 } : { ...spring, delay: 0.1 }
    }
  };

  return (
    <div
      ref={rootRef}
      className="case-folder"
      data-live={live || undefined}
      style={{ '--cf-w': `${width}px` } as never}
      aria-hidden={!open}
    >
      <motion.div
        className="cf-rise"
        style={{ width, height: (H + HEADROOM) * k }}
        initial={false}
        animate={state}
        variants={rise}
        onAnimationComplete={(name) => name === 'shut' && setLive(false)}
      >
        <div className="cf-stage" style={{ transform: `translateY(${HEADROOM * k}px) scale(${k})` }}>
          <svg className="cf-panel cf-back" viewBox={`0 0 ${W} ${H}`} aria-hidden>
            <defs>
              <linearGradient id={`cf-back-${uid}`} x1="0.1" y1="0" x2="0.3" y2="1">
                <stop offset="0" stopColor="#24252a" />
                <stop offset="0.7" stopColor="#0d0e0f" />
              </linearGradient>
            </defs>
            <path d={BACK_PATH} fill={`url(#cf-back-${uid})`} stroke="rgb(255 255 255 / 0.14)" />
          </svg>

          <div ref={filesRef} className="cf-files">
            {visible.map((file, v) => {
              const slot = visible.length <= 1 ? 0 : (v / (visible.length - 1)) * 2 - 1;
              const depth = visible.length - 1 - v;
              const j = jitter(file.name);
              const openY = -96 - depth * 30;
              const sheet: Variants = {
                shut: {
                  x: j.x,
                  y: 42 - depth * 15,
                  rotate: j.r,
                  transition: reduced ? { duration: 0 } : spring
                },
                open: {
                  x: j.x + slot * 40,
                  y: openY,
                  rotate: j.r + slot * 5,
                  transition: reduced ? { duration: 0 } : { ...spring, delay: 0.12 + depth * 0.04 }
                }
              };
              return (
                <motion.a
                  key={file.name}
                  className="cf-sheet"
                  href={file.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ zIndex: v + 1 }}
                  variants={sheet}
                  whileHover={open && !reduced ? { y: openY - 18, rotate: slot * 3, transition: spring } : undefined}
                >
                  <img
                    className="cf-sheet-art"
                    src={file.cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                  <span className="cf-sheet-head">
                    <span className="cf-sheet-name">{file.name}</span>
                    <span className="cf-sheet-meta">{file.niche}</span>
                  </span>
                </motion.a>
              );
            })}
          </div>

          <motion.div className="cf-front" style={{ transformPerspective: 760 }} variants={hinge}>
            {/* smoked glass without a live blur: dense enough at the bottom to hide the pocket */}
            <svg className="cf-panel" viewBox={`0 0 ${W} ${FRONT_H}`} aria-hidden>
              <defs>
                <linearGradient id={`cf-tint-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#2a2b2f" stopOpacity="0.72" />
                  <stop offset="0.45" stopColor="#141517" stopOpacity="0.93" />
                  <stop offset="1" stopColor="#08090a" stopOpacity="0.99" />
                </linearGradient>
                <radialGradient id={`cf-sheen-${uid}`} cx="0.22" cy="0" r="0.7">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`cf-rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
                  <stop offset="0.35" stopColor="#fff" stopOpacity="0.22" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              <path d={FRONT_PATH} fill={`url(#cf-tint-${uid})`} />
              <path d={FRONT_PATH} fill={`url(#cf-sheen-${uid})`} />
              <path d={FRONT_PATH} fill="none" stroke={`url(#cf-rim-${uid})`} strokeWidth="2.4" />
            </svg>
            <div className="cf-label">
              <span className="cf-title">{label}</span>
              <span className="cf-meta">
                {files.length} {plural(files.length)}
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
