import type { BrowserClient } from "../infrastructure/browser/browser-client";
export interface ServiceWorkspace {
  readonly browser:BrowserClient;
  readonly confirmLeave:()=>Promise<string|null>;
  readonly logout:()=>Promise<void>;
}
