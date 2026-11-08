import { motion, useTransform } from 'motion/react';
import { asset } from '../asset';
import { SectionHead } from '../components/SectionHead';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { clamp01 } from '../motion/tokens';
import './Reviews.css';

/**
 * Only real reviews. One sheet of acrylic in two bands cut by a facet: the letters, each
 * with its scan and a line quoted word for word, then the vertical video reviews. A review
 * without its file is left out — nothing is made up to fill the space.
 */
export const Reviews = () => {
  const r = content.reviews;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const sheet = useReveal<HTMLDivElement>({ duration: 1 });
  const sheetY = useTransform(sheet.progress, (p) => (1 - clamp01(p * 1.4)) * 24);

  return (
    <section className="reviews block" id="reviews">
      <div className="wrap">
        <div ref={head.ref}>
          <SectionHead className="head--split" label={r.label} title={r.title} lead={r.lead} progress={head.progress} />
        </div>

        <motion.div ref={sheet.ref} className="reviews__sheet acrylic" style={{ opacity: sheet.progress, y: sheetY }}>
          <ul className="reviews__band reviews__band--letters">
            {r.letters.map((letter) => (
              <li key={letter.company} className="review">
                <a className="review__media review__media--letter" href={asset(letter.scan.src)} target="_blank" rel="noreferrer" aria-label={`${r.open}: ${letter.company}`}>
                  <img src={asset(letter.scan.src)} alt="" width={letter.scan.width} height={letter.scan.height} loading="lazy" decoding="async" />
                </a>
                <blockquote className="review__quote">«{letter.quote}»</blockquote>
                <p className="review__who">
                  {letter.who}
                  <span>{letter.company}</span>
                </p>
              </li>
            ))}
          </ul>

          <ul className="reviews__band reviews__band--videos">
            {r.videos.map((video) =>
              video.src ? (
                <li key={video.company} className="review">
                  <video
                    className="review__media review__media--video"
                    src={asset(video.src)}
                    poster={asset(video.poster)}
                    controls
                    playsInline
                    preload="none"
                  />
                  <p className="review__who">
                    {video.who}
                    <span>{video.company}</span>
                  </p>
                </li>
              ) : null
            )}
          </ul>
        </motion.div>
      </div>
    </section>
  );
};
