import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createClient, LOCAL_CAPABILITIES, type ClientCapabilities, type TtrpgClient } from "../../../shared/api/client";
import type { TtrpgApi } from "../../../shared/api/ttrpg-api";

// undefined means legacy mounting without a provider; null explicitly means absent.
const ClientContext = createContext<TtrpgClient | null | undefined>(undefined);

/** The only bridge lookup, shared by the local entry point and legacy tests/labs. */
function readLocalApi(): TtrpgApi | undefined {
  return typeof window === "undefined" ? undefined : window.ttrpg;
}

export function readLocalClient(): TtrpgClient | null {
  const api = readLocalApi();
  return api === undefined ? null : createClient(api, LOCAL_CAPABILITIES);
}

export function ClientProvider({ client, children }: { readonly client: TtrpgClient | null; readonly children: ReactNode }) {
  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
}

export function useTtrpgClient(): TtrpgClient | null {
  const provided = useContext(ClientContext);
  const localApi = provided === undefined ? readLocalApi() : undefined;
  const localClient = useMemo(() => localApi === undefined ? null : createClient(localApi, LOCAL_CAPABILITIES), [localApi]);
  return provided === undefined ? localClient : provided;
}

/** Unavailable capabilities follow the existing recoverable absent-client paths. */
export function useTtrpgApi(capability: keyof ClientCapabilities): TtrpgApi | undefined {
  const client = useTtrpgClient();
  return client?.capabilities[capability] ? client.api : undefined;
}
