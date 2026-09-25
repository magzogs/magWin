import type { MagWinApi } from '../../shared/api';

declare global {
  interface Window {
    /** Exposed by src/preload/index.ts. */
    readonly magwin: MagWinApi;
  }
}

export {};
