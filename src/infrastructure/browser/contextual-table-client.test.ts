import { afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { contextualTableClient } from "./contextual-table-client";
import { TableSession } from "../../application/services/table-session";
import { systemSeeds } from "../../domain/systems/system-catalog";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import type { TableEvent } from "../../shared/contracts/table";
import { serviceDiceFailureFixture, serviceDicePlayerFixture } from "../../shared/contracts/service-dice.fixtures";
import { serviceDiceStateSchema } from "../../shared/contracts/service-dice";
import { serviceDiceContextualEventSchema } from "../../shared/contracts/moderation";
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
  const fetcher = vi.fn(async (path: RequestInfo | URL) => {
    const url = String(path);
    if (url.includes("/dice/capabilities")) return new Response(JSON.stringify({ ok: true, version: 1, limits: { reservationMs: 20000, historyDefault: 10, historyMax: 50, publicHistory: 500, dmHistory: 1000 } }), { headers: { "Content-Type": "application/json" } });
    if (url.includes("/dice/v1/state")) return new Response(JSON.stringify({ ok: true, state: serviceDicePlayerFixture }), { headers: { "Content-Type": "application/json" } });
    return url.split("?")[0].endsWith("/state") ? new Promise<Response>(resolve => { resolveRead = resolve; }) : new Response(new ReadableStream<Uint8Array>({ start(c) { controllers.push(c); } }), { headers: { "Content-Type": "text/event-stream" } });
  });
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

it("negocia dados sobre el SSE de mesa y no deja que estado HTTP tardío pise el evento más nuevo", async () => {
  const a = fixture(), dice = a.client.serviceDice!;
  dice.getSnapshot(); await vi.waitFor(() => expect(dice.getSnapshot().supported).toBe(true));
  a.client.start("player"); await flush();
  expect(String(a.fetcher.mock.calls.at(-1)?.[0])).toContain("diceVersion=1");
  const bootstrap = { ...a.events[0], diceVersion: 1, state: { ...a.events[0].state, ...a.meta, protocolVersion: 2, diceVersion: 1, serviceDice: serviceDicePlayerFixture }, ...a.meta, protocolVersion: 2 };
  expect(serviceDiceContextualEventSchema.safeParse(bootstrap).success).toBe(true);
  a.send({ diceVersion: 1, state: bootstrap.state }); await flush();
  expect(a.client.getStatus()).toMatchObject({ phase: "connected", error: "" }); expect(dice.getSnapshot().state).toMatchObject({ audience: "player", public: { sequence: serviceDicePlayerFixture.public.sequence } });
  a.send({ type: "service-dice", sequence: a.events[0].sequence + 1, diceVersion: 1, state: undefined, payload: { audience: "player", public: serviceDiceFailureFixture } }); await flush();
  expect(dice.getSnapshot().state?.public.sequence).toBe(5);
  a.send({ type: "service-dice", sequence: a.events[0].sequence, diceVersion: 1, state: undefined, payload: serviceDicePlayerFixture }); await flush();
  expect(dice.getSnapshot().state?.public.sequence).toBe(5);

  a.send({ type: "camera", sequence: a.events[0].sequence + 2, diceVersion: 1, state: undefined, payload: { revision: 2, reason: "open", camera: { center: { x: 0, y: 0 }, zoom: 1 } } }); await flush();
  expect(a.client.getStatus().phase).toBe("connected"); expect(dice.getSnapshot().state?.public.sequence).toBe(5);
  const sceneState = { ...a.events[0].state!, diceVersion: 1, serviceDice: serviceDicePlayerFixture };
  a.send({ type: "scene", sequence: a.events[0].sequence + 3, diceVersion: 1, state: undefined, payload: sceneState }); await flush();
  expect(dice.getSnapshot().state?.public.sequence).toBe(4);
  const nextEpoch = randomUUID();
  a.send({ epoch: nextEpoch, sequence: 0, diceVersion: 1, state: { ...bootstrap.state, epoch: nextEpoch, serviceDice: { audience: "player", public: serviceDiceFailureFixture } } }); await flush();
  expect(dice.getSnapshot().state?.public.sequence).toBe(5);
});

it("espera la negociación de dados ya solicitada antes de abrir el primer SSE", async () => {
  const a = fixture(), dice = a.client.serviceDice!;
  let resolveCapabilities!: (response: Response) => void;
  a.fetcher.mockImplementation(async (path: RequestInfo | URL) => {
    const url = String(path);
    if (url.includes("/dice/capabilities")) return new Promise<Response>(resolve => { resolveCapabilities = resolve; });
    if (url.includes("/dice/v1/state")) return new Response(JSON.stringify({ ok: true, state: serviceDicePlayerFixture }), { headers: { "Content-Type": "application/json" } });
    return new Response(new ReadableStream<Uint8Array>({ start(controller) { a.controllers.push(controller); } }), { headers: { "Content-Type": "text/event-stream" } });
  });

  dice.getSnapshot();
  a.client.start("player");
  await flush();
  expect(a.fetcher.mock.calls.filter(([path]) => String(path).includes("/table/events"))).toHaveLength(0);

  resolveCapabilities(new Response(JSON.stringify({ ok: true, version: 1, limits: { reservationMs: 20000, historyDefault: 10, historyMax: 50, publicHistory: 500, dmHistory: 1000 } }), { headers: { "Content-Type": "application/json" } }));
  await vi.waitFor(() => expect(a.fetcher.mock.calls.filter(([path]) => String(path).includes("/table/events"))).toHaveLength(1));
  const [stream] = a.fetcher.mock.calls.find(([path]) => String(path).includes("/table/events"))!;
  expect(String(stream)).toContain("diceVersion=1");
  expect(a.controllers).toHaveLength(1);
});

it("vence capabilities colgada, conserva SSE base al reiniciar y descarta su respuesta tardía", async () => {
  vi.useFakeTimers();
  const a = fixture(), dice = a.client.serviceDice!;
  let resolveCapabilities!: (response: Response) => void;
  let capabilitySignal: AbortSignal | undefined;
  a.fetcher.mockImplementation((path: RequestInfo | URL, init?: RequestInit) => {
    const url = String(path);
    if (url.includes("/dice/capabilities")) {
      capabilitySignal = init?.signal ?? undefined;
      return new Promise<Response>(resolve => { resolveCapabilities = resolve; });
    }
    return Promise.resolve(new Response(new ReadableStream<Uint8Array>({ start(controller) { a.controllers.push(controller); } }), { headers: { "Content-Type": "text/event-stream" } }));
  });

  dice.getSnapshot();
  a.client.start("player");
  await flush();
  expect(a.fetcher.mock.calls.filter(([path]) => String(path).includes("/table/events"))).toHaveLength(0);

  await vi.advanceTimersByTimeAsync(1_500);
  await flush();
  expect(capabilitySignal?.aborted).toBe(true);
  expect(a.fetcher.mock.calls.filter(([path]) => String(path).includes("/table/events"))).toHaveLength(1);
  expect(String(a.fetcher.mock.calls.find(([path]) => String(path).includes("/table/events"))?.[0])).not.toContain("diceVersion=1");

  a.client.stop();
  a.client.start("player");
  await flush();
  expect(a.fetcher.mock.calls.filter(([path]) => String(path).includes("/table/events"))).toHaveLength(2);
  resolveCapabilities(new Response(JSON.stringify({ ok: true, version: 1, limits: { reservationMs: 20000, historyDefault: 10, historyMax: 50, publicHistory: 500, dmHistory: 1000 } }), { headers: { "Content-Type": "application/json" } }));
  await flush();
  expect(a.fetcher.mock.calls.filter(([path]) => String(path).includes("/table/events"))).toHaveLength(2);
  expect(dice.getSnapshot()).toMatchObject({ supported: false, error: expect.stringContaining("tardó demasiado") });
});

it("abre un único SSE legacy si la negociación descubre un servidor anterior", async () => {
  const a = fixture(), dice = a.client.serviceDice!;
  a.fetcher.mockImplementation(async (path: RequestInfo | URL) => {
    const url = String(path);
    if (url.includes("/dice/capabilities")) return new Response(JSON.stringify({ ok: false, error: { code: "NOT_FOUND", message: "Sin extensión" } }), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(new ReadableStream<Uint8Array>({ start(controller) { a.controllers.push(controller); } }), { headers: { "Content-Type": "text/event-stream" } });
  });

  dice.getSnapshot();
  a.client.start("player");
  await vi.waitFor(() => expect(a.fetcher.mock.calls.filter(([path]) => String(path).includes("/table/events"))).toHaveLength(1));
  const [stream] = a.fetcher.mock.calls.find(([path]) => String(path).includes("/table/events"))!;
  expect(String(stream)).not.toContain("diceVersion=1");
  expect(a.controllers).toHaveLength(1);
});

it("marca el bootstrap de mesa para dejar estático el mismo roll recuperado y anima uno nuevo", async () => {
  const a = fixture(), dice = a.client.serviceDice!;
  dice.getSnapshot(); await vi.waitFor(() => expect(dice.getSnapshot().supported).toBe(true));
  a.client.start("player"); await flush();
  const replay = { frameCount: 2, stepMs: 100, durationMs: 100, frames: [0, 1, 2, 0, 0, 0, 1, 3, 4, 5, 0, 0, 0, 1] };
  const recovered = serviceDiceStateSchema.parse({
    audience: "player",
    public: {
      ...serviceDicePlayerFixture.public,
      presentation: {
        rollId: "22222222-2222-4222-8222-222222222222",
        author: serviceDicePlayerFixture.public.history.entries[0]!.author,
        dice: [{ id: "fire:d6:0", type: "d6", damageType: "fire", groupId: "fire", logicalId: "fire:d6:0", role: "pool" }],
        appearance: { color: "ruby", material: "resin" },
        replay,
        result: serviceDicePlayerFixture.public.history.entries[0]!.result,
        startedAt: 900,
        settledAt: 1_100,
        context: serviceDicePlayerFixture.public.publishedContext!
      }
    }
  });
  const bootstrap = { ...a.events[0], diceVersion: 1, state: { ...a.events[0].state, ...a.meta, protocolVersion: 2, diceVersion: 1, serviceDice: recovered } };
  a.send({ diceVersion: 1, state: bootstrap.state }); await flush();
  expect(dice.getSnapshot().state?.public.presentation).toMatchObject({ rollId: recovered.public.presentation!.rollId, replay: null, finalFrame: replay.frames.slice(-7) });

  a.send({ type: "service-dice", sequence: a.events[0].sequence + 1, diceVersion: 1, state: undefined, payload: recovered }); await flush();
  expect(dice.getSnapshot().state?.public.presentation?.replay).toBeNull();

  const live = serviceDiceStateSchema.parse({ ...recovered, public: { ...recovered.public, presentation: { ...recovered.public.presentation!, rollId: "99999999-9999-4999-8999-999999999999" } } });
  a.send({ type: "service-dice", sequence: a.events[0].sequence + 2, diceVersion: 1, state: undefined, payload: live }); await flush();
  expect(dice.getSnapshot().state?.public.presentation).toMatchObject({ rollId: live.public.presentation!.rollId, replay });
});

it("negocia la respuesta de publicar escena sin extender mutaciones legacy", async () => {
  const a = fixture(), dice = a.client.serviceDice!;
  dice.getSnapshot(); await vi.waitFor(() => expect(dice.getSnapshot().supported).toBe(true));
  a.client.start("player"); await flush();
  const state = { ...a.events[0].state!, ...a.meta, protocolVersion: 2, diceVersion: 1 as const, serviceDice: serviceDicePlayerFixture };
  a.send({ diceVersion: 1, state }); await flush();
  a.fetcher.mockImplementationOnce(async (url: RequestInfo | URL, init?: RequestInit) => {
    expect(String(url)).toContain("/table/scene?diceVersion=1");
    expect(init?.method).toBe("POST");
    return new Response(JSON.stringify({ ok: true, state }), { headers: { "Content-Type": "application/json" } });
  });
  await expect(a.client.api.openPlayerWindow()).resolves.toMatchObject({ ok: true });
});
