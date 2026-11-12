import { useCallback, useState } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import { AuditDialog } from '../components/AuditDialog';
import { SectionHead } from '../components/SectionHead';
import { content } from '../content';
import { useReveal } from '../motion/reveal';
import { clamp01 } from '../motion/tokens';
import './Audit.css';

type Cell = boolean | string;

const Value = ({ value }: { value: Cell }) =>
  value === true ? (
    <svg className="audit__tick" viewBox="0 0 16 16" role="img" aria-label="да">
      <path d="M3 8.5l3.2 3L13 4.5" />
    </svg>
  ) : value === false ? (
    <span className="audit__dash" role="img" aria-label="нет">
      —
    </span>
  ) : (
    <span>{value}</span>
  );

/** Rows arrive one after another, as if the audit were being filled in. */
const Row = ({ index, name, free, paid, time }: { index: number; name: string; free: Cell; paid: Cell; time: MotionValue<number> }) => {
  const at = 0.2 + index * 0.06;
  const opacity = useTransform(time, (t) => clamp01((t - at) / 0.4));
  return (
    <motion.div className="audit__row" role="row" style={{ opacity }}>
      <span className="audit__name" role="rowheader">
        {name}
      </span>
      <span className="audit__cell" role="cell">
        <Value value={free} />
      </span>
      <span className="audit__cell audit__cell--paid" role="cell">
        <Value value={paid} />
      </span>
    </motion.div>
  );
};

/**
 * The way in for those not ready to buy a service yet. The free look is the one lit action;
 * the full audit is set beside it on the same piece of acrylic, so the difference reads at a glance.
 */
export const Audit = () => {
  const { label, title, lead, cta, caption, plans, confirm, order, rows } = content.audit;
  const head = useReveal<HTMLDivElement>({ duration: 1.3 });
  const sheet = useReveal<HTMLDivElement>({ duration: 1.2, to: 1.2 });
  const ctaIn = useTransform(head.progress, (p) => clamp01((p - 0.55) / 0.45));
  const sheetY = useTransform(sheet.progress, (p) => (1 - clamp01(p * 1.4)) * 24);
  // the plan the sign-up window opens on, null while it is closed
  const [dialog, setDialog] = useState<number | null>(null);
  const close = useCallback(() => setDialog(null), []);

  return (
    <section className="audit block" id="audit">
      <div className="audit__grid wrap">
        <div ref={head.ref} className="audit__head">
          <SectionHead label={label} title={title} lead={lead} progress={head.progress} />
          <motion.div className="audit__cta" style={{ opacity: ctaIn }}>
            <button className="btn btn--lime" type="button" aria-haspopup="dialog" onClick={() => setDialog(0)}>
              <span className="btn__label">{cta.label}</span>
            </button>
          </motion.div>
        </div>

        <motion.div
          ref={sheet.ref}
          className="audit__sheet acrylic"
          role="table"
          aria-label={label}
          style={{ opacity: sheet.progress, y: sheetY }}
        >
          <div className="audit__row audit__row--head" role="row">
            <span className="audit__caption" role="columnheader">
              {caption}
            </span>
            {plans.map((plan, i) => (
              <span key={plan.name} className={`audit__plan${i === 1 ? ' audit__plan--paid' : ''}`} role="columnheader">
                <span className="audit__plan-name">{plan.name}</span>
                <span className="audit__price">{plan.price}</span>
                <span className="audit__format">
                  {plan.format}
                  {plan.confirm ? <span className="confirm audit__confirm">{confirm}</span> : null}
                </span>
              </span>
            ))}
          </div>

          {rows.map((row, i) => (
            <Row key={row.name} index={i} name={row.name} free={row.free} paid={row.paid} time={sheet.progress} />
          ))}

          <div className="audit__row audit__row--foot">
            <span />
            <span />
            <button className="btn btn--outline btn--sm audit__order" type="button" aria-haspopup="dialog" onClick={() => setDialog(1)}>
              <span className="btn__label">{order.label}</span>
            </button>
          </div>
        </motion.div>
      </div>
      <AuditDialog plan={dialog} onClose={close} />
    </section>
  );
};
