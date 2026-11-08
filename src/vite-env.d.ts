/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The lead receiver (worker/lead.js); set in the Pages workflow from the repo variable LEAD_ENDPOINT. */
  readonly VITE_LEAD_ENDPOINT?: string;
}
