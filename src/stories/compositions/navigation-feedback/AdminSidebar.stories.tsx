import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminSidebar } from "../../../web/AdminSidebar";

const meta = { title: "Composiciones/AdminSidebar", component: AdminSidebar, tags: ["autodocs"], parameters: { controls: { disable: true }, docs: { description: { component: "Navegación estructural del shell administrativo. Fuente: `web/AdminSidebar.tsx`; los estados se representan con datos sintéticos y no cargan árbol, red ni editor." } } } } satisfies Meta<typeof AdminSidebar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const DmConArco: Story = { args: { id: "sidebar-dm", role: "dm", children: <><button type="button">Campañas</button><span className="admin-sidebar-name">Vecna Eve of Ruin — Capítulo 6</span><button type="button">Arcos</button><span className="admin-sidebar-name">Three Moons Vault</span><button type="button">Escenas</button><button type="button" aria-current="page">NPCs</button><button type="button">Monstruos</button></> } };
export const Administrador: Story = { args: { id: "sidebar-admin", role: "admin", activePath: "/admin/sistemas", onNavigate: () => undefined } };
export const PartidasHeredadas: Story = { args: { id: "sidebar-legacy", role: "dm", children: <button type="button" aria-current="page">Partidas</button> } };
