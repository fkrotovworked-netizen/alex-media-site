// From React Bits (reactbits.dev) — OptionWheel, adapted for Alex Media.
// Kept: the geometry. Options sit on a circle whose arc between two neighbours is
// one row, so `tilt` curls the wheel and `curve` sets its depth; opacity, blur and
// colour fall off with the distance from the selection (--ow-p); listbox semantics,
// arrow keys, click to select, drag.
// Changed: the wheel has no clock of its own. Its position is a MotionValue handed
// in by the page and moved by the project's springs — no private rAF loop, no
// exponential smoothing. It never captures the mouse wheel, so the page scroll is
// not hijacked: clicks, keys and drags are reported through `onSeek` / `onDrag`
// and the owner decides how to get there. Row height comes from the CSS font size,
// so the wheel is sized in CSS. Options beyond the visible arc are not painted.
// The tick sound is not loaded from a file here: the page synthesises it (motion/tick.ts).
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { MotionValue } from 'motion/react';
import './OptionWheel.css';

type Side = 'left' | 'right';

export interface OptionWheelProps {
  items: readonly string[];
  /** Fractional index the wheel is turned to. */
  position: MotionValue<number>;
  /** Index announced as selected. */
  selected: number;
  /** A discrete request: click on an option, arrow keys, Home / End. */
  onSeek: (index: number) => void;
  /** A drag, in rows from where it started. */
  onDrag?: (rows: number, phase: 'start' | 'move' | 'end') => void;
  label: string;
  side?: Side;
  /** Row height as a multiple of the font size. */
  spacing?: number;
  curve?: number;
  tilt?: number;
  blur?: number;
  fade?: number;
  minOpacity?: number;
  /** Options further than this from the selection are not painted. */
  reach?: number;
  className?: string;
  style?: CSSProperties;
}

const OptionWheel = ({
  items,
  position,
  selected,
  onSeek,
  onDrag,
  label,
  side = 'left',
  spacing = 1.5,
  curve = 1,
  tilt = 5,
  blur = 1.6,
  fade = 0.24,
  minOpacity = 0,
  reach = 5,
  className = '',
  style
}: OptionWheelProps) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowH = useRef(48);
  const drag = useRef<{ y: number; id: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Lays every option out along the curve by its distance from the position.
  const layout = useCallback(() => {
    const at = position.get();
    const mirror = side === 'right' ? -1 : 1;
    const tiltRad = (tilt * Math.PI) / 180;
    const R = tiltRad > 0.0005 ? rowH.current / tiltRad : 0;

    for (let i = 0; i < items.length; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const d = i - at;
      const dist = Math.abs(d);
      if (dist > reach) {
        el.style.visibility = 'hidden';
        continue;
      }
      let x = 0;
      let y = d * rowH.current;
      let rot = 0;
      if (R > 0) {
        const ang = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, d * tiltRad));
        y = R * Math.sin(ang);
        x = -mirror * R * (1 - Math.cos(ang)) * curve;
        rot = (mirror * ang * 180) / Math.PI;
      }
      el.style.visibility = 'visible';
      el.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${rot.toFixed(3)}deg)`;
      el.style.opacity = Math.max(minOpacity, 1 - dist * fade).toFixed(3);
      el.style.filter = blur > 0 && dist > 0.02 ? `blur(${(dist * blur).toFixed(2)}px)` : 'none';
      el.style.setProperty('--ow-p', Math.max(0, 1 - Math.min(dist, 1)).toFixed(4));
    }
  }, [position, items.length, side, tilt, curve, blur, fade, minOpacity, reach]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      rowH.current = Math.max((parseFloat(getComputedStyle(root).fontSize) || 32) * spacing, 1);
      layout();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    const stop = position.on('change', layout);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [layout, position, spacing]);

  const last = items.length - 1;
  const clampIndex = (index: number) => Math.min(Math.max(index, 0), last);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = selected - 1;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = selected + 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    onSeek(clampIndex(next));
  };

  // A touch scrolls the page (which is what turns the wheel); only a mouse drags it.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onDrag || e.pointerType !== 'mouse' || e.button !== 0) return;
    drag.current = { y: e.clientY, id: e.pointerId, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || !onDrag) return;
    const dy = e.clientY - state.y;
    if (!state.moved && Math.abs(dy) > 4) {
      state.moved = true;
      // captured only once a real drag starts, so plain clicks still reach the options
      rootRef.current?.setPointerCapture(state.id);
      setDragging(true);
      onDrag(0, 'start');
    }
    if (state.moved) onDrag(-dy / rowH.current, 'move');
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;
    if (!state.moved) return;
    setDragging(false);
    onDrag?.(-(e.clientY - state.y) / rowH.current, 'end');
    // the click that ends a drag is not a selection
    const swallow = (event: MouseEvent) => event.stopPropagation();
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
  };

  return (
    <div
      ref={rootRef}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={`${id}-${selected}`}
      className={`option-wheel${side === 'right' ? ' option-wheel--right' : ''}${dragging ? ' option-wheel--dragging' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          id={`${id}-${index}`}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          role="option"
          aria-selected={selected === index}
          className={`option-wheel__item${selected === index ? ' option-wheel__item--selected' : ''}`}
          onClick={() => onSeek(index)}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

export default OptionWheel;
