import { describe, expect, it, vi } from "vitest";
import { BrowserServiceDiceClient } from "./service-dice-client";
import { HttpTransport, ServiceError } from "./http";
import { SERVICE_DICE_FIXTURE_IDS, serviceDiceDmFixture, serviceDiceFailureFixture, serviceDicePlayerFixture } from "../../shared/contracts/service-dice.fixtures";
import { serviceDiceStateSchema } from "../../shared/contracts/service-dice";
import { z } from "zod";

const openingId = "77777777-7777-4777-8777-777777777777";
const requestId = "88888888-8888-4888-8888-888888888888";
const rollId = SERVICE_DICE_FIXTURE_IDS.roll;
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function fixture(initialState = serviceDicePlayerFixture) {
  const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const path = String(url);
    if (path.includes("/dice/capabilities")) return json({ ok: true, version: 1, limits: { reservationMs: 20000, historyDefault: 10, historyMax: 50, publicHistory: 500, dmHistory: 1000 } });
    if (path.includes("/dice/v1/state")) return json({ ok: true, state: initialState });
    if (path.includes("/dice/v1/history")) return json({ ok: true, page: serviceDicePlayerFixture.public.history });
    if (path.includes("/operations/")) return json({ ok: true, operation: { ok: true, version: 1, requestId, rollId, outcome: "accepted", publicSequence: 4 } });
    if (init?.method === "POST") return json({ ok: true, version: 1, requestId, rollId, outcome: "already-applied", publicSequence: 4 });
    throw new Error(`ruta inesperada ${path}`);
  });
  const transport = new HttpTransport(fetcher, () => {}, "/api/v1/games/game", `?openingId=${openingId}&generation=1`);
  const enable = vi.fn();
  const client = new BrowserServiceDiceClient(transport, { enable }, { openingId, generation: 1 });
  return { fetcher, enable, client };
}

describe("adaptador de dados de servicio", () => {
  it("negocia una vez, mantiene snapshot estable y usa estado autorizado", async () => {
    const f = fixture(); f.client.getSnapshot(); await vi.waitFor(() => expect(f.client.getSnapshot().supported).toBe(true));
    expect(f.enable).toHaveBeenCalledOnce(); expect(f.client.getSnapshot()).toMatchObject({ supported: true, audience: "player", state: { audience: "player", public: { sequence: serviceDicePlayerFixture.public.sequence } } });
    const snapshot = f.client.getSnapshot(); let notifications = 0; const unsubscribe = f.client.subscribe(() => notifications++);
    f.client.apply(serviceDicePlayerFixture, 10); expect(f.client.getSnapshot()).not.toBe(snapshot); expect(notifications).toBe(1);
    f.client.apply({ audience: "player", public: serviceDiceFailureFixture }, 11); expect(f.client.getSnapshot().state?.public.sequence).toBe(5);
    f.client.apply(serviceDicePlayerFixture, 10); expect(f.client.getSnapshot().state?.public.sequence).toBe(5);
    expect(f.client.dm).toBeUndefined(); f.client.apply(serviceDiceDmFixture, 12); expect(f.client.dm).toBeDefined();
    expect(f.fetcher.mock.calls.filter(([url]) => String(url).includes("/dice/capabilities"))).toHaveLength(1);
    unsubscribe();
  });

  it("envuelve comandos contextuales, conserva requestId y pagina sin mezclar query", async () => {
    const f = fixture(); f.client.getSnapshot(); await flush();
    await expect(f.client.complete(rollId, { frames: [], frameCount: 2, stepMs: 1, durationMs: 1 } as never, requestId)).resolves.toMatchObject({ requestId, rollId });
    const [, init] = f.fetcher.mock.calls.find(([url, request]) => String(url).includes("/dice/v1/complete") && request?.method === "POST")!;
    expect(JSON.parse(String(init?.body))).toEqual({ openingId, generation: 1, command: { rollId, simulation: { frames: [], frameCount: 2, stepMs: 1, durationMs: 1 }, requestId } });
    await f.client.history({ offset: 10, limit: 10, revision: 4 });
    const [historyUrl] = f.fetcher.mock.calls.find(([url]) => String(url).includes("/dice/v1/history"))!;
    expect(String(historyUrl)).toContain("offset=10"); expect(String(historyUrl)).toContain(`openingId=${openingId}`); expect(String(historyUrl)).not.toContain("??");
    await expect(f.client.operation(requestId)).resolves.toMatchObject({ requestId, rollId });
  });

  it("distingue servidor antiguo de una caída transitoria y no vuelve a sondear", async () => {
    const unsupported = vi.fn(async () => json({ ok: false, error: { code: "NOT_FOUND", message: "No" } }, 404));
    const old = new BrowserServiceDiceClient(new HttpTransport(unsupported, () => {}, "/api"), { enable: vi.fn() }, { openingId, generation: 1 }); old.getSnapshot(); await flush();
    expect(old.getSnapshot()).toMatchObject({ supported: false, error: expect.stringContaining("no disponibles") }); expect(unsupported).toHaveBeenCalledOnce();
    const down = vi.fn(async () => json({ ok: false, error: { code: "UNAVAILABLE", message: "Temporal" } }, 503));
    const transient = new BrowserServiceDiceClient(new HttpTransport(down, () => {}, "/api"), { enable: vi.fn() }, { openingId, generation: 1 }); transient.getSnapshot(); await flush();
    expect(transient.getSnapshot().error).toContain("Temporal"); expect(down).toHaveBeenCalledOnce();
    transient.getSnapshot(); transient.getSnapshot(); expect(down).toHaveBeenCalledOnce();
    await expect(transient.operation(requestId)).rejects.toBeInstanceOf(ServiceError); expect(down).toHaveBeenCalledTimes(2);
  });

  it("limpia listeners, estado y mutaciones al perder autoridad", async () => {
    const f = fixture(); f.client.getSnapshot(); await flush(); const listener = vi.fn(); f.client.subscribe(listener); f.client.clear();
    expect(f.client.getSnapshot()).toEqual({ supported: false, connected: false, audience: null, state: null, error: "" }); expect(listener).toHaveBeenCalledOnce();
    await expect(f.client.operation(requestId)).rejects.toMatchObject({ code: "DICE_UNSUPPORTED" });
  });

  it("descarta el state GET que llega después de limpiar la autoridad", async () => {
    let resolveState!: (response: Response) => void;
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      const path = String(url);
      if (path.includes("/dice/capabilities")) return json({ ok: true, version: 1, limits: { reservationMs: 20000, historyDefault: 10, historyMax: 50, publicHistory: 500, dmHistory: 1000 } });
      return new Promise<Response>(resolve => { resolveState = resolve; });
    });
    const client = new BrowserServiceDiceClient(new HttpTransport(fetcher, () => {}, "/api", `?openingId=${openingId}&generation=1`), { enable: vi.fn() }, { openingId, generation: 1 });
    client.getSnapshot(); await vi.waitFor(() => expect(resolveState).toBeDefined()); client.clear();
    resolveState(json({ ok: true, state: serviceDicePlayerFixture })); await flush();
    expect(client.getSnapshot()).toEqual({ supported: false, connected: false, audience: null, state: null, error: "" });
  });

  it("traduce el reloj y conserva estático un bootstrap aunque llegue el mismo roll por SSE", async () => {
    vi.spyOn(Date, "now").mockReturnValue(301_000);
    const replay = { frameCount: 2, stepMs: 100, durationMs: 100, frames: [0, 1, 2, 0, 0, 0, 1, 3, 4, 5, 0, 0, 0, 1] };
    const state = serviceDiceStateSchema.parse({
      audience: "player",
      public: {
        ...serviceDicePlayerFixture.public,
        occupancy: { ...serviceDicePlayerFixture.public.occupancy!, expiresAt: 21_000 },
        presentation: {
          rollId,
          author: serviceDicePlayerFixture.public.history.entries[0]!.author,
          dice: [{ id: "fire:d6:0", type: "d6", damageType: "fire", groupId: "fire", logicalId: "fire:d6:0", role: "pool" }],
          appearance: { color: "ruby", material: "resin" },
          replay,
          result: serviceDicePlayerFixture.public.history.entries[0]!.result,
          critical: { dieId: "fire:d6:0" },
          startedAt: 900,
          settledAt: 1_100,
          context: serviceDicePlayerFixture.public.publishedContext!
        }
      }
    });
    const f = fixture(state);

    f.client.getSnapshot();
    await vi.waitFor(() => expect(f.client.getSnapshot().state?.public.presentation?.replay).toBeNull());
    const bootstrapped = f.client.getSnapshot().state!.public;
    expect(bootstrapped.presentation).toMatchObject({ rollId, replay: null, finalFrame: replay.frames.slice(-7), critical: null, startedAt: 300_900, settledAt: 301_000 });
    expect(bootstrapped.presentation?.dice).toEqual(state.public.presentation?.dice);
    expect(bootstrapped.presentation?.result).toEqual(state.public.presentation?.result);
    expect(bootstrapped.occupancy).toMatchObject({ createdAt: 300_900, expiresAt: 321_000 });
    expect(bootstrapped.history.entries[0]).toMatchObject({ createdAt: 300_900, settledAt: 301_000 });

    f.client.apply(state, 1);
    expect(f.client.getSnapshot().state?.public.presentation).toMatchObject({ rollId, replay: null, finalFrame: replay.frames.slice(-7), critical: null, settledAt: 301_000 });

    const newRollId = "99999999-9999-4999-8999-999999999999";
    const live = serviceDiceStateSchema.parse({ ...state, public: { ...state.public, presentation: { ...state.public.presentation!, rollId: newRollId } } });
    f.client.apply(live, 2);
    expect(f.client.getSnapshot().state?.public.presentation).toMatchObject({ rollId: newRollId, replay });

    f.client.apply({ ...live, public: { ...live.public, presentation: null } }, 3);
    f.client.apply(state, 4);
    expect(f.client.getSnapshot().state?.public.presentation?.replay).toEqual(replay);
    vi.restoreAllMocks();
  });

  it("no invalida la mesa contextual al descubrir servidor antiguo ni ante un 403 de comando", async () => {
    const expired = vi.fn(); let calls = 0;
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const path = String(url); calls++;
      if (path.includes("/dice/capabilities")) return json({ ok: false, error: { code: "NOT_FOUND", message: "Sin extensión" } }, 404);
      return json({ ok: true, preserved: calls, method: init?.method });
    });
    const transport = new HttpTransport(fetcher, expired, "/api", `?openingId=${openingId}&generation=1`);
    const old = new BrowserServiceDiceClient(transport, { enable: vi.fn() }, { openingId, generation: 1 }); old.getSnapshot(); await vi.waitFor(() => expect(old.getSnapshot().error).toContain("no disponibles"));
    await expect(transport.request("/table/state", z.object({ ok: z.literal(true), preserved: z.number(), method: z.string().optional() }))).resolves.toMatchObject({ ok: true });
    expect(expired).not.toHaveBeenCalled();

    const valid = fixture(); valid.client.getSnapshot(); await vi.waitFor(() => expect(valid.client.getSnapshot().supported).toBe(true));
    valid.fetcher.mockImplementationOnce(async () => json({ ok: false, error: { code: "FORBIDDEN", message: "Ajeno" } }, 403));
    await expect(valid.client.dismiss(rollId, requestId)).rejects.toMatchObject({ status: 403 });
    expect(valid.client.getSnapshot().supported).toBe(true);
  });
});
