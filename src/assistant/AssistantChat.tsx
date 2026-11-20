import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { asset } from '../asset';
import { content } from '../content';
import { useStage } from '../motion/stage';
import { springs, toMotion } from '../motion/tokens';
import { ask, reset, useAssistant, type Message } from './store';
import './Assistant.css';

const ARRIVE = { type: 'spring' as const, ...toMotion(springs.ui) };
const URL_RE = /(https?:\/\/[^\s<>«»"]+[^\s<>«»".,;:!?)])/g;

/** Plain text with its links made clickable — the reply is never treated as HTML. */
const Rich = ({ text }: { text: string }) => {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    parts.push(
      <a key={at} href={m[0]} target="_blank" rel="noreferrer">
        {m[0].replace(/^https?:\/\//, '')}
      </a>
    );
    last = at + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
};

const Bubble = ({ message, still }: { message: Message; still: boolean }) => {
  const a = content.assistant;
  return (
    <motion.div
      className={`alex__msg alex__msg--${message.role}`}
      initial={still ? false : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...ARRIVE, opacity: { duration: 0.2 } }}
    >
      <p className="alex__bubble">
        <Rich text={message.text} />
      </p>
      {message.lead ? (
        <span className={`alex__lead${message.lead === 'failed' ? ' alex__lead--failed' : ''}`}>{message.lead === 'sent' ? a.leadSent : a.leadFailed}</span>
      ) : null}
    </motion.div>
  );
};

/**
 * The conversation itself: head, thread, the first questions to tap, the field. Used in the corner panel
 * and in the AI section; both show the same thread. `autoFocus` puts the caret in the field on open.
 */
export const AssistantChat = ({ className = '', autoFocus = false, head }: { className?: string; autoFocus?: boolean; head?: ReactNode }) => {
  const a = content.assistant;
  const { reduced } = useStage();
  const { messages, thinking } = useAssistant();
  const [draft, setDraft] = useState('');
  const thread = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  // messages already there when the chat appears do not arrive again
  const [firstId] = useState(() => messages.at(-1)?.id ?? 0);

  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [messages.length, thinking, reduced]);

  useEffect(() => {
    if (autoFocus) field.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const send = (text: string) => {
    if (!text.trim() || thinking) return;
    setDraft('');
    void ask(text);
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  const fresh = messages.length === 1;
  return (
    <div className={`alex acrylic ${className}`.trim()}>
      <header className="alex__head">
        <img className="alex__avatar" src={asset('brand/mark.webp')} alt="" width={40} height={40} decoding="async" />
        <span className="alex__who">
          <strong>{a.name}</strong>
          <span>{thinking ? `${a.thinking}…` : a.role}</span>
        </span>
        {!fresh ? (
          <button className="alex__clear" type="button" onClick={reset}>
            {a.clear}
          </button>
        ) : null}
        {head}
      </header>

      <div ref={thread} className="alex__thread" role="log" aria-live="polite" aria-label={`Переписка с ${a.name}ом`}>
        {messages.map((m) => (
          <Bubble key={m.id} message={m} still={m.id <= firstId} />
        ))}
        {thinking ? (
          <span className="alex__typing" aria-label={`${a.name} ${a.thinking}`}>
            <i />
            <i />
            <i />
          </span>
        ) : null}
        {fresh ? (
          <div className="alex__suggest">
            {a.suggestions.map((s) => (
              <button key={s} type="button" className="alex__chip" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <form className="alex__form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor={`${id}-q`}>
          {a.placeholder}
        </label>
        <textarea
          ref={field}
          id={`${id}-q`}
          className="alex__field"
          rows={1}
          maxLength={1500}
          placeholder={a.placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(draft);
            }
          }}
        />
        <button className="btn btn--lime btn--sm alex__send" type="submit" disabled={thinking || !draft.trim()} aria-label={a.send}>
          <span className="btn__label" aria-hidden="true">
            →
          </span>
        </button>
      </form>
      <p className="alex__consent">
        {a.consent[0]}{' '}
        <a href={content.final.policy} target="_blank" rel="noreferrer">
          {a.consent[1]}
        </a>
        {' · '}
        <a href={a.telegram.href} target="_blank" rel="noreferrer">
          {a.telegram.label}
        </a>
      </p>
    </div>
  );
};
