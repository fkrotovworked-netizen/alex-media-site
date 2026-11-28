import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { clamp01, smoother } from '../../motion/tokens';
import './cut.css';

/*
 * The cut from Alex Media into Krotov Work — «Росчерк» (Рома's pick of three, 2026-11-28).
 * A short pinned screen the scroll plays through: a red pen line crosses it on the slant of the K's
 * long stroke; on one side «Alex Media» in the agency's face, on the other «Krotov Work» on black.
 * The clip is a rotated, oversized box moving along its own axis, its content counter-moved —
 * only transforms change, nothing repaints.
 */

const ANGLE = -24;
/** the clip box, in vmax: as wide and tall as the screen's diagonal needs, no more — it used to be
 *  300×300 vmax, a layer of tens of megapixels the GPU had to carry through the whole cut */
const W = 160;
/** how far the edge travels each side of the centre, in vmax (the half-diagonal is ≤ 71) */
const TRAVEL = 78;
/** p remapped from [a, b] to 0…1, smoothed */
const span = (p: number, a: number, b: number) => smoother(clamp01((p - a) / (b - a)));

export const KrotovCut = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  // where the edge stands across the screen, in vmax from the centre (rotated frame)
  const edge = useTransform(p, (v) => TRAVEL - span(v, 0.08, 0.86) * TRAVEL * 2);
  const wrap = useTransform(edge, (e) => `rotate(${ANGLE}deg) translateX(${e + W / 2}vmax)`);
  const inner = useTransform(edge, (e) => `translateX(${-(e + W / 2)}vmax) rotate(${-ANGLE}deg)`);
  const line = useTransform(edge, (e) => `rotate(${ANGLE}deg) translateX(${e}vmax)`);
  const lineOpacity = useTransform(p, (v) => span(v, 0.02, 0.1) * (1 - span(v, 0.84, 0.94)));
  return (
    <div ref={ref} className="kw cut" aria-hidden="true">
      <div className="cut-pin">
        <div className="cut-layer cut-layer--am">
          <p className="cut-eyebrow">Digital-агентство</p>
          <p className="cut-am-word">Alex Media</p>
          <p className="cut-eyebrow cut-eyebrow--under">Реклама · AI · Автоматизация</p>
        </div>
        <motion.div className="cut-wrap" style={{ transform: wrap }}>
          <motion.div className="cut-inner" style={{ transform: inner }}>
            <div className="cut-layer cut-layer--kw">
              <p className="cut-kw-eyebrow">Production</p>
              <p className="cut-kw-word">Krotov Work</p>
              <p className="cut-kw-eyebrow cut-eyebrow--under">Websites · Decks · CRM · Editing</p>
            </div>
          </motion.div>
        </motion.div>
        <motion.span className="cut-line" style={{ transform: line, opacity: lineOpacity }} />
      </div>
    </div>
  );
};
