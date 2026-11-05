import { afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { contextualTableClient } from "./contextual-table-client";
import { TableSession } from "../../application/services/table-session";
import { systemSeeds } from "../../domain/systems/system-catalog";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { AnnotationState } from "../../shared/contracts/shared-annotations";
const clients: ReturnType<typeof contextualTableClient>[] = [];
afterEach(() => { clients.splice(0).forEach(c => c.clear()); vi.useRealTimers(); });
const flush = async () => { for (let n = 0; n < 50; n++) await Promise.resolve(); };
function fixture(extension = true, rejectExtension = false) {
  const context = { gameId: randomUUID(), openingId: randomUUID(), generation: 1, audience: "player" as const }, terminal = vi.fn();
  const meta = { ...context, systemRef: systemSeeds[0].ref, systemHash: "a".repeat(64), modules: systemSeeds[0].definition.manifest, protocolVersion: 2 };
  const table = new TableSession(Date.now, randomUUID), scene = createDefaultScene();
  table.publish({ showDmFogOverlay: false, scene, camera: { center: { x: 0, y: 0 }, zoom: 1 }, mapImageUrl: null, tokenImageUrls: {} });
  const annotations: AnnotationState = { version: 1, serverTime: Date.now(), sequence: 0, sceneId: scene.id, self: randomUUID(), items: [] };
  const connection = randomUUID();
  const state = () => ({ ...table.state("player", connection), ...(extension ? { annotations } : {}) });
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const fetcher = vi.fn(async (path: RequestInfo | URL, init?: RequestInit) => {
    if (rejectExtension && String(path).includes("annotationsVersion")) return new Response("{}", { status: 400 });
    if (String(path).includes("/events")) return new Response(new ReadableStream<Uint8Array>({ start(c) { controller = c; } }), { headers: { "Content-Type": "text/event-stream" } });
    if (init?.method === "POST") return json({ ok: true, annotations });
    return json({ ok: true, state: { ...state(), ...meta } });
  });
  const client = contextualTableClient(context, terminal, fetcher); clients.push(client);
  let sequence = 0;
  const event = (type: string, payload?: unknown, eventSequence = ++sequence) => controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ ...meta, epoch: table.state("player").epoch, context: table.context, revision: table.revision, serverTime: Date.now(), type, sequence: eventSequence, ...(type === "bootstrap" ? { state: state() } : { payload }) })}\n\n`));
  return { client, terminal, context, fetcher, annotations, event, state, close: () => controller.close() };
}
function json(value: unknown) { return new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } }); }
it("negocia extensión; ACK perdido conserva requestId y secuencias viejas no resucitan dibujos", async () => {
  const f = fixture(); f.client.start("player"); await flush(); f.event("bootstrap"); await flush();
  expect(f.client.annotations.getSnapshot()).toMatchObject({ supported: true, connected: true });
  expect(String(f.fetcher.mock.calls[0][0])).toContain("annotationsVersion=1");
  const item = { id: randomUUID(), revision: 1, author: { publicId: f.annotations.self!, alias: "Ana", discriminator: 1 }, geometry: { type: "circle" as const, points: [{ x: 0, y: 0 }], radius: 20 }, preview: false };
  f.fetcher.mockImplementationOnce(async () => { throw new TypeError("ACK perdido"); });
  f.fetcher.mockImplementationOnce(async () => json({ ok: true, annotations: { ...f.annotations, sequence: 2, items: [item] } }));
  await f.client.annotations.command({ action: "create", id: item.id, geometry: item.geometry });
  const posts = f.fetcher.mock.calls.filter(([, init]) => init?.method === "POST"); expect(posts).toHaveLength(2); expect(posts[0][1]!.body).toBe(posts[1][1]!.body);
  f.event("annotations", { ...f.annotations, sequence: 3, items: [] }); await flush();
  f.event("annotations", { ...f.annotations, sequence: 2, items: [item] }); await flush(); expect(f.client.annotations.getSnapshot().state!.items).toEqual([]);
  f.event("scene", { ...f.state(), annotations: { ...f.annotations, sequence: 2, items: [item] } }); await flush(); expect(f.client.annotations.getSnapshot().state!.items).toEqual([]);
  f.close(); await flush(); expect(f.client.annotations.getSnapshot().connected).toBe(false);
  await expect(f.client.annotations.command({ action: "clear-own" })).rejects.toThrow();
  f.client.clear(); expect(f.client.annotations.getSnapshot().state).toBeNull();
});
it("servidor antiguo rechaza query; recupera mesa base y explica capacidad ausente", async () => {
  vi.useFakeTimers(); const f = fixture(false, true); f.client.start("player"); await flush();
  await vi.advanceTimersByTimeAsync(500); await flush(); await vi.advanceTimersByTimeAsync(1000); await flush(); f.event("bootstrap"); await flush();
  expect(f.client.getStatus()).toMatchObject({ phase: "connected", published: true });
  expect(f.client.annotations.getSnapshot().supported).toBe(false); expect(f.terminal).not.toHaveBeenCalled();
  await expect(f.client.annotations.command({ action: "clear-own" })).rejects.toThrow("no disponible");
  expect(String(f.fetcher.mock.calls[1][0])).not.toContain("focusVersion");
  expect(String(f.fetcher.mock.calls[1][0])).toContain("annotationsVersion");
  expect(String(f.fetcher.mock.calls[2][0])).not.toContain("annotationsVersion");
});
it("un 403 de propiedad no expulsa al jugador ni borra la mesa", async () => {
  const f = fixture(); f.client.start("player"); await flush(); f.event("bootstrap"); await flush();
  f.fetcher.mockImplementationOnce(async () => new Response(JSON.stringify({ ok: false, error: { code: "FORBIDDEN", message: "Solo puedes editar tus dibujos." } }), { status: 403, headers: { "Content-Type": "application/json" } }));
  await expect(f.client.annotations.command({ action: "delete", id: randomUUID(), revision: 1 })).rejects.toThrow("Solo puedes");
  expect(f.terminal).not.toHaveBeenCalled(); expect(f.client.getStatus().published).toBe(true);
});
