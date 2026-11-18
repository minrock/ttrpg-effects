import type { BrowserClient } from "../infrastructure/browser/browser-client";
import type { CampaignSelection } from "../shared/contracts/campaigns";
export interface ServiceWorkspace {
  readonly headerTarget?: HTMLElement | null;
  readonly headerEnabled?: boolean;
  readonly browser:BrowserClient;
  readonly confirmLeave:()=>Promise<string|null>;
  readonly registerLeave?: (guard: () => Promise<boolean>) => () => void;
  readonly defaultDiagonalMode?: import("../domain/systems/system-catalog").SystemDefinition["rules"]["defaultDiagonalMode"];
  readonly campaignSelection?: CampaignSelection;
  /** El editor registra restauración, pero no puede persistir ni recibir interacción hasta cargar la escena contextual. */
  readonly sceneLoading?: boolean;
  readonly logout:()=>Promise<void>;
}
