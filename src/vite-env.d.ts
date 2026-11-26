/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The lead receiver: `/send.php` in the Beget build (npm run beget); on Pages — the repo variable LEAD_ENDPOINT. */
  readonly VITE_LEAD_ENDPOINT?: string;
}
