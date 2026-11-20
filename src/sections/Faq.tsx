import { useId, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { SectionHead } from '../components/SectionHead';
import { Sheet } from '../components/Sheet';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { springs, toMotion } from '../motion/tokens';
import { Deco } from '../components/Deco';
import './Faq.css';

/*
 * The answer opens on a spring, as before — but the sheet never feels it. Animating the height used to resize
 * the whole FAQ sheet on every frame: the plate behind it (grain, gradients) and the lime form sheet below were
 * repainted, and every ResizeObserver on the page re-measured it, so Safari froze (Рома, 2026-11-20).
 * Now the list is given, up front, the height it has with its longest answer open, and is its own layout
 * boundary (`contain: size layout`): the spring moves the answers inside that box, nothing outside it changes.
 */
const OPEN = { type: 'spring' as const, ...toMotion(springs.ui) };

type Answer = (typeof content.faq.items)[number]['a'];

interface ItemProps {
  q: string;
  a: Answer;
  open: boolean;
  onToggle: () => void;
}

const Item = ({ q, a, open, onToggle }: ItemProps) => {
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
      {/* always mounted, so its full height is known before it opens */}
      <motion.div
        id={id}
        className="faq__a"
        initial={false}
        animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        transition={reduced ? { duration: 0 } : OPEN}
        inert={!open}
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
    </li>
  );
};

export const Faq = () => {
  const { label, title, lead, items } = content.faq;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const [open, setOpen] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const [room, setRoom] = useState<number | null>(null);

  // The list's height with every question closed and the longest answer open: measured from the questions and
  // the answers' bodies (their natural height, whatever their box shows), again whenever the width changes.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let width = -1;
    const measure = () => {
      if (list.clientWidth === width) return;
      width = list.clientWidth;
      const rows = [...list.querySelectorAll<HTMLElement>('.faq__item > h3')].reduce((sum, el) => sum + el.offsetHeight, 0);
      const longest = Math.max(0, ...[...list.querySelectorAll<HTMLElement>('.faq__body')].map((el) => el.offsetHeight));
      setRoom(Math.ceil(rows + longest + 2));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list.parentElement ?? list);
    return () => observer.disconnect();
  }, []);

  return (
    <Sheet id="faq" className="faq">
      <div className="faq__grid wrap block">
        <div ref={head.ref} className="faq__head">
          <SectionHead label={label} title={title} lead={lead} progress={head.progress} />
          {/* a drop that hangs under the heading and travels down with it */}
          <Deco name="drip" className="deco--faq" depth={30} rotate={-6} />
        </div>
        <ul ref={listRef} className="faq__list" style={room ? { height: room } : undefined} data-boxed={room ? '' : undefined}>
          {items.map((item, i) => (
            <Item key={item.q} q={item.q} a={item.a} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
          ))}
        </ul>
      </div>
    </Sheet>
  );
};
