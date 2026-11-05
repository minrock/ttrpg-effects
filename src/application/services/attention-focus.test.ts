import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { TableSession } from "./table-session";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { attentionFrame } from "../../domain/player/attention-focus";
import { executeTableCommand } from "../../server/table-actions";
import type { TableEvent } from "../../shared/contracts/table";
function fixture() {
  let now = 1000;
  const table = new TableSession(() => now, randomUUID);
  const snapshot = { scene: createDefaultScene(), camera: { center: { x: 999, y: 888 }, zoom: 3 }, mapImageUrl: null, tokenImageUrls: {}, showDmFogOverlay: false };
  table.publish(snapshot);
  const connect = (name: string, compatible = true, ready = true) => {
    const events: TableEvent[] = [], connection = table.connect(name, "player", e => events.push(e), undefined, compatible);
    if (ready) table.ready(name, connection.id, table.revision);
    return { events, connection };
  };
  const command = () => { const requestId = randomUUID(); return { requestId, context: table.context, revision: table.revision, payload: { requestId, sceneId: snapshot.scene.id, frame: attentionFrame(snapshot), position: { x: 123.25, y: -91.5 } } }; };
  const send = (input = command(), role: "dm" | "player" = "dm") => executeTableCommand(table, "owner", "table", "focus", role, input);
  return { table, snapshot, connect, command, send, advance: (ms: number) => { now += ms; } };
}
describe("entrega efímera del foco", () => {
  it("entrega a todos los listos, excluye antiguos/cargando y no repite al reconectar o promover", () => {
    const f = fixture(), a = f.connect("a"), b = f.connect("b"), old = f.connect("old", false), loading = f.connect("loading", true, false);
    expect(f.send()).toEqual({ ok: true, delivered: 2, incompatible: 1, notReady: 1 });
    for (const player of [a, b]) expect(player.events.filter(e => e.type === "focus")).toHaveLength(1);
    for (const player of [old, loading]) expect(player.events.some(e => e.type === "focus")).toBe(false);
    const event = a.events.find(e => e.type === "focus")!;
    expect(event.payload).toMatchObject({ position: { x: 123.25, y: -91.5 }, issuedAt: 1000, expiresAt: 6000 });
    expect(JSON.stringify(event)).not.toContain('"zoom"');
    a.connection.close(); expect(b.events.filter(e => e.type === "focus")).toHaveLength(1);
    expect(f.connect("new").events.some(e => e.type === "focus")).toBe(false);
    expect(f.table.state("player").cameraCommand).toBeNull();
  });
  it("deduplica el mismo ID y rechaza reutilización, permisos, mapa, revisión y marco incorrectos", () => {
    const f = fixture(), a = f.connect("a"), command = f.command();
    expect(f.send(command)).toEqual(f.send(command)); expect(a.events.filter(e => e.type === "focus")).toHaveLength(1);
    expect(() => f.send({ ...command, payload: { ...command.payload, position: { x: 0, y: 0 } } })).toThrow("identificador");
    expect(() => f.send(f.command(), "player")).toThrow("DM");
    for (const input of [{ ...f.command(), revision: 999 }, { ...f.command(), context: randomUUID() }]) expect(() => f.send(input)).toThrow();
    for (const patch of [{ frame: "private" }, { sceneId: "other" }, { position: { x: NaN, y: 0 } }, { zoom: 2 }]) { const next = f.command(); expect(() => f.send({ ...next, payload: { ...next.payload, ...patch } })).toThrow(); }
    f.table.publish({ ...f.snapshot, cameraSyncKey: 2 });
    expect(() => f.send(command)).not.toThrow(); // Reintento idempotente devuelve el recibo, jamás reenvía.
    expect(a.events.filter(e => e.type === "focus")).toHaveLength(1);
  });
  it("limita ráfaga a cuatro y repone dos por segundo; rechaza control antiguo", () => {
    const f = fixture(); f.connect("a");
    for (let i = 0; i < 4; i++) f.send();
    expect(() => f.send()).toThrow("Espera"); f.advance(500); expect(f.send()).toMatchObject({ ok: true });
    expect(() => f.table.setCamera({ center: { x: 0, y: 0 }, zoom: 4 })).toThrow("retiró");
    expect(() => f.table.setCommand({ revision: 1, reason: "open", camera: { center: { x: 0, y: 0 }, zoom: 4 } })).toThrow("retiró");
  });
  it("no encola si no hay destinatario listo", () => { const f = fixture(), a = f.connect("a", true, false); expect(() => f.send()).toThrow("listos"); f.table.ready("a", a.connection.id, f.table.revision); expect(a.events.some(e => e.type === "focus")).toBe(false); });
});
