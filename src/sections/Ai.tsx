import { motion, useTransform, type MotionValue } from 'motion/react';
import { asset } from '../asset';
import { useDialogue } from '../components/ChatDemo';
import { SectionHead } from '../components/SectionHead';
import { Sheet } from '../components/Sheet';
import BlurText from '../components/reactbits/BlurText/BlurText';
import { content } from '../content';
import { chooseService } from '../lead';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { clamp01, settle } from '../motion/tokens';
import './Ai.css';

/** Directions to the left of the panel, the rest to the right. */
const LEFT = 3;

const Note = ({ index, time }: { index: number; time: MotionValue<number> }) => {
  const duty = content.ai.duties[index];
  const at = 0.9 + index * 0.25;
  const line = useTransform(time, (t) => settle(t - at, 0.6));
  const textIn = useTransform(time, (t) => clamp01((t - at - 0.1) / 0.7));

  return (
    <li className="ai__note">
      <div className="ai__lead">
        <motion.h3 className="ai__name" style={{ opacity: textIn }}>
          {duty.title}
        </motion.h3>
        {/* the line runs from the direction to the one employee who works in it */}
        <motion.span className="ai__line" style={{ scaleX: line }} aria-hidden="true" />
        <motion.span className="ai__node" style={{ opacity: line, scale: line }} aria-hidden="true" />
      </div>
      <BlurText className="ai__text" text={duty.text} progress={textIn} stagger={0.03} blur={5} rise={6} />
    </li>
  );
};

/** One object in the middle of the room — Sanya's AI android — and the directions written around it. */
export const Ai = () => {
  const stage = useStage();
  const { label, title, lead, android, duties, cta } = content.ai;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const talk = useDialogue(0.3);

  const rotateY = useTransform(stage.cam.x, (v) => v * 5);
  const rotateX = useTransform(stage.cam.y, (v) => 3 - v * 3.5);
  const panelIn = useTransform(talk.time, (t) => settle(t + 0.3, 0.7));
  const panelY = useTransform(panelIn, (v) => (1 - v) * 28);
  const ctaIn = useTransform(talk.progress, (t) => settle(t - 2, 0.6));

  const indices = duties.map((_, i) => i);

  return (
    <Sheet id="ai" className="ai">
      <div className="wrap block">
        <div ref={head.ref} className="ai__head">
          <SectionHead label={label} title={title} lead={lead} progress={head.progress} />
        </div>

        <div ref={talk.ref} className="ai__rig">
          <ul className="ai__side ai__side--left">
            {indices.slice(0, LEFT).map((i) => (
              <Note key={i} index={i} time={talk.progress} />
            ))}
          </ul>
          <div className="ai__panel">
            <div className="ai__pool" aria-hidden="true" />
            <motion.figure className="ai__android" style={stage.reduced ? undefined : { rotateX, rotateY, opacity: panelIn, y: panelY }}>
              <img src={asset(android.src)} alt={android.alt} width={1448} height={1086} loading="lazy" decoding="async" />
            </motion.figure>
          </div>
          <ul className="ai__side ai__side--right">
            {indices.slice(LEFT).map((i) => (
              <Note key={i} index={i} time={talk.progress} />
            ))}
          </ul>
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
