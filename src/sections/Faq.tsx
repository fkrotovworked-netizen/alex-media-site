import { useId, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { SectionHead } from '../components/SectionHead';
import { Sheet } from '../components/Sheet';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { springs, toMotion } from '../motion/tokens';
import './Faq.css';

/*
 * The answer opens on a spring, as before — but the sheet never feels it. Animating the height used to resize
 * the whole FAQ sheet on every frame: the plate behind it (grain, gradients) and the lime form sheet below were
 * repainted, and every ResizeObserver on the page re-measured it, so Safari froze (Рома, 2026-11-20).
 * Now the list is its own layout boundary (`contain: size layout`) with a height set in steps, never per frame:
 * on a toggle it takes room for the larger of the answer closing and the answer opening, the spring moves the
 * answers inside that box, and once it settles the list shrinks to what is open. (Until 2026-11-26 the room was
 * always the longest answer: on a phone that left a screen of empty sheet under the questions — Рома.)
 */
const OPEN = { type: 'spring' as const, ...toMotion(springs.ui) };

type Answer = (typeof content.faq.items)[number]['a'];

interface ItemProps {
  q: string;
  a: Answer;
  open: boolean;
  onToggle: () => void;
  onSettled: () => void;
}

const Item = ({ q, a, open, onToggle, onSettled }: ItemProps) => {
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
        onAnimationComplete={onSettled}
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
  // the questions' total height and each answer body's natural height, at the current width
  const sizes = useRef<{ rows: number; bodies: number[] }>({ rows: 0, bodies: [] });
  const openRef = useRef(open);
  const body = (i: number) => (i >= 0 ? sizes.current.bodies[i] ?? 0 : 0);
  const fit = (...shown: number[]) => setRoom(Math.ceil(sizes.current.rows + Math.max(0, ...shown.map(body)) + 2));

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const rows = [...list.querySelectorAll<HTMLElement>('.faq__item > h3')].reduce((sum, el) => sum + el.offsetHeight, 0);
      const bodies = [...list.querySelectorAll<HTMLElement>('.faq__body')].map((el) => el.offsetHeight);
      sizes.current = { rows, bodies };
      fit(openRef.current);
    };
    measure();
    // the questions and the answers themselves: a new width or the display font arriving re-wraps them
    const observer = new ResizeObserver(measure);
    list.querySelectorAll('.faq__item > h3, .faq__body').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const toggle = (i: number) => {
    const next = open === i ? -1 : i;
    // room for both while the spring runs, so nothing inside ever spills out of the box
    fit(open, next);
    openRef.current = next;
    setOpen(next);
  };
  // the answers have settled: the list takes just what is open
  const settled = () => fit(openRef.current);

  return (
    <Sheet id="faq" className="faq">
      <div className="faq__grid wrap block">
        <div ref={head.ref} className="faq__head">
          <SectionHead label={label} title={title} lead={lead} progress={head.progress} />
        </div>
        <ul ref={listRef} className="faq__list" style={room ? { height: room } : undefined} data-boxed={room ? '' : undefined}>
          {items.map((item, i) => (
            <Item key={item.q} q={item.q} a={item.a} open={open === i} onToggle={() => toggle(i)} onSettled={settled} />
          ))}
        </ul>
      </div>
    </Sheet>
  );
};
