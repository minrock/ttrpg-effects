import type { TtrpgApi } from "./ttrpg-api";

/** Availability of operations, never authorization or a security boundary. */
export interface ClientCapabilities {
  readonly scenes: boolean;
  readonly images: boolean;
  readonly libraries: boolean;
  readonly player: boolean;
  readonly dice: boolean;
  readonly nativeMenus: boolean;
}

export interface TtrpgClient {
  readonly api: TtrpgApi;
  readonly assetReferences?: "service";
  readonly capabilities: ClientCapabilities;
}

export const LOCAL_CAPABILITIES: ClientCapabilities = Object.freeze({
  scenes: true, images: true, libraries: true, player: true, dice: true, nativeMenus: true
});

/** The full contract stays required; only tests/labs may provide partial doubles. */
export function createClient(api: TtrpgApi, capabilities: ClientCapabilities, assetReferences?: "service"): TtrpgClient {
  return Object.freeze({ api, assetReferences, capabilities: Object.freeze({ ...capabilities }) });
}
