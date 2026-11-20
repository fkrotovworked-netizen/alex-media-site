import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { content } from '../content';
import { useStage } from '../motion/stage';
import { springs, toMotion } from '../motion/tokens';
import { AssistantChat } from './AssistantChat';
import { setOpen, useAssistant } from './store';

const RISE = { type: 'spring' as const, ...toMotion(springs.ui) };
const FADE = { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] as const };

/**
 * The corner of every screen once the hero is behind: a small acrylic button, and the chat panel it opens.
 * The panel is not modal — the page stays usable behind it; Esc or the button folds it back. While the chat
 * in the AI section is on screen the button steps aside, so the same conversation is never shown twice.
 */
export const AssistantDock = () => {
  const a = content.assistant;
  const { reduced } = useStage();
  const { open, inlineInView, thinking } = useAssistant();
  const [past, setPast] = useState(false);

  useEffect(() => {
    const check = () => setPast(window.scrollY > window.innerHeight * 0.7);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const showButton = past && !inlineInView && !open;
  const motionIn = reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 };
  const motionOut = reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 };

  return (
    <div className="alex-dock">
      <AnimatePresence>
        {open && !inlineInView ? (
          <motion.div
            key="panel"
            className="alex-dock__panel"
            role="dialog"
            aria-modal="false"
            aria-label={a.name}
            initial={motionOut}
            animate={motionIn}
            exit={motionOut}
            transition={{ ...RISE, opacity: FADE }}
          >
            <AssistantChat
              className="alex--panel"
              autoFocus
              head={
                <button className="alex__fold" type="button" onClick={() => setOpen(false)} aria-label={a.close}>
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </button>
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showButton ? (
          <motion.button
            key="fab"
            type="button"
            className="btn btn--acrylic alex-dock__fab"
            aria-label={a.open}
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
            initial={motionOut}
            animate={motionIn}
            exit={motionOut}
            transition={{ ...RISE, opacity: FADE }}
          >
            <span className={`btn__dot${thinking ? ' alex-dock__dot--busy' : ''}`} aria-hidden="true" />
            <span className="btn__label">{a.fab}</span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
