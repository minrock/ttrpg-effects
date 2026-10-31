import { afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { contextualTableClient } from "./contextual-table-client";
import { TableSession } from "../../application/services/table-session";
import { systemSeeds } from "../../domain/systems/system-catalog";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { TableEvent } from "../../shared/contracts/table";
const clients: ReturnType<typeof contextualTableClient>[] = [];
afterEach(() => { clients.splice(0).forEach(c => c.clear()); vi.useRealTimers(); });
const flush = async () => { for (let n = 0; n < 25; n++) await Promise.resolve(); };
function fixture() {
  const context = { gameId: randomUUID(), openingId: randomUUID(), generation: 1, audience: "player" as const }, terminal = vi.fn();
  const meta = { ...context, systemRef: systemSeeds[0].ref, systemHash: "a".repeat(64), modules: systemSeeds[0].definition.manifest };
  const table = new TableSession(Date.now, randomUUID), events: TableEvent[] = [];
  table.publish({ showDmFogOverlay: false, scene: createDefaultScene(), camera: { center: { x: 0, y: 0 }, zoom: 1 }, mapImageUrl: null, tokenImageUrls: {} }); table.connect("guest", "player", event => events.push(event));
  const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
  let resolveRead: ((value: Response) => void) | undefined;
  const fetcher = vi.fn(async (path: RequestInfo | URL) => String(path).split("?")[0].endsWith("/state") ? new Promise<Response>(resolve => { resolveRead = resolve; }) : new Response(new ReadableStream<Uint8Array>({ start(c) { controllers.push(c); } }), { headers: { "Content-Type": "text/event-stream" } }));
  const client = contextualTableClient(context, terminal, fetcher); clients.push(client);
  const send = (event: object, index = 0) => controllers[index].enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ ...events[0], ...event, ...meta, protocolVersion: 2 })}\n\n`));
  return { client, terminal, context, fetcher, controllers, send, events, meta, resolve() { resolveRead?.(new Response(JSON.stringify({ ok: true, state: { ...table.state("player"), ...meta, protocolVersion: 2 } }), { headers: { "Content-Type": "application/json" } })); } };
}
it("terminal solo limpia su contexto, aborta lectura tardía y detiene reintentos", async () => {
  vi.useFakeTimers(); const a = fixture(), b = fixture(), scene = vi.fn(); a.client.api.onPlayerScene(scene);
  const late = a.client.api.getPlayerWindowState(); a.client.start("player"); b.client.start("player"); await flush();
  a.send({}); b.send({}); await flush(); expect(a.client.getStatus().published).toBe(true);
  a.send({ type: "terminal", terminal: "access-ended", state: undefined, sequence: 0 }); await flush();
  expect(a.terminal).toHaveBeenCalledExactlyOnceWith("access-ended"); expect(a.client.getStatus().published).toBe(false); expect(b.client.getStatus().published).toBe(true);
  a.resolve(); await late; await flush(); expect(a.client.getStatus().published).toBe(false);
  const calls = a.fetcher.mock.calls.length; await vi.advanceTimersByTimeAsync(60000); expect(a.fetcher.mock.calls.length).toBe(calls);
  expect(scene).toHaveBeenCalledOnce();
});
it("reemplazo no reabre pestaña; corte de red conserva vista y reconecta con cursor aislado", async () => {
  vi.useFakeTimers(); const a = fixture(); a.client.start("player"); await flush(); a.send({}); await flush();
  a.controllers[0].close(); await flush(); expect(a.client.getStatus().published).toBe(true); await vi.advanceTimersByTimeAsync(500); await flush(); expect(a.controllers.length).toBe(2);
  a.send({}, 1); await flush(); a.send({ type: "terminal", terminal: "replaced", state: undefined, sequence: 0 }, 1); await flush();
  expect(a.terminal).toHaveBeenCalledExactlyOnceWith("replaced"); const count = a.fetcher.mock.calls.length; await vi.advanceTimersByTimeAsync(30000); expect(a.fetcher.mock.calls.length).toBe(count);
});

it("401 HTTP limpia inmediatamente una vista publicada y cancela su reconexión", async () => {
  vi.useFakeTimers(); const a = fixture(); a.client.start("player"); await flush(); a.send({}); await flush();
  a.fetcher.mockImplementationOnce(async () => new Response(JSON.stringify({ ok: false, error: { code: "GUEST_UNAUTHORIZED", message: "Acceso finalizado" } }), { status: 401, headers: { "Content-Type": "application/json" } }));
  await a.client.api.getDiceSizes(); await flush();
  expect(a.client.getStatus().published).toBe(false); expect(a.terminal).toHaveBeenCalledExactlyOnceWith("access-ended");
  const calls = a.fetcher.mock.calls.length; await vi.advanceTimersByTimeAsync(60000); expect(a.fetcher.mock.calls.length).toBe(calls);
});
it("reconexión con otra apertura limpia, descarta lectura vieja y no reintenta", async () => {
  vi.useFakeTimers(); const a = fixture(), b = fixture(); const late = a.client.api.getPlayerWindowState();
  a.client.start("player"); b.client.start("player"); await flush(); a.send({}); b.send({}); await flush();
  a.controllers[0].close(); await flush(); await vi.advanceTimersByTimeAsync(500); await flush();
  a.controllers[1].enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ ...a.events[0], ...a.meta, protocolVersion: 2, openingId: randomUUID(), generation: 2 })}\n\n`)); await flush();
  expect(a.terminal).toHaveBeenCalledExactlyOnceWith("access-ended"); expect(a.client.getStatus().published).toBe(false); expect(b.client.getStatus().published).toBe(true);
  a.resolve(); await late; const calls = a.fetcher.mock.calls.length; await vi.advanceTimersByTimeAsync(60000); expect(a.fetcher.mock.calls.length).toBe(calls); expect(a.client.getStatus().published).toBe(false);
  for (const [path] of a.fetcher.mock.calls) { expect(String(path)).toContain(`openingId=${a.context.openingId}`); expect(String(path)).toContain("generation=1"); }
});
it("409 de mapa es recuperable; OPENING_CHANGED en lectura termina el contexto", async () => {
  vi.useFakeTimers(); const a = fixture(); a.client.start("player"); await flush(); a.send({}); await flush();
  const conflict = (code: string) => new Response(JSON.stringify({ ok: false, error: { code, message: "Conflicto" } }), { status: 409, headers: { "Content-Type": "application/json" } });
  a.fetcher.mockImplementationOnce(async () => conflict("REVISION_CONFLICT")); await a.client.api.notifyPlayerContentReady(); expect(a.terminal).not.toHaveBeenCalled(); expect(a.client.getStatus().published).toBe(true);
  a.fetcher.mockImplementationOnce(async path => { expect(String(path)).toContain(`/dice/sizes?openingId=${a.context.openingId}&generation=1`); return conflict("OPENING_CHANGED"); });
  await a.client.api.getDiceSizes(); expect(a.terminal).toHaveBeenCalledExactlyOnceWith("access-ended"); expect(a.client.getStatus().published).toBe(false);
});
