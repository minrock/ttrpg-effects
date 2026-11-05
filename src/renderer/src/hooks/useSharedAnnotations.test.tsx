// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { SharedAnnotations } from "../../../application/services/shared-annotations";
import type { AnnotationView, SharedAnnotationsClient } from "../../../shared/contracts/shared-annotations";
import { useSharedAnnotations } from "./useSharedAnnotations";
import { usePlayerTools } from "./usePlayerTools";
import { SharedDrawingPanel } from "../components/workspace/SharedDrawingPanel";
const holder = vi.hoisted(() => ({ client: null as { annotations: SharedAnnotationsClient } | null }));
vi.mock("../client/ClientProvider", () => ({ useTtrpgClient: () => holder.client }));
const cleanup: (() => void)[] = [];
afterEach(() => { for (const dispose of cleanup.splice(0)) dispose(); vi.useRealTimers(); holder.client = null; });
function fixture() {
  const scene = createDefaultScene(), listeners = new Set<() => void>();
  let view: AnnotationView;
  const actor = { participant: "a", alias: "Ana <script>alert(1)</script>", discriminator: 1, expiresAt: Date.now() + 600000 };
  const store = new SharedAnnotations(Date.now, () => crypto.randomUUID(), () => emit()); store.register(actor, "a");
  view = { supported: true, connected: true, state: store.state("a"), context: crypto.randomUUID(), snapshot: { scene, mapImageUrl: null, tokenImageUrls: {}, camera: { center: { x: 0, y: 0 }, zoom: 1 }, showDmFogOverlay: false }, error: "" };
  function emit() { view = { ...view, state: store.state("a") }; for (const fn of listeners) fn(); }
  const command = vi.fn<SharedAnnotationsClient["command"]>(async c => { store.execute(c, actor, "a", "1"); });
  const api = { getSnapshot: () => view, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, command };
  holder.client = { annotations: api };
  const host = document.createElement("div"); document.body.append(host); const root = createRoot(host);
  let result!: { shared: ReturnType<typeof useSharedAnnotations>; tools: ReturnType<typeof usePlayerTools> };
  function Harness() { const shared = useSharedAnnotations(), tools = usePlayerTools(view.context, scene.grid, scene.settings, shared.bridge); result = { shared, tools }; return <SharedDrawingPanel api={api} view={shared.view} aligned player/>; }
  act(() => root.render(<Harness/>)); cleanup.push(() => { act(() => root.unmount()); host.remove(); });
  return { get result() { return result; }, host, command, store, scene, actor, api, disconnect() { view = { ...view, connected: false }; for (const fn of listeners) fn(); }, reconnect() { view = { ...view, connected: true }; for (const fn of listeners) fn(); } };
}
it("crear, mover y limpiar propios usa la capa remota sin modificar escena ni dibujos ajenos", async () => {
  const f = fixture();
  await act(async () => f.result.tools.createArea("circle", { x: 100, y: 100 }));
  expect(f.result.tools.shapes).toHaveLength(1); const id = f.result.tools.shapes[0].id;
  await act(async () => f.result.tools.move(id, 200, 200)); expect(f.store.state().items[0].revision).toBe(2);
  expect(f.scene.shapes).toEqual([]); expect(f.host.querySelector("script")).toBeNull(); expect(f.host.textContent).toContain(f.actor.alias);
  act(() => f.store.execute({ action: "create", id: crypto.randomUUID(), geometry: { type: "circle", radius: 50, points: [{ x: 0, y: 0 }] } }, { ...f.actor, participant: "b", alias: "B", discriminator: 2 }, "b", "2"));
  expect(f.result.tools.shapes).toHaveLength(1);
  await act(async () => f.result.tools.clear()); expect(f.store.state().items).toHaveLength(1); expect(f.store.state().items[0].author.alias).toBe("B");
  expect(f.result.tools.shapes).toEqual([]);
});
it("coalescing de preview, keepalive y desconexión sin reproducir borradores offline", async () => {
  vi.useFakeTimers(); const f = fixture(), id = `shared-${crypto.randomUUID()}`;
  await act(async () => {
    for (let i = 0; i < 50; i++) f.result.shared.showPreview({ id, type: "measurement", points: [{ x: 0, y: 0 }, { x: i, y: i }] });
    await vi.advanceTimersByTimeAsync(125);
  });
  expect(f.command).toHaveBeenCalledTimes(1); expect(f.store.state().items[0].geometry.points[1].x).toBe(49);
  await act(async () => { await vi.advanceTimersByTimeAsync(1000); }); expect(f.command).toHaveBeenCalledTimes(2);
  act(() => f.disconnect());
  await act(async () => { f.result.shared.showPreview({ id, type: "circle", points: [{ x: 0, y: 0 }], radius: 30 }); f.result.tools.createArea("circle", { x: 0, y: 0 }); await vi.advanceTimersByTimeAsync(4000); });
  expect(f.command).toHaveBeenCalledTimes(2); expect(f.result.shared.items).toEqual([]);
  expect(f.store.state().items).toHaveLength(1); // La vista vence aunque no llegue la retirada del servidor.
  act(() => { f.store.expire(); f.reconnect(); });
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); }); expect(f.command).toHaveBeenCalledTimes(2); expect(f.result.tools.shapes).toEqual([]);
});
it("Escape cancela también desconectado y no borra una figura mientras se escribe en un formulario", async () => {
  const f = fixture(); act(() => { f.result.tools.chooseTool("path"); f.result.tools.addPoint({ x: 0, y: 0 }); });
  act(() => { f.disconnect(); f.result.tools.cancel(); }); expect(f.result.tools.points).toEqual([]); expect(f.result.tools.tool).toBe("select");
  act(() => f.reconnect()); await act(async () => f.result.tools.createArea("square", { x: 0, y: 0 }));
  const input = document.createElement("input"); f.host.append(input); input.focus();
  act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })));
  expect(f.result.tools.shapes).toHaveLength(1);
});
it("el DM confirma limpiar y Escape cancela antes de enviar el comando", async () => {
  const f = fixture(); await act(async () => f.result.tools.createArea("circle", { x: 0, y: 0 }));
  const host = document.createElement("div"), root = createRoot(host); document.body.append(host);
  const command = vi.fn(async () => {}), api = { ...f.api, command };
  act(() => root.render(<SharedDrawingPanel api={api} view={api.getSnapshot()} aligned/>));
  cleanup.push(() => { act(() => root.unmount()); host.remove(); });
  const button = (text: string) => [...host.querySelectorAll("button")].find(b => b.textContent === text)!;
  act(() => button("Limpiar dibujos de jugadores").click()); expect(command).not.toHaveBeenCalled();
  act(() => button("Cancelar").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(button("Confirmar limpieza")).toBeUndefined();
  act(() => button("Limpiar dibujos de jugadores").click());
  await act(async () => button("Confirmar limpieza").click());
  expect(command).toHaveBeenCalledExactlyOnceWith({ action: "clear-all" });
});
