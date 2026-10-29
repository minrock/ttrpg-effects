import type { TtrpgApi } from "../shared/api/ttrpg-api";
export type * from "../shared/api/ttrpg-api";

// Compatibility declaration for the sandboxed Electron bridge.
declare global {
  interface Window {
    ttrpg?: TtrpgApi;
  }
}
