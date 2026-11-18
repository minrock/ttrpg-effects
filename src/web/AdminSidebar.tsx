import type { ReactNode } from "react";

export type AdminSidebarProps = {
  readonly id: string;
  readonly role: "admin" | "dm";
  readonly children?: ReactNode;
  readonly onNavigate?: (path: "/admin/cuentas" | "/admin/sistemas") => void | Promise<unknown>;
  readonly activePath?: string;
  readonly className?: string;
};

/** Navegación estructural de las vistas administrativas; no se monta en el editor. */
export function AdminSidebar({ id, role, children, onNavigate, activePath, className = "" }: AdminSidebarProps) {
  return <aside id={id} className={`admin-sidebar ${className}`.trim()}>
    <div className="admin-sidebar-brand" aria-label="TTRPG Effects"><strong>TTRPG</strong> <span>Effects</span></div>
    <nav aria-label="Navegación de administración" className="admin-sidebar-navigation">
      {role === "admin" ? <>
        <p className="admin-sidebar-eyebrow">Administración</p>
        <button type="button" aria-current={activePath !== "/admin/sistemas" ? "page" : undefined} onClick={() => onNavigate?.("/admin/cuentas")}>Cuentas DM</button>
        <button type="button" aria-current={activePath === "/admin/sistemas" ? "page" : undefined} onClick={() => onNavigate?.("/admin/sistemas")}>Sistemas</button>
      </> : children}
    </nav>
  </aside>;
}
