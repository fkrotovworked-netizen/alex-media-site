import { motion, useTransform } from 'motion/react';
import { Icon } from '../components/Icon';
import { SectionHead } from '../components/SectionHead';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { clamp01 } from '../motion/tokens';
import './Reviews.css';

/**
 * Only real reviews, with the client's consent. Until the videos and letters arrive
 * the slots say what belongs in them — nothing is made up to fill the space.
 */
export const Reviews = () => {
  const { label, title, lead, slots, empty } = content.reviews;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const sheet = useReveal<HTMLUListElement>({ duration: 1 });
  const sheetY = useTransform(sheet.progress, (p) => (1 - clamp01(p * 1.4)) * 24);

  return (
    <section className="reviews block" id="reviews">
      <div className="wrap">
        <div ref={head.ref}>
          <SectionHead className="head--split" label={label} title={title} lead={lead} progress={head.progress} />
        </div>

        <motion.ul ref={sheet.ref} className="reviews__sheet acrylic" style={{ opacity: sheet.progress, y: sheetY }}>
          {slots.map((slot, i) => (
            <li key={i} className="review">
              <div className={`review__media review__media--${slot.kind}`}>
                <span className="review__icon">
                  <Icon name={slot.kind === 'video' ? 'play' : 'letter'} />
                </span>
                <span className="review__kind">{slot.label}</span>
              </div>
              <p className="review__who">
                {slot.who}
                <span>{slot.company}</span>
              </p>
              <span className="confirm">{empty}</span>
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
};
