import { motion, useTransform, type MotionValue } from 'motion/react';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { clamp01, settle } from '../motion/tokens';
import './Stats.css';

type Stat = (typeof content.stats.items)[number];

/** The figure counts up as the strip arrives — a year is a year, so it is not counted. */
const Figure = ({ item, index, time }: { item: Stat; index: number; time: MotionValue<number> }) => {
  const at = 0.15 + index * 0.12;
  const counts = item.value < 1000;
  const shown = useTransform(time, (t) =>
    counts ? Math.round(item.value * settle(t - at, 1.1)).toString() : item.value.toString()
  );
  const cellIn = useTransform(time, (t) => clamp01((t - at) / 0.5));
  const y = useTransform(cellIn, (v) => (1 - v) * 10);

  return (
    <motion.li className={`stat${index === content.stats.items.length - 1 ? ' stat--lit acrylic' : ''}`} style={{ opacity: cellIn, y }}>
      <Icon name={item.icon} className="stat__icon" />
      <p className="stat__figure">
        {item.prefix ? <span className="stat__prefix">{item.prefix}</span> : null}
        <motion.span>{shown}</motion.span>
        {item.suffix}
      </p>
      <p className="stat__text">
        {item.text}
        {item.confirm ? <span className="confirm stat__confirm">{content.stats.confirm}</span> : null}
      </p>
    </motion.li>
  );
};

export const Stats = () => {
  const { label, items } = content.stats;
  const { ref, progress } = useReveal<HTMLUListElement>({ duration: 2.2, to: 2.2, margin: '0px 0px -10% 0px' });

  return (
    <Sheet className="stats">
      <div className="wrap stats__wrap">
        <h2 className="sr-only">{label}</h2>
        <ul ref={ref} className="stats__row">
          {items.map((item, i) => (
            <Figure key={item.text} item={item} index={i} time={progress} />
          ))}
        </ul>
      </div>
    </Sheet>
  );
};
