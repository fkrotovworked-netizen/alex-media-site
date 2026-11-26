import { useSyncExternalStore } from 'react';

// The service a visitor asked about, carried from a price or a section to the form,
// so the request says what it is about.

let service = '';
// the button that brought the visitor to the form ("Цены: «Лидогенерация под ключ» — от 35 000 ₽/мес"):
// it goes into the request, so the letter says what exactly was chosen and where
let origin = '';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** A price, a section or the form's own select sets the service; `from` marks the button, if there was one. */
export const chooseService = (next: string, from?: string) => {
  service = next;
  if (from !== undefined) origin = from;
  notify();
};

/** A button that leads to the form without choosing a service (the header, the first screen, the cases). */
export const markOrigin = (from: string) => {
  origin = from;
};

export const currentOrigin = () => origin;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useService = () => useSyncExternalStore(subscribe, () => service);

/**
 * Where requests go: on Beget it is `server/send.php` beside the site (`npm run beget` sets `/send.php`),
 * which mails them to the agency; `worker/` is the older Cloudflare receiver, unused.
 * The address comes from the build (VITE_LEAD_ENDPOINT); without it nothing is sent — and the forms say so.
 */
export const LEAD_ENDPOINT: string | null = import.meta.env.VITE_LEAD_ENDPOINT || null;

export type Lead = {
  stage: 'contact' | 'details';
  /** which form on the page: the letter's first line */
  form: string;
  /** the button that led to the form, with the plan and price it showed */
  origin?: string;
  contact: string;
  service?: string;
  task?: string;
  niche?: string;
  budget?: string;
  website?: string;
};

export const sendLead = async (lead: Lead) => {
  if (LEAD_ENDPOINT === null) return;
  const res = await fetch(LEAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...lead, page: location.href }),
    keepalive: true
  });
  if (!res.ok) throw new Error(`lead ${res.status}`);
};
