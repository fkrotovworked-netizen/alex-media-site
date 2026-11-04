// From React Bits (reactbits.dev) — ShinyText, adapted for Alex Media.
// Kept: a highlight clipped to the glyphs.
// Changed: no endless loop. The highlight is the scene's light — its position comes
// from CSS variables set on the nearest [data-shine-root], so several lines of a
// heading share one continuous light instead of each shimmering on its own.
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import './ShinyText.css';

interface ShinyTextProps {
  children: ReactNode;
  className?: string;
  /** Catches the lime bounce from below, for the line nearest the form. */
  bounce?: boolean;
}

const ShinyText = ({ children, className = '', bounce = false }: ShinyTextProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  // Each line needs to know where it sits inside the root to share its coordinates.
  useLayoutEffect(() => {
    const el = ref.current;
    const root = el?.closest<HTMLElement>('[data-shine-root]');
    if (!el || !root) return;

    const place = () => {
      let x = 0;
      let y = 0;
      for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
        x += n.offsetLeft;
        y += n.offsetTop;
      }
      el.style.setProperty('--ox', `${x}px`);
      el.style.setProperty('--oy', `${y}px`);
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(root);
    document.fonts?.ready.then(place);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={`shiny-text ${bounce ? 'shiny-text--bounce' : ''} ${className}`.trim()}>
      {children}
    </span>
  );
};

export default ShinyText;
