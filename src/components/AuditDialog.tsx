import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { content } from '../content';
import { LEAD_ENDPOINT, sendLead } from '../lead';
import { useStage } from '../motion/stage';
import { springs, toMotion } from '../motion/tokens';
import './AuditDialog.css';

type Problem = '' | 'empty' | 'consent' | 'send';

const RISE = { type: 'spring' as const, ...toMotion(springs.ui) };
const FADE = { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] as const };

/**
 * Sign-up for the audit: a native modal <dialog> (top layer, the page behind is inert, Esc is the browser's own),
 * holding one piece of black acrylic — the two plans as rows of one sheet, then the contact as in the final form.
 * The panel rises on the UI spring, nothing overshoots; the dimmed graphite behind is a short fade.
 */
const Panel = ({ initial, onClose }: { initial: number; onClose: () => void }) => {
  const { reduced } = useStage();
  const a = content.audit;
  const d = a.dialog;
  const f = content.final;
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState(initial);
  const [task, setTask] = useState('');
  const [contact, setContact] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState<Problem>('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const back = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    // focus lands on the chosen plan, not on the close button
    dialog.querySelector<HTMLInputElement>('input[name="audit-plan"]:checked')?.focus({ preventScroll: true });
    // Esc: the browser would close at once; the panel leaves on its own motion instead
    const cancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', cancel);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      if (dialog.open) dialog.close();
      root.style.overflow = overflow;
      back?.focus({ preventScroll: true });
    };
  }, [onClose]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    if (contact.trim() === '') {
      setProblem('empty');
      inputRef.current?.focus();
      return;
    }
    if (!agreed) {
      setProblem('consent');
      return;
    }
    setProblem('');
    setSending(true);
    try {
      await sendLead({ stage: 'contact', contact: contact.trim(), service: a.plans[plan].service, task: task.trim(), website: trapRef.current?.value });
      setDone(true);
    } catch {
      setProblem('send');
    } finally {
      setSending(false);
    }
  };

  const panel = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 28, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 16, scale: 0.985 } };

  return (
    <dialog ref={dialogRef} className="audit-dialog" aria-labelledby={`${id}-title`}>
      <motion.div className="audit-dialog__scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FADE} />
      <motion.div className="audit-dialog__panel acrylic" {...panel} transition={{ ...RISE, opacity: FADE }}>
        <header className="audit-dialog__head">
          <p className="eyebrow eyebrow--dot">{d.label}</p>
          <button className="audit-dialog__close" type="button" onClick={onClose} aria-label={d.close}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        {done ? (
          <div className="audit-dialog__done" role="status">
            <h2 id={`${id}-title`} className="audit-dialog__title" tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })}>
              {d.thanks.title}
            </h2>
            <p className="audit-dialog__text">{d.thanks.text}</p>
            {LEAD_ENDPOINT === null ? <p className="audit-dialog__offline">{f.thanks.offline}</p> : null}
            <button className="btn btn--outline btn--sm" type="button" onClick={onClose}>
              <span className="btn__label">{d.done}</span>
            </button>
          </div>
        ) : (
          <form className="audit-dialog__form" onSubmit={onSubmit} noValidate>
            <h2 id={`${id}-title`} className="audit-dialog__title">
              {d.title}
            </h2>

            {/* the two plans: rows of one sheet, scored by a facet, not two cards */}
            <fieldset className="audit-plans">
              <legend className="sr-only">{d.plan}</legend>
              {a.plans.map((p, i) => (
                <label key={p.name} className="audit-plan">
                  <input type="radio" name="audit-plan" value={i} checked={plan === i} onChange={() => setPlan(i)} />
                  <span className="audit-plan__mark" aria-hidden="true" />
                  <span className="audit-plan__body">
                    <span className="audit-plan__name">{p.name}</span>
                    <span className="audit-plan__format">{p.format}</span>
                  </span>
                  <span className="audit-plan__price">
                    {p.price}
                    {p.confirm ? <span className="confirm">{a.confirm}</span> : null}
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="form-sheet audit-dialog__sheet">
              <div className="form-row form-row--task">
                <label className="form-row__label" htmlFor={`${id}-task`}>
                  {d.task}
                  <span className="form-row__optional">{f.optional}</span>
                </label>
                <textarea
                  id={`${id}-task`}
                  className="form-row__area"
                  name="task"
                  rows={2}
                  placeholder={d.taskText}
                  value={task}
                  onChange={(event) => setTask(event.target.value)}
                />
              </div>
              <div className="form-row field">
                <label className="form-row__label" htmlFor={`${id}-contact`}>
                  {f.contactLabel}
                </label>
                <input
                  ref={inputRef}
                  id={`${id}-contact`}
                  className="field__input"
                  name="contact"
                  type="text"
                  autoComplete="tel"
                  placeholder={f.field}
                  value={contact}
                  aria-describedby={`${id}-status`}
                  aria-invalid={problem === 'empty' || undefined}
                  onChange={(event) => {
                    setContact(event.target.value);
                    if (problem === 'empty') setProblem('');
                  }}
                />
                <button className="btn btn--lime btn--sm field__submit" type="submit" disabled={sending} aria-busy={sending || undefined}>
                  <span className="btn__label field__submit-label">{d.submit}</span>
                  <span className="btn__label field__submit-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            </div>
            <input ref={trapRef} className="lead__trap" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

            <label className="consent audit-dialog__consent">
              <input
                type="checkbox"
                checked={agreed}
                aria-invalid={problem === 'consent' || undefined}
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  if (problem === 'consent') setProblem('');
                }}
              />
              <span className="consent__box" aria-hidden="true" />
              <span>
                {f.consent[0]}{' '}
                <a href={f.policy} target="_blank" rel="noreferrer">
                  {f.consent[1]}
                </a>
              </span>
            </label>
            <p className="audit-dialog__status" id={`${id}-status`} role="status">
              {problem === 'empty' ? f.empty : problem === 'consent' ? f.noConsent : problem === 'send' ? f.sendFailed : ''}
            </p>
          </form>
        )}
      </motion.div>
    </dialog>
  );
};

/** `plan` is the plan to start on, or null while closed. */
export const AuditDialog = ({ plan, onClose }: { plan: number | null; onClose: () => void }) =>
  createPortal(<AnimatePresence>{plan === null ? null : <Panel key="audit-dialog" initial={plan} onClose={onClose} />}</AnimatePresence>, document.body);
