import type { Meta, StoryObj } from "@storybook/react-vite";
import { createPortal } from "react-dom";
import { useState } from "react";
import { AdminShell } from "../../../web/AdminShell";

function ShellExample({ role = "dm" as const }: { readonly role?: "dm" | "admin" }) {
  const [path, setPath] = useState("/admin/cuentas");
  return <AdminShell role={role} activePath={path} onAdminNavigate={next => setPath(next)}>{({ navigationSlot, navigationOpen, toggleNavigation, navigationTriggerRef, onNavigation, navigationId }) => <>
    <header className="account-bar admin-shell-header"><button ref={navigationTriggerRef} type="button" className="header-navigation admin-navigation-trigger" aria-controls={navigationId} aria-expanded={navigationOpen} aria-label={navigationOpen ? "Ocultar navegación" : "Mostrar navegación"} onClick={toggleNavigation}>☰</button><span className="header-brand">TTRPG <span>Effects</span></span><div className="header-context"><span className="header-section">Campañas</span></div></header>
    <main className="service-page admin-service-page"><h1 tabIndex={-1}>{role === "admin" ? (path === "/admin/sistemas" ? "Sistemas" : "Cuentas DM") : "Campañas"}</h1><p>Contenido sintético para verificar el espacio liberado por la navegación.</p>{navigationSlot ? createPortal(<><button type="button" aria-current="page" onClick={onNavigation}>Campañas</button><span className="admin-sidebar-name">Vecna Eve of Ruin — Capítulo 6</span><button type="button" onClick={onNavigation}>Arcos</button><span className="admin-sidebar-name">Three Moons Vault</span><button type="button" onClick={onNavigation}>NPCs</button><button type="button" onClick={onNavigation}>Monstruos</button></>, navigationSlot) : null}</main>
  </>}</AdminShell>;
}

const meta = { title: "Composiciones/AdminShell", component: AdminShell, tags: ["autodocs"], args: { role: "dm", children: () => null }, parameters: { uiContext: "administration", layout: "fullscreen", controls: { disable: true }, docs: { description: { component: "Shell estructural de administración. Fuente: `web/AdminShell.tsx`; la historia usa navegación y contenido sintéticos, sin ServiceApp, API ni motor de mapa." } } } } satisfies Meta<typeof AdminShell>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Dm: Story = { render: () => <ShellExample/> };
export const Administrador: Story = { render: () => <ShellExample role="admin"/> };
