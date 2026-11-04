import { useState } from 'react';
import { motion, useMotionValueEvent, useTransform, type MotionStyle, type MotionValue } from 'motion/react';
import StatusMark from './reactbits/StatusMark/StatusMark';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { settle } from '../motion/tokens';
import './ChatDemo.css';

/** Seconds into the dialogue at which each beat lands. */
const BEAT = { client: 0.35, agent: 1.55, handoff: 2.7, done: 3.7, end: 4.4 };

/** The dialogue runs once, when the element it is attached to comes into view. */
export const useDialogue = <T extends HTMLElement = HTMLDivElement>(delay = 0) => {
  const end = BEAT.end + delay;
  const { ref, progress } = useReveal<T>({ duration: end, to: end, margin: '0px 0px -30% 0px' });
  const time = useTransform(progress, (t) => t - delay);
  return { ref, time, progress };
};

/** A message arrives the way things arrive here: scale and opacity together, no bounce. */
const useArrive = (time: MotionValue<number>, at: number) => {
  const k = useTransform(time, (t) => settle(t - at, 0.5));
  return {
    opacity: k,
    y: useTransform(k, (v) => (1 - v) * 14),
    scale: useTransform(k, (v) => 0.94 + 0.06 * v)
  };
};

interface ChatDemoProps {
  time: MotionValue<number>;
  className?: string;
  style?: MotionStyle;
}

/** The demo dialogue: a client writes, the AI manager answers and hands the lead over. */
export const ChatDemo = ({ time, className = '', style }: ChatDemoProps) => {
  const stage = useStage();
  const chat = content.ai.chat;
  const [handed, setHanded] = useState(stage.reduced);
  useMotionValueEvent(time, 'change', (t) => {
    const next = t >= BEAT.done;
    if (next !== handed) setHanded(next);
  });

  const client = useArrive(time, BEAT.client);
  const agent = useArrive(time, BEAT.agent);
  const handoff = useArrive(time, BEAT.handoff);

  return (
    <motion.div
      className={`chat acrylic ${className}`.trim()}
      style={style}
      role="img"
      aria-label={`Демо: диалог клиента с AI-менеджером в ${chat.channel}`}
    >
      <header className="chat__head">
        <span className="chat__avatar" aria-hidden="true">
          AI
        </span>
        <span className="chat__who">
          <strong>{chat.agent}</strong>
          <span>{chat.channel}</span>
        </span>
        <span className="tag">{chat.demo}</span>
      </header>

      <div className="chat__body" aria-hidden="true">
        <motion.p className="chat__when" style={{ opacity: client.opacity }}>
          {chat.when}
        </motion.p>
        <motion.p className="bubble bubble--client" style={client}>
          {chat.messages[0].text}
        </motion.p>
        <motion.p className="bubble bubble--agent" style={agent}>
          {chat.messages[1].text}
        </motion.p>
        <motion.div className="chat__handoff" style={handoff}>
          <StatusMark status={handed ? 'done' : 'running'} size={18} label={handed ? chat.handoff.done : chat.handoff.running} />
        </motion.div>
      </div>

      <footer className="chat__foot" aria-hidden="true">
        {chat.footnote}
      </footer>
    </motion.div>
  );
};
