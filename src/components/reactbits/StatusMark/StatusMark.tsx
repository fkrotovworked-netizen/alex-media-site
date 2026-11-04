// From React Bits (reactbits.dev) — StatusMark, adapted for Alex Media.
// Kept: one glyph that changes in place — a dashed idle ring closes into a
// travelling arc while the task runs, then into a full ring with a drawn check.
// Changed: the ring morphs on the project's `ui` spring instead of a bezier
// tween; "done" is the brand lime, the one colour that means a result here;
// spoken labels are Russian. The failed / cancelled states, the cross and the
// label strike are removed — nothing on the site fails in front of a visitor.
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'motion/react';
import { springs, toMotion } from '../../../motion/tokens';
import './StatusMark.css';

export type StatusMarkStatus = 'pending' | 'running' | 'done';

export interface StatusMarkProps {
  status?: StatusMarkStatus;
  label?: ReactNode;
  size?: number;
  strokeWidth?: number;
  dashes?: number;
  spinDuration?: number;
  arcLength?: number;
  className?: string;
  style?: CSSProperties;
}

const UI = { type: 'spring' as const, ...toMotion(springs.ui) };
const CHECK = 'M7.5 12.25 10.5 15.25 16.75 8.75';
const TEXT: Record<StatusMarkStatus, string> = {
  pending: 'Ожидает',
  running: 'Выполняется',
  done: 'Готово'
};
const IDLE_DASH = 0.3;

const StatusMark = ({
  status = 'pending',
  label,
  size = 20,
  strokeWidth = 2,
  dashes = 8,
  spinDuration = 1100,
  arcLength = 0.68,
  className = '',
  style
}: StatusMarkProps) => {
  const reduce = useReducedMotion();
  const r = 10 - strokeWidth / 2;
  const C = 2 * Math.PI * r;
  const P = C / Math.max(1, dashes);
  const running = status === 'running';
  const solid = status !== 'pending';
  const targetArc = running ? arcLength : 1;

  const mode = useMotionValue(solid ? 1 : 0);
  const arc = useMotionValue(targetArc);
  const travel = useMotionValue(0);
  const ringRef = useRef<SVGCircleElement>(null);
  const geo = useRef({ C, P });
  geo.current = { C, P };
  const gen = useRef(0);

  const writeDash = () => {
    const g = geo.current;
    const m = mode.get();
    const a = arc.get();
    const dash = IDLE_DASH * g.P + (a * g.C - IDLE_DASH * g.P) * m;
    const gap = (1 - IDLE_DASH) * g.P + ((1 - a) * g.C - (1 - IDLE_DASH) * g.P) * m;
    ringRef.current?.setAttribute('stroke-dasharray', `${Math.max(0, dash)} ${Math.max(0, gap)}`);
  };

  useLayoutEffect(() => {
    writeDash();
    ringRef.current?.setAttribute('stroke-dashoffset', String(travel.get()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [C, P]);

  useEffect(() => {
    const offs = [
      mode.on('change', writeDash),
      arc.on('change', writeDash),
      travel.on('change', (v: number) => ringRef.current?.setAttribute('stroke-dashoffset', String(v)))
    ];
    return () => {
      offs.forEach((off) => off());
      mode.stop();
      arc.stop();
      travel.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const g = ++gen.current;
    if (reduce) {
      mode.jump(solid ? 1 : 0);
      arc.jump(targetArc);
      travel.jump(0);
      return;
    }
    if (mode.get() === 0) arc.jump(targetArc);
    animate(mode, solid ? 1 : 0, UI);
    animate(arc, targetArc, UI);
    if (running) {
      const t0 = travel.get();
      animate(travel, [t0, t0 - C], { duration: spinDuration / 1000, ease: 'linear', repeat: Infinity });
      return;
    }
    const to = Math.floor(travel.get() / P) * P;
    animate(travel, to, UI).then(() => {
      if (gen.current === g) travel.jump(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, targetArc, reduce, C, P, spinDuration]);

  const hasLabel = label !== undefined && label !== null;

  return (
    <span
      className={`status-mark${className ? ` ${className}` : ''}`}
      data-status={status}
      data-indeterminate={running ? '' : undefined}
      style={{ '--sm-size': `${size}px`, '--sm-stroke': strokeWidth, ...style } as CSSProperties}
    >
      <svg
        className="status-mark__glyph"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        role={hasLabel ? undefined : 'img'}
        aria-label={hasLabel ? undefined : TEXT[status]}
        aria-hidden={hasLabel || undefined}
      >
        <circle className="status-mark__track" cx="12" cy="12" r={r} transform="rotate(-90 12 12)" />
        <circle ref={ringRef} className="status-mark__ring" cx="12" cy="12" r={r} transform="rotate(-90 12 12)" />
        <path className="status-mark__check" d={CHECK} pathLength="1" />
      </svg>
      {hasLabel ? <span className="status-mark__label">{label}</span> : null}
    </span>
  );
};

export default StatusMark;
