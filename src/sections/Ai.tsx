import { motion, useTransform, type MotionValue } from 'motion/react';
import { asset } from '../asset';
import { SectionHead } from '../components/SectionHead';
import { Sheet } from '../components/Sheet';
import { content } from '../content';
import { chooseService } from '../lead';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { clamp01, settle } from '../motion/tokens';
import './Ai.css';

const num = (i: number) => String(i + 1).padStart(2, '0');

interface PlateProps {
  index: number;
  /** -1 on the left of the head, 1 on the right: the plate comes in from its own side. */
  side: -1 | 1;
  /** Its place in its column, top to bottom. */
  row: number;
  progress: MotionValue<number>;
}

/** One direction on a plate of black acrylic: number, name and the whole text, readable without a click. */
const Plate = ({ index, side, row, progress }: PlateProps) => {
  const { title, text } = content.ai.duties[index];
  const t = useTransform(progress, (p) => settle(p * 1.5 - 0.25 - row * 0.12, 0.7));
  const x = useTransform(t, (v) => (1 - v) * 24 * side);
  const opacity = useTransform(t, (v) => clamp01(v * 1.4));
  return (
    <motion.li className="ai__plate acrylic" style={{ x, opacity }}>
      <span className="ai__num">{num(index)}</span>
      <h3 className="ai__plate-title">{title}</h3>
      <p className="ai__plate-text">{text}</p>
    </motion.li>
  );
};

/**
 * Рома, 2026-11-20: the android became just its head, and the six directions stand on plates either side
 * of it — three and three, all of them in sight at once (the map with points and one open card hid five of six).
 */
export const Ai = () => {
  const stage = useStage();
  const { label, title, lead, head: pic, duties, cta } = content.ai;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const map = useReveal<HTMLDivElement>({ duration: 1.6, margin: '0px 0px -20% 0px' });

  // the head leans with the camera, as everything the cursor's light falls on
  const rotateY = useTransform(stage.cam.x, (v) => v * 5);
  const rotateX = useTransform(stage.cam.y, (v) => 1 - v * 3);
  const picIn = useTransform(map.progress, (p) => settle(p * 1.6, 0.7));
  const picY = useTransform(picIn, (v) => (1 - v) * 28);
  const ctaIn = useTransform(map.progress, (p) => clamp01((p - 0.7) / 0.3));

  const half = Math.ceil(duties.length / 2);
  const column = (from: number, to: number, side: -1 | 1) => (
    <ol className={`ai__plates ai__plates--${side < 0 ? 'left' : 'right'}`} start={from + 1}>
      {duties.slice(from, to).map((_, i) => (
        <Plate key={from + i} index={from + i} side={side} row={i} progress={map.progress} />
      ))}
    </ol>
  );

  return (
    <Sheet id="ai" className="ai">
      <div className="wrap block">
        <div ref={head.ref} className="ai__head">
          <SectionHead label={label} title={title} lead={lead} progress={head.progress} />
        </div>

        <div ref={map.ref} className="ai__map">
          {column(0, half, -1)}
          <motion.figure
            className="ai__face"
            style={stage.reduced ? undefined : { rotateX, rotateY, opacity: picIn, y: picY, transformPerspective: 1600 }}
          >
            <img src={asset(pic.src)} alt={pic.alt} width={pic.width} height={pic.height} loading="lazy" decoding="async" />
          </motion.figure>
          {column(half, duties.length, 1)}
        </div>

        <motion.div className="ai__cta" style={{ opacity: ctaIn }}>
          <a className="btn btn--acrylic" href={cta.href} onClick={() => chooseService(cta.service, `Блок AI: «${cta.label}»`)}>
            <span className="btn__dot" aria-hidden="true" />
            <span className="btn__label">{cta.label}</span>
          </a>
        </motion.div>
      </div>
    </Sheet>
  );
};
