// LogoLoop (React Bits, reactbits.dev/r/LogoLoop-TS-CSS), adapted for Alex Media.
// Kept: the idea of the loop — the set of logos is repeated as many times as the strip is wide,
//   so the seam is never in view; the track moves by exactly one set and starts over;
//   the movement eases down on hover instead of stopping dead; the ends of the strip fade out;
//   the repeats are hidden from screen readers, only the first set is read.
// Changed: the original is ~1300 lines that move the track from requestAnimationFrame on the main thread
//   (and add tilt, orbit, drag, magnify, labels, tooltips). Here the track's `transform` is handed to
//   Motion's `animate`, which runs it as a WAAPI animation on the compositor: no work per frame on the
//   main thread. Hover changes only the animation's playback speed, through a critically damped spring
//   (springs.ui), so the strip glides to a halt and picks up again — no bounce. The fade is a CSS mask on
//   the window (the original painted a gradient of a set colour over it), so the grain and light behind
//   show through. It plays only while on screen. Reduced motion: one still set, nothing moves.
import { animate } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStage } from '../../../motion/stage';
import { springs, toMotion } from '../../../motion/tokens';
import './LogoLoop.css';

interface LogoLoopProps<T> {
  items: readonly T[];
  render: (item: T) => ReactNode;
  itemKey: (item: T) => string;
  /** pixels per second */
  speed?: number;
  className?: string;
}

export function LogoLoop<T>({ items, render, itemKey, speed = 36, className = '' }: LogoLoopProps<T>) {
  const { reduced } = useStage();
  const windowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);
  const [geo, setGeo] = useState({ copies: 2, width: 0 });

  // how wide one set is, and how many sets cover the window and one more
  useEffect(() => {
    const win = windowRef.current;
    const set = setRef.current;
    if (!win || !set || reduced) return;
    const measure = () => {
      const width = set.getBoundingClientRect().width;
      if (width === 0) return;
      const copies = Math.max(2, Math.ceil(win.clientWidth / width) + 1);
      setGeo((g) => (g.width === width && g.copies === copies ? g : { width, copies }));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(win);
    ro.observe(set);
    measure();
    return () => ro.disconnect();
  }, [reduced]);

  useEffect(() => {
    const win = windowRef.current;
    const track = trackRef.current;
    if (!win || !track || reduced || geo.width === 0) return;
    const run = animate(
      track,
      { transform: ['translate3d(0px, 0, 0)', `translate3d(${-geo.width}px, 0, 0)`] },
      { duration: geo.width / speed, ease: 'linear', repeat: Infinity }
    );
    run.pause();

    let visible = false;
    let hovered = false;
    let rate = 1;
    let glide: { stop: () => void } | null = null;
    const ease = (to: number) => {
      glide?.stop();
      glide = animate(rate, to, {
        type: 'spring',
        ...toMotion(springs.ui),
        onUpdate: (v) => {
          rate = v;
          run.speed = Math.max(v, 0.0001);
        }
      });
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) run.play();
      else run.pause();
    });
    io.observe(win);

    const enter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      hovered = true;
      ease(0);
    };
    const leave = () => {
      if (!hovered) return;
      hovered = false;
      ease(1);
    };
    win.addEventListener('pointerenter', enter);
    win.addEventListener('pointerleave', leave);
    return () => {
      io.disconnect();
      glide?.stop();
      run.stop();
      track.style.transform = '';
      win.removeEventListener('pointerenter', enter);
      win.removeEventListener('pointerleave', leave);
    };
  }, [geo.width, reduced, speed]);

  const copies = reduced ? 1 : geo.copies;
  return (
    <div ref={windowRef} className={`logo-loop${reduced ? ' logo-loop--still' : ''} ${className}`}>
      <div ref={trackRef} className="logo-loop__track">
        {Array.from({ length: copies }, (_, copy) => (
          <ul key={copy} ref={copy === 0 ? setRef : undefined} className="logo-loop__set" aria-hidden={copy > 0 || undefined}>
            {items.map((item) => (
              <li key={itemKey(item)} className="logo-loop__item">
                {render(item)}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
