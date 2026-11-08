import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { SectionHead } from '../components/SectionHead';
import { Sheet } from '../components/Sheet';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { springs, toMotion } from '../motion/tokens';
import './Faq.css';

const OPEN = { type: 'spring' as const, ...toMotion(springs.ui) };

type Answer = (typeof content.faq.items)[number]['a'];

const Item = ({ q, a, open, onToggle }: { q: string; a: Answer; open: boolean; onToggle: () => void }) => {
  const { reduced } = useStage();
  const id = useId();
  return (
    <li className="faq__item" data-open={open || undefined}>
      <h3>
        <button className="faq__q" type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}>
          <span>{q}</span>
          <span className="faq__mark" aria-hidden="true" />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={id}
            className="faq__a"
            initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={OPEN}
          >
            <div className="faq__body">
              {a.map((block, i) =>
                typeof block === 'string' ? (
                  <p key={i}>{block}</p>
                ) : (
                  <ul key={i}>
                    {block.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
};

export const Faq = () => {
  const { label, title, lead, items } = content.faq;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const [open, setOpen] = useState(0);

  return (
    <Sheet id="faq" className="faq">
      <div className="faq__grid wrap block">
        <div ref={head.ref} className="faq__head">
          <SectionHead label={label} title={title} lead={lead} progress={head.progress} />
        </div>
        <ul className="faq__list">
          {items.map((item, i) => (
            <Item key={item.q} q={item.q} a={item.a} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </ul>
      </div>
    </Sheet>
  );
};
