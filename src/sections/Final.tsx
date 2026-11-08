import { useId, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useTransform } from 'motion/react';
import { Sheet } from '../components/Sheet';
import BlurText from '../components/reactbits/BlurText/BlurText';
import { content } from '../content';
import { chooseService, useService } from '../lead';
import { useReveal } from '../motion/reveal';
import { useStage } from '../motion/stage';
import { clamp01, springs, toMotion } from '../motion/tokens';
import './Final.css';

type Step = 'contact' | 'details' | 'thanks';
type Problem = '' | 'empty' | 'consent' | 'send';

/**
 * Where requests go: the Cloudflare Worker in `worker/`, which passes them to Telegram and email.
 * The address comes from the build (VITE_LEAD_ENDPOINT); without it nothing is sent — and the form says so.
 */
const LEAD_ENDPOINT: string | null = import.meta.env.VITE_LEAD_ENDPOINT || null;

type Lead = { stage: 'contact' | 'details'; contact: string; service?: string; task?: string; niche?: string; budget?: string; website?: string };

const sendLead = async (lead: Lead) => {
  if (LEAD_ENDPOINT === null) return;
  const res = await fetch(LEAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...lead, page: location.href }),
    keepalive: true
  });
  if (!res.ok) throw new Error(`lead ${res.status}`);
};

const STEP = { type: 'spring' as const, ...toMotion(springs.ui) };

/** The form is replaced between steps, so focus moves to the heading of the new one. */
const takeFocus = (el: HTMLElement | null) => el?.focus({ preventScroll: true });

/**
 * The close, on a sheet of lime: the service and a line about the task, then the one field that is required;
 * two optional questions after, then what happens next.
 */
export const Final = () => {
  const { reduced } = useStage();
  const f = content.final;
  const service = useService();
  const head = useReveal<HTMLDivElement>({ duration: 1.4 });
  const titleIn = useTransform(head.progress, (p) => clamp01((p - 0.1) / 0.9));
  const formIn = useTransform(head.progress, (p) => clamp01((p - 0.4) / 0.6));

  const [step, setStep] = useState<Step>('contact');
  const [contact, setContact] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [problem, setProblem] = useState<Problem>('');
  const [task, setTask] = useState('');
  const [niche, setNiche] = useState('');
  const [budget, setBudget] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const onContact = async (event: FormEvent) => {
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
      await sendLead({ stage: 'contact', contact: contact.trim(), service, task: task.trim(), website: trapRef.current?.value });
      setStep('details');
    } catch {
      setProblem('send');
    } finally {
      setSending(false);
    }
  };

  const onDetails = (event: FormEvent) => {
    event.preventDefault();
    // the answers come as an addition to the request already sent; a failure here loses nothing essential
    if (niche.trim() || budget) sendLead({ stage: 'details', contact: contact.trim(), niche: niche.trim(), budget }).catch(() => {});
    setStep('thanks');
  };

  const swap = reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 } };

  return (
    <Sheet tone="lime" id="contact" className="final">
      <div ref={head.ref} className="final__grid wrap block block--final">
        <div className="final__copy">
          <p className="eyebrow eyebrow--dot">{f.label}</p>
          <h2 className="final__title">
            <BlurText as="span" text={f.title[0]} progress={titleIn} stagger={0.12} />{' '}
            <BlurText as="span" className="final__title-rest" text={f.title[1]} progress={titleIn} stagger={0.07} />
          </h2>
          <BlurText className="final__lead" text={f.lead} progress={formIn} stagger={0.03} blur={5} rise={8} />
        </div>

        <motion.div className="final__box" style={{ opacity: formIn }}>
          <AnimatePresence mode="wait" initial={false}>
            {step === 'contact' ? (
              <motion.form key="contact" className="lead" onSubmit={onContact} noValidate {...swap} transition={STEP}>
                {/* One piece of black acrylic, scored into rows: what is needed, the task, how to reach you */}
                <div className="form-sheet acrylic">
                  <div className="form-row form-row--select">
                    <label className="form-row__label" htmlFor={`${id}-service`}>
                      {f.service}
                    </label>
                    {/* the same store a price or a section writes to: the choice travels with the visitor */}
                    <select
                      id={`${id}-service`}
                      className="form-row__select"
                      name="service"
                      value={service}
                      data-empty={service === '' || undefined}
                      onChange={(event) => chooseService(event.target.value)}
                    >
                      <option value="">{f.servicePick}</option>
                      {f.services.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <span className="form-row__chevron" aria-hidden="true" />
                  </div>
                  <div className="form-row form-row--task">
                    <label className="form-row__label" htmlFor={`${id}-task`}>
                      {f.task}
                      <span className="form-row__optional">{f.optional}</span>
                    </label>
                    <textarea
                      id={`${id}-task`}
                      className="form-row__area"
                      name="task"
                      rows={2}
                      placeholder={f.taskText}
                      value={task}
                      onChange={(event) => setTask(event.target.value)}
                    />
                  </div>
                  <div className="form-row field">
                    <label className="form-row__label" htmlFor={id}>
                      {f.contactLabel}
                    </label>
                    <input
                      ref={inputRef}
                      id={id}
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
                      <span className="btn__label field__submit-label">{f.submit}</span>
                      <span className="btn__label field__submit-arrow" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </div>
                </div>
                {/* left empty by people, filled by bots: the receiver drops such requests */}
                <input ref={trapRef} className="lead__trap" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <label className="consent">
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
                <p className="lead__status" id={`${id}-status`} role="status">
                  {problem === 'empty' ? f.empty : problem === 'consent' ? f.noConsent : problem === 'send' ? f.sendFailed : ''}
                </p>
                <div className="lead__foot">
                  <p>{f.hint}</p>
                  <a className="btn btn--outline btn--sm" href={f.direct.href} target="_blank" rel="noreferrer">
                    <span className="btn__label">{f.direct.label}</span>
                  </a>
                </div>
              </motion.form>
            ) : null}

            {step === 'details' ? (
              <motion.form key="details" className="lead" onSubmit={onDetails} {...swap} transition={STEP}>
                <h3 ref={takeFocus} className="lead__title" tabIndex={-1}>
                  {f.step2.title}
                </h3>
                <p className="lead__text">{f.step2.text}</p>
                <label className="lead__label" htmlFor={`${id}-niche`}>
                  {f.step2.niche}
                </label>
                <input
                  id={`${id}-niche`}
                  className="lead__input"
                  type="text"
                  placeholder={f.step2.nichePlaceholder}
                  value={niche}
                  onChange={(event) => setNiche(event.target.value)}
                />
                <fieldset className="lead__budget">
                  <legend className="lead__label">{f.step2.budget}</legend>
                  <div className="chips">
                    {f.step2.budgets.map((option) => (
                      <label key={option} className="chip">
                        <input type="radio" name="budget" value={option} checked={budget === option} onChange={() => setBudget(option)} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="lead__actions">
                  <button className="btn btn--acrylic" type="submit">
                    <span className="btn__dot" aria-hidden="true" />
                    <span className="btn__label">{f.step2.send}</span>
                  </button>
                  <button className="btn btn--outline" type="button" onClick={() => setStep('thanks')}>
                    <span className="btn__label">{f.step2.skip}</span>
                  </button>
                </div>
              </motion.form>
            ) : null}

            {step === 'thanks' ? (
              <motion.div key="thanks" className="lead lead--thanks" role="status" {...swap} transition={STEP}>
                <h3 ref={takeFocus} className="lead__title" tabIndex={-1}>
                  {f.thanks.title}
                </h3>
                <ol className="lead__next">
                  {f.thanks.next.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
                {LEAD_ENDPOINT === null ? <p className="lead__offline">{f.thanks.offline}</p> : null}
                <a className="btn btn--acrylic" href={f.thanks.channel.href} target="_blank" rel="noreferrer">
                  <span className="btn__dot" aria-hidden="true" />
                  <span className="btn__label">{f.thanks.channel.label}</span>
                </a>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    </Sheet>
  );
};
