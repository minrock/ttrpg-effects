import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { SharedAnnotations } from "./shared-annotations";
import { annotationCommandSchema } from "../../shared/contracts/shared-annotations";
import { TableSession } from "./table-session";
import { createDefaultScene } from "../../domain/sessions/default-scene";
const geometry = { type: "measurement" as const, points: [{ x: 0, y: 0 }, { x: 100, y: 50 }] };
function setup() {
  let time = 1000; const changed = vi.fn(), store = new SharedAnnotations(() => time, randomUUID, changed);
  const a = { participant: "privado-a", alias: "Luis", discriminator: 1, expiresAt: 100000 }, b = { ...a, participant: "privado-b", discriminator: 2 };
  return { store, a, b, changed, advance(ms: number) { time += ms; } };
}
describe("Capa compartida efímera", () => {
  it("dos autores, propiedad, revisiones y permisos DM sin suplantación", () => {
    const { store, a, b } = setup(), id = randomUUID(), second = randomUUID();
    store.execute({ action: "create", id, geometry }, a, "a", "a1");
    store.execute({ action: "create", id: second, geometry }, b, "b", "b1");
    expect(store.state().items.map(i => i.author.discriminator)).toEqual([1, 2]);
    expect(JSON.stringify(store.state())).not.toContain("privado-");
    expect(() => store.execute({ action: "update", id, revision: 1, geometry }, b, "b", "b1")).toThrow("Solo puedes");
    expect(() => store.execute({ action: "clear-all" }, a, "a", "a1")).toThrow();
    expect(() => store.execute({ action: "update", id, revision: 1, geometry }, null, "dm", "dm")).toThrow();
    store.execute({ action: "update", id, revision: 1, geometry }, a, "a", "a1");
    expect(() => store.execute({ action: "delete", id, revision: 1 }, a, "a", "a1")).toThrow("cambió");
    store.execute({ action: "delete", id, revision: 2 }, null, "dm", "dm");
    expect(() => store.execute({ action: "create", id, geometry }, a, "a", "a1")).toThrow("cambió");
    expect(store.state().items.map(i => i.id)).toEqual([second]);
    expect(annotationCommandSchema.safeParse({ action: "create", id, geometry, author: b }).success).toBe(false);
  });
  it("preview de edición conserva base, expira y no puede ser robado por otra pestaña", () => {
    const { store, a, advance } = setup(), id = randomUUID();
    store.execute({ action: "create", id, geometry }, a, "a", "tab1");
    store.execute({ action: "preview", id, revision: 1, geometry: { ...geometry, points: [{ x: 0, y: 0 }, { x: 200, y: 100 }] } }, a, "a", "tab1");
    expect(store.state().items[0]).toMatchObject({ preview: true, revision: 1, committedGeometry: geometry });
    advance(125);
    expect(() => store.execute({ action: "preview", id, revision: 1, geometry }, a, "a", "tab2")).toThrow("cambió");
    advance(3000); store.expire();
    expect(store.state().items[0]).toMatchObject({ preview: false, geometry });
    store.execute({ action: "preview", id, revision: 1, geometry }, a, "a", "tab2");
    store.disconnect("tab2"); expect(store.state().items[0].preview).toBe(false);
  });
  it("desconectar conserva confirmados; solo última credencial expirada o expulsión retira al autor", () => {
    const { store, a, b, advance } = setup();
    store.execute({ action: "create", id: randomUUID(), geometry }, { ...a, expiresAt: 2000 }, "a1", "a1");
    store.register({ ...a, expiresAt: 4000 }, "a2");
    store.execute({ action: "create", id: randomUUID(), geometry }, b, "b", "b1");
    store.disconnect("a1"); advance(1500); store.expire(); expect(store.state().items).toHaveLength(2);
    advance(2000); store.expire(); expect(store.state().items).toHaveLength(1);
    store.revoke(b.participant); expect(store.state().items).toEqual([]);
  });
  it("limita geometría, ráfagas, figuras y mantiene limpieza por autor", () => {
    const { store, a, b, advance } = setup();
    expect(annotationCommandSchema.safeParse({ action: "create", id: randomUUID(), geometry: { type: "path", points: Array.from({ length: 257 }, () => ({ x: 0, y: 0 })) } }).success).toBe(false);
    expect(annotationCommandSchema.safeParse({ action: "create", id: randomUUID(), geometry: { ...geometry, points: [{ x: Infinity, y: 0 }, { x: 0, y: 1 }] } }).success).toBe(false);
    for (let n = 0; n < 20; n++) store.execute({ action: "create", id: randomUUID(), geometry }, a, "a", "a1");
    expect(() => store.execute({ action: "create", id: randomUUID(), geometry }, a, "a", "a1")).toThrow("Demasiadas");
    for (let n = 20; n < 32; n++) { advance(100); store.execute({ action: "create", id: randomUUID(), geometry }, a, "a", "a1"); }
    advance(100); expect(() => store.execute({ action: "create", id: randomUUID(), geometry }, a, "a", "a1")).toThrow("Límite");
    store.execute({ action: "create", id: randomUUID(), geometry }, b, "b", "b1");
    advance(100); store.execute({ action: "clear-own" }, a, "a", "a1"); expect(store.state().items).toHaveLength(1);
    store.execute({ action: "clear-all" }, null, "dm", "dm"); expect(store.state().items).toEqual([]);
  });
  it("publicar y guardar no incorpora dibujos; cambio de reglas cancela preview; nuevo mapa limpia", () => {
    const table = new TableSession(Date.now, randomUUID), scene = createDefaultScene();
    const snapshot = { scene, camera: { center: { x: 0, y: 0 }, zoom: 1 }, mapImageUrl: null, tokenImageUrls: {}, showDmFogOverlay: false };
    const a = { participant: "a", alias: "Ana", discriminator: 1, expiresAt: Date.now() + 60000 };
    table.publish(snapshot); const context = table.context, id = randomUUID();
    table.annotations.execute({ action: "create", id, geometry }, a, "a", "1");
    table.annotations.execute({ action: "preview", id, revision: 1, geometry }, a, "a", "1");
    table.publish(snapshot); expect(table.context).toBe(context); expect(table.annotations.state().items).toHaveLength(1);
    expect(JSON.stringify(table.state("dm"))).not.toContain(id); expect(scene.shapes).toEqual([]);
    const next = { ...scene, settings: { ...scene.settings, snapToGrid: !scene.settings.snapToGrid }, maps: scene.maps.map(m => ({ ...m, settings: { ...m.settings, snapToGrid: !m.settings.snapToGrid } })) };
    table.publish({ ...snapshot, scene: next }); expect(table.annotations.state().items[0].preview).toBe(false);
    table.publish({ ...snapshot, cameraSyncKey: 2 }); expect(table.annotations.state().items).toEqual([]);
  });
});
