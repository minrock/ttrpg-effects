import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";

type ShellRenderProps = {
  readonly navigationSlot: HTMLElement | null;
  readonly navigationOpen: boolean;
  readonly toggleNavigation: () => void;
  readonly navigationTriggerRef: React.RefObject<HTMLButtonElement | null>;
  readonly onNavigation: () => void;
  readonly navigationId: string;
};

export type AdminShellProps = {
  readonly role: "admin" | "dm";
  readonly activePath?: string;
  readonly onAdminNavigate?: (path: "/admin/cuentas" | "/admin/sistemas") => void | Promise<unknown>;
  readonly children: (props: ShellRenderProps) => ReactNode;
};

const desktopQuery = "(min-width: 960px)";
function isDesktopViewport(): boolean { return typeof window === "undefined" || !window.matchMedia || window.matchMedia(desktopQuery).matches; }
function focusable(root: HTMLElement | null): HTMLElement[] {
  return root ? [...root.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(item => !item.closest("[hidden],[inert]")) : [];
}

/** Layout administrativo: columna persistente en escritorio y drawer accesible en estrecho. */
export function AdminShell({ role, activePath, onAdminNavigate, children }: AdminShellProps) {
  const id = useId().replace(/:/g, "");
  const navigationId = `admin-navigation-${id}`;
  const [navigationSlot, setNavigationSlot] = useState<HTMLElement | null>(null);
  const [desktop, setDesktop] = useState(isDesktopViewport);
  const [desktopVisible, setDesktopVisible] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const drawerOpenRef = useRef(false);
  drawerOpenRef.current = drawerOpen;
  const restoreTrigger = useRef(false);
  const navigationOpen = desktop ? desktopVisible : drawerOpen;

  const focusContent = useCallback(() => {
    const focus = () => {
      const title = contentRef.current?.querySelector<HTMLElement>("h1[tabindex], h2[tabindex], h1, h2");
      if (title && title.tabIndex < 0 && !title.hasAttribute("tabindex")) title.tabIndex = -1;
      title?.focus();
    };
    queueMicrotask(focus);
  }, []);
  const closeDrawer = useCallback((restore = false) => {
    restoreTrigger.current = restore;
    setDrawerOpen(false);
  }, []);
  const onNavigation = useCallback(() => {
    if (!desktop) closeDrawer(false);
    focusContent();
  }, [closeDrawer, desktop, focusContent]);
  const toggleNavigation = useCallback(() => {
    if (desktop) {
      if (desktopVisible && document.activeElement instanceof HTMLElement && document.activeElement.closest(".admin-sidebar")) triggerRef.current?.focus();
      setDesktopVisible(value => {
        if (!value) queueMicrotask(() => {
          const navigation = document.getElementById(navigationId);
          const active = navigation?.querySelector<HTMLElement>('[aria-current="page"]');
          (active ?? focusable(navigation)[0])?.focus();
        });
        return !value;
      });
      return;
    }
    if (drawerOpen) closeDrawer(true); else setDrawerOpen(true);
  }, [closeDrawer, desktop, desktopVisible, drawerOpen, navigationId]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia(desktopQuery);
    const changed = () => {
      const focusedInNavigation = document.activeElement instanceof HTMLElement && !!document.activeElement.closest(".admin-sidebar");
      const restore = drawerOpenRef.current || focusedInNavigation;
      setDesktop(media.matches);
      setDrawerOpen(false);
      restoreTrigger.current = false;
      if (restore) queueMicrotask(() => triggerRef.current?.focus());
    };
    changed(); media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!drawerOpen) {
      if (restoreTrigger.current) {
        restoreTrigger.current = false;
        queueMicrotask(() => triggerRef.current?.focus());
      }
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeDrawer(true); return; }
      if (event.key !== "Tab") return;
      const controls = focusable(drawerRef.current);
      if (!controls.length) { event.preventDefault(); return; }
      const index = controls.indexOf(document.activeElement as HTMLElement);
      if ((event.shiftKey && index <= 0) || (!event.shiftKey && (index < 0 || index === controls.length - 1))) {
        event.preventDefault(); controls[event.shiftKey ? controls.length - 1 : 0]?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    queueMicrotask(() => {
      const active = drawerRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      (active ?? focusable(drawerRef.current)[0])?.focus();
    });
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeDrawer, drawerOpen]);

  const sidebar = <AdminSidebar id={navigationId} role={role} activePath={activePath} onNavigate={async path => { const result = await onAdminNavigate?.(path); if (result !== false) onNavigation(); }}><div ref={setNavigationSlot}/></AdminSidebar>;
  return <div className="admin-shell" data-navigation-open={navigationOpen} data-desktop={desktop}>
    {desktop && desktopVisible ? sidebar : null}
    {!desktop && drawerOpen ? <div className="admin-drawer-layer">
      <button type="button" className="admin-drawer-scrim" aria-label="Cerrar navegación" onClick={() => closeDrawer(true)}/>
      <div ref={drawerRef} className="admin-drawer" role="dialog" aria-modal="true" aria-label="Navegación de administración"><button type="button" className="admin-drawer-close" onClick={() => closeDrawer(true)}>Cerrar navegación</button>{sidebar}</div>
    </div> : null}
    <section ref={contentRef} className="admin-shell-main" inert={!desktop && drawerOpen}>{children({ navigationSlot, navigationOpen, toggleNavigation, navigationTriggerRef: triggerRef, onNavigation, navigationId })}</section>
  </div>;
}
