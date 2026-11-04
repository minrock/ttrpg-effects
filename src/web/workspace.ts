import type { BrowserClient } from "../infrastructure/browser/browser-client";
export interface ServiceWorkspace {
  readonly headerTarget?: HTMLElement | null;
  readonly headerEnabled?: boolean;
  readonly browser:BrowserClient;
  readonly confirmLeave:()=>Promise<string|null>;
  readonly registerLeave?: (guard: () => Promise<boolean>) => () => void;
  readonly defaultDiagonalMode?: import("../domain/systems/system-catalog").SystemDefinition["rules"]["defaultDiagonalMode"];
  readonly logout:()=>Promise<void>;
}
