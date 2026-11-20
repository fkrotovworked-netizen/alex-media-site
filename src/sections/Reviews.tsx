import { motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { asset } from '../asset';
import { SectionHead } from '../components/SectionHead';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { clamp01 } from '../motion/tokens';
import './Reviews.css';

/** The clip playing now: starting another one stops it. */
let playingNow: HTMLVideoElement | null = null;

/**
 * A video review: the poster in its recess and one round button. A click plays it with sound and pauses
 * whatever else was playing; a click again pauses. Time runs as a line of lime light along its foot.
 */
const Clip = ({ src, poster, who }: { src: string; poster: string | null; who: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const time = useMotionValue(0);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const step = () => {
      const v = ref.current;
      if (v && v.duration) time.set(v.currentTime / v.duration);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, time]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      if (playingNow && playingNow !== v) playingNow.pause();
      playingNow = v;
      void v.play();
    } else v.pause();
  };

  return (
    <button
      type="button"
      className="review__media review__media--video clip"
      data-playing={playing || undefined}
      aria-label={`${playing ? content.reviews.pause : content.reviews.play}: ${who}`}
      onClick={toggle}
    >
      <video
        ref={ref}
        src={asset(src)}
        poster={poster ? asset(poster) : undefined}
        playsInline
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(e) => {
          e.currentTarget.load();
          time.set(0);
        }}
      />
      <span className={`clip__play${playing ? '' : ' clip__play--play'}`} aria-hidden="true">
        <svg viewBox="0 0 24 24">{playing ? <path d="M7 5h3.4v14H7zM13.6 5H17v14h-3.4z" /> : <path d="M7 4.5v15l12.5-7.5z" />}</svg>
      </span>
      <span className="clip__time" aria-hidden="true">
        <motion.span style={{ scaleX: time }} />
      </span>
    </button>
  );
};

/**
 * Only real reviews. One sheet of acrylic in two bands cut by a facet: the letters, each
 * with its scan and who signed it (no quotes — Рома, 2026-11-09), then the vertical video reviews. A review
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
                  <Clip src={video.src} poster={video.poster} who={video.who} />
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
