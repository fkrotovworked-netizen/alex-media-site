import { useEffect, useRef } from 'react';
import { motion, useInView, useTransform } from 'motion/react';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { clamp01 } from '../motion/tokens';
import { AssistantChat } from './AssistantChat';
import { setInlineInView } from './store';

/**
 * Алекс in the AI section, on the paper: what an AI assistant is, shown by one that works. The same
 * conversation as the corner button; while this one is on screen the corner one steps aside.
 */
export const AssistantInline = () => {
  const t = content.assistant.inline;
  const box = useRef<HTMLDivElement>(null);
  const seen = useInView(box, { amount: 0.35 });
  const head = useReveal<HTMLDivElement>({ duration: 1.2 });
  const chatIn = useTransform(head.progress, (p) => clamp01((p - 0.3) / 0.7));
  const chatY = useTransform(chatIn, (v) => (1 - v) * 20);

  useEffect(() => {
    setInlineInView(seen);
    return () => setInlineInView(false);
  }, [seen]);

  return (
    <div ref={box} className="ai__ask">
      <div ref={head.ref} className="ai__ask-copy">
        <h3 className="ai__ask-title">
          {t.title[0]} <span>{t.title[1]}</span>
        </h3>
        <p className="ai__ask-lead">{t.lead}</p>
      </div>
      <motion.div className="ai__ask-chat" style={{ opacity: chatIn, y: chatY }}>
        <AssistantChat className="alex--inline" />
      </motion.div>
    </div>
  );
};
