import { useSyncExternalStore } from 'react';
import { content } from '../content';
import { LEAD_ENDPOINT } from '../lead';

// One conversation with Алекс for the whole page: the corner button and the chat in the AI section
// read and write the same thread. It lives for the tab's session (sessionStorage), so a reload keeps it.

export type Role = 'user' | 'assistant';
export interface Message {
  id: number;
  role: Role;
  text: string;
  /** a request was handed over in this answer */
  lead?: 'sent' | 'failed';
  /** an answer the site gave itself (no model): offline, an error — never sent back to the model */
  local?: boolean;
}

interface State {
  messages: Message[];
  thinking: boolean;
  /** the corner panel */
  open: boolean;
  /** the chat in the AI section is on screen: the corner button steps aside */
  inlineInView: boolean;
}

const KEY = 'alex-assistant';
const greeting = (): Message => ({ id: 0, role: 'assistant', text: content.assistant.greeting, local: true });

/**
 * Where messages go: worker/chat.js. In the build it sits beside the form receiver (VITE_LEAD_ENDPOINT + /chat);
 * VITE_ASSISTANT_ENDPOINT overrides it, and in development `?alex=<url>` does (tools/mock-assistant.mjs).
 */
const ENDPOINT: string | null =
  (import.meta.env.DEV && new URLSearchParams(location.search).get('alex')) ||
  import.meta.env.VITE_ASSISTANT_ENDPOINT ||
  (LEAD_ENDPOINT ? `${LEAD_ENDPOINT.replace(/\/$/, '')}/chat` : null);

const load = (): Message[] => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {}
  return [greeting()];
};

let state: State = { messages: load(), thinking: false, open: false, inlineInView: false };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  if (patch.messages) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state.messages.slice(-40)));
    } catch {}
  }
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useAssistant = () => useSyncExternalStore(subscribe, () => state);

let nextId = Date.now();
const push = (m: Omit<Message, 'id'>) => set({ messages: [...state.messages, { ...m, id: nextId++ }] });

export const setOpen = (open: boolean) => set({ open });
export const setInlineInView = (inlineInView: boolean) => {
  if (state.inlineInView !== inlineInView) set({ inlineInView });
};
export const reset = () => set({ messages: [greeting()], thinking: false });

export const ask = async (raw: string) => {
  const text = raw.trim().slice(0, 1500);
  if (!text || state.thinking) return;
  push({ role: 'user', text });
  const a = content.assistant;
  if (ENDPOINT === null) {
    set({ thinking: true });
    await new Promise((r) => setTimeout(r, 700));
    set({ thinking: false });
    push({ role: 'assistant', text: a.offline, local: true });
    return;
  }

  set({ thinking: true });
  try {
    const history = state.messages.filter((m) => !m.local).map(({ role, text: t }) => ({ role, content: t }));
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, page: location.href })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 503) push({ role: 'assistant', text: a.offline, local: true });
    else if (res.status === 429) push({ role: 'assistant', text: a.busy, local: true });
    else if (!res.ok || typeof data.reply !== 'string') push({ role: 'assistant', text: a.failed, local: true, lead: data.lead });
    else push({ role: 'assistant', text: data.reply, lead: data.lead });
  } catch {
    push({ role: 'assistant', text: a.failed, local: true });
  } finally {
    set({ thinking: false });
  }
};
