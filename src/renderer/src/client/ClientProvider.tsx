import { createContext, useContext, type ReactNode } from "react";
import { type ClientCapabilities, type TtrpgClient } from "../../../shared/api/client";
import type { TtrpgApi } from "../../../shared/api/ttrpg-api";

const ClientContext = createContext<TtrpgClient | null>(null);

export function ClientProvider({ client, children }: { readonly client: TtrpgClient | null; readonly children: ReactNode }) {
  return <ClientContext.Provider value={client}>{children}</ClientContext.Provider>;
}

export function useTtrpgClient(): TtrpgClient | null {
  return useContext(ClientContext);
}

/** Unavailable capabilities follow the existing recoverable absent-client paths. */
export function useTtrpgApi(capability: keyof ClientCapabilities): TtrpgApi | undefined {
  const client = useTtrpgClient();
  return client?.capabilities[capability] ? client.api : undefined;
}
