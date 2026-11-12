import { useSyncExternalStore } from 'react';

// The service a visitor asked about, carried from a price or a section to the form,
// so the request says what it is about.

let service = '';
const listeners = new Set<() => void>();

export const chooseService = (next: string) => {
  service = next;
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useService = () => useSyncExternalStore(subscribe, () => service);

/**
 * Where requests go: the Cloudflare Worker in `worker/`, which passes them to Telegram and email.
 * The address comes from the build (VITE_LEAD_ENDPOINT); without it nothing is sent — and the forms say so.
 */
export const LEAD_ENDPOINT: string | null = import.meta.env.VITE_LEAD_ENDPOINT || null;

export type Lead = {
  stage: 'contact' | 'details';
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
