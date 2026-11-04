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
