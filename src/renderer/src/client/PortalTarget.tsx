import { createContext, useContext, type ReactNode } from "react";
const PortalTargetContext = createContext<HTMLElement | null>(null);
/** Los portales privados pertenecen al mismo contenedor hidden/inert que el VTT. */
export function PortalTargetProvider({ target, children }: { target: HTMLElement; children: ReactNode }) {
  return <PortalTargetContext.Provider value={target}>{children}</PortalTargetContext.Provider>;
}
export function usePortalTarget(): HTMLElement { return useContext(PortalTargetContext) ?? document.body; }
