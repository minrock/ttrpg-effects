import { describe, expect, it } from "vitest";
import { ServiceDiceSession, type ServiceDiceActor } from "./service-dice-session";

const publicContext = { token: "11111111-1111-4111-8111-111111111111", sceneId: "published-scene", mapId: "published-map", label: "Mesa publicada" };
const privateContext = { token: "dm-private-token", sceneId: "draft-scene", mapId: "draft-map", sceneName: "Borrador privado", mapName: "Mapa privado" };
const dm: ServiceDiceActor = { id: "dm-account", role: "dm", author: { kind: "dm" } };
const ana: ServiceDiceActor = { id: "participant-a", role: "player", author: { kind: "player", publicId: "22222222-2222-4222-8222-222222222222", alias: "Ana", discriminator: 2 } };
const bruno: ServiceDiceActor = { id: "participant-b", role: "player", author: { kind: "player", publicId: "33333333-3333-4333-8333-333333333333", alias: "Ana", discriminator: 3 } };
const selection = { groups: [{ id: "fire", damageType: "fire" as const, dice: { d6: 1 }, modifier: 3 }], includeD20: false, d20Modifier: 0, appearance: { color: "ruby", material: "resin" as const }, force: 1, d20: null };
const simulation = { values: [{ id: "fire:d6:0", value: 4 }], replay: { frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30, frames: [0, 0, 1, 0, 0, 0, 1, 0, 0, .5, 0, 0, 0, 1] } };

function uuid(n: number): string { return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`; }
function begin(session: ServiceDiceSession, actor: ServiceDiceActor, n: number, visibility: "public" | "hidden" = "public") { return session.begin(actor, { requestId: uuid(n), contextToken: visibility === "public" ? publicContext.token : privateContext.token, visibility, selection }); }

describe("sesión de dados de servicio", () => {
  it("excluye la pública, permite una oculta DM independiente y no filtra la oculta al jugador", () => {
    let now = 1000; const changes: unknown[] = []; const session = new ServiceDiceSession(change => changes.push(change), () => now, (() => { let n = 100; return () => uuid(n++); })());
    session.setPublishedContext(publicContext); session.setPrivateContext(dm, privateContext); changes.length = 0;
    const accepted = begin(session, ana, 1), publicRoll = accepted.rollId!;
    expect(() => begin(session, bruno, 2)).toThrow(expect.objectContaining({ code: "DICE_OCCUPIED" }));
    expect(session.complete(ana, publicRoll, simulation, uuid(3))).toMatchObject({ status: "complete" });
    const hidden = begin(session, dm, 4, "hidden");
    expect(hidden.rollId).toBeTruthy();
    const player = session.state(bruno), dmState = session.state(dm);
    expect(player.audience).toBe("player");
    expect(JSON.stringify(player)).not.toContain("dm-private-token");
    expect(JSON.stringify(player)).not.toContain("Borrador privado");
    expect(player.public.history.entries[0]).toMatchObject({ visibility: "public", author: ana.author, result: { poolTotal: 7 } });
    expect(dmState.audience).toBe("dm");
    if (dmState.audience === "dm") expect(dmState.private.occupancy).toMatchObject({ rollId: hidden.rollId, context: { token: "dm-private-token" } });
    expect(changes.some(value => (value as { public: boolean }).public)).toBe(true);
    now = 2000; session.sweep();
    expect(session.state(ana).public.presentation?.replay).toBeNull();
    expect(session.state(ana).public.presentation?.finalFrame).toEqual([0, 0, .5, 0, 0, 0, 1]);
    expect(JSON.stringify(session.history(ana, { offset: 0, limit: 10 }))).not.toContain("frames");
  });

  it("solo permite cerrar al autor o DM y un ID viejo no retira la siguiente presentación", () => {
    let now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 200; return () => uuid(n++); })()); session.setPublishedContext(publicContext);
    const first = begin(session, ana, 10).rollId!; session.complete(ana, first, simulation, uuid(11));
    expect(() => session.dismiss(bruno, first, uuid(12))).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(session.dismiss(ana, first, uuid(13))).toMatchObject({ outcome: "accepted" });
    now += 1000;
    const second = begin(session, bruno, 14).rollId!; session.complete(bruno, second, simulation, uuid(15));
    expect(session.dismiss(dm, first, uuid(16))).toMatchObject({ outcome: "obsolete" });
    expect(session.state(ana).public.presentation?.rollId).toBe(second);
    expect(session.dismiss(dm, second, uuid(17))).toMatchObject({ outcome: "accepted" });
  });

  it("conserva recibos por actor, rechaza mismo ID con otro cuerpo y vence la reserva a los 20 segundos", () => {
    let now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 300; return () => uuid(n++); })()); session.setPublishedContext(publicContext);
    const first = begin(session, ana, 20), retry = begin(session, ana, 20);
    expect(retry).toMatchObject({ rollId: first.rollId, outcome: "already-applied" });
    expect(() => session.begin(ana, { requestId: uuid(20), contextToken: publicContext.token, visibility: "public", selection: { ...selection, force: 1.1 } })).toThrow(expect.objectContaining({ code: "DICE_OPERATION_CONTENT_CONFLICT" }));
    now = 20000; session.sweep();
    expect(session.state(ana).public.occupancy).toBeNull();
    expect(session.history(ana, { offset: 0, limit: 10 }).entries[0]).toMatchObject({ status: "failed", result: null });
    expect(() => session.complete(ana, first.rollId!, simulation, uuid(21))).toThrow(expect.objectContaining({ code: "DICE_STALE_ROLL" }));
  });

  it("mantiene 500 entradas públicas sin que las ocultas las desalojen y conserva la presentación al limpiar", () => {
    let now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 400; return () => uuid(n++); })()); session.setPublishedContext(publicContext); session.setPrivateContext(dm, privateContext);
    for (let i = 0; i < 501; i++) {
      const id = begin(session, ana, 1000 + i).rollId!; session.complete(ana, id, simulation, uuid(2000 + i)); session.dismiss(ana, id, uuid(3000 + i)); now += 300001;
    }
    for (let i = 0; i < 501; i++) { const id = begin(session, dm, 4000 + i, "hidden").rollId!; session.complete(dm, id, simulation, uuid(5000 + i)); session.dismiss(dm, id, uuid(6000 + i)); now += 300001; }
    const publicPage = session.history(ana, { offset: 0, limit: 50 });
    expect(publicPage.total).toBe(500); expect(publicPage.entries.every(entry => entry.visibility === "public")).toBe(true);
    expect(session.history(dm, { offset: 0, limit: 50 }).total).toBe(1000);
    expect(JSON.stringify(publicPage)).not.toContain("frames");
    const visible = begin(session, ana, 7001).rollId!; session.complete(ana, visible, simulation, uuid(7002));
    session.clearHistory(dm, uuid(7003));
    expect(session.history(ana, { offset: 0, limit: 10 }).total).toBe(0);
    expect(session.state(ana).public.presentation?.rollId).toBe(visible);
  });

  it("detecta una página obsoleta y revoca solo la preparación del participante", () => {
    const now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 800; return () => uuid(n++); })()); session.setPublishedContext(publicContext);
    const id = begin(session, ana, 8001).rollId!;
    session.revokeParticipant(ana.id);
    expect(session.state(bruno).public.occupancy).toBeNull();
    expect(() => session.history(ana, { offset: 0, limit: 10, revision: 0 })).toThrow(expect.objectContaining({ code: "DICE_HISTORY_CHANGED" }));
    expect(() => session.complete(ana, id, simulation, uuid(8002))).toThrow(expect.objectContaining({ code: "DICE_STALE_ROLL" }));
  });

  it("reserva recibos para completar y cerrar en el borde, y separa los presupuestos DM y jugador", () => {
    const now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 900; return () => uuid(n++); })()); session.setPublishedContext(publicContext); session.setPrivateContext(dm, privateContext);
    type StoredReceipt = { fingerprint: string; ack: ReturnType<ServiceDiceSession["operation"]> extends infer T ? Exclude<T, null> : never; until: number; role: "dm" | "player" };
    const receipts = (session as unknown as { receipts: Map<string, Map<string, StoredReceipt>> }).receipts;
    const nearLimit = new Map<string, StoredReceipt>();
    for (let i = 0; i < 61; i++) nearLimit.set(uuid(9100 + i), { fingerprint: `f${i}`, ack: { ok: true, version: 1, requestId: uuid(9100 + i), outcome: "accepted", publicSequence: 0 }, until: 300000, role: "player" });
    receipts.set(ana.id, nearLimit);
    const roll = begin(session, ana, 9200).rollId!;
    const completed = session.complete(ana, roll, simulation, uuid(9201));
    const closed = session.dismiss(ana, roll, uuid(9202));
    expect(session.operation(ana, uuid(9201))).toEqual(completed);
    expect(session.operation(ana, uuid(9202))).toEqual(closed);
    expect(receipts.get(ana.id)?.size).toBe(64);
    const before = session.history(ana, { offset: 0, limit: 50 }).total;
    expect(() => begin(session, ana, 9203)).toThrow(expect.objectContaining({ code: "DICE_RATE_LIMITED" }));
    expect(session.history(ana, { offset: 0, limit: 50 }).total).toBe(before);
    expect(JSON.stringify([...receipts.values()].flatMap(value => [...value.values()]))).not.toContain("frames");

    const isolated = new ServiceDiceSession(() => {}, () => now, (() => { let n = 10000; return () => uuid(n++); })()); isolated.setPublishedContext(publicContext); isolated.setPrivateContext(dm, privateContext);
    const isolatedReceipts = (isolated as unknown as { receipts: Map<string, Map<string, StoredReceipt>> }).receipts;
    for (let i = 0; i < 1024; i++) isolatedReceipts.set(`player-${i}`, new Map([[uuid(11000 + i), { fingerprint: `p${i}`, ack: { ok: true, version: 1, requestId: uuid(11000 + i), outcome: "accepted", publicSequence: 0 }, until: 300000, role: "player" }]]));
    expect(begin(isolated, dm, 13000, "hidden")).toMatchObject({ outcome: "accepted" });
  });

  it("limita begin a una ráfaga de cuatro y repone una plaza por segundo", () => {
    let now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 14000; return () => uuid(n++); })()); session.setPublishedContext(publicContext);
    for (let i = 0; i < 4; i++) { const roll = begin(session, ana, 14100 + i).rollId!; session.dismiss(ana, roll, uuid(14200 + i)); }
    expect(() => begin(session, ana, 14300)).toThrow(expect.objectContaining({ code: "DICE_RATE_LIMITED" }));
    now += 1000;
    expect(begin(session, ana, 14301)).toMatchObject({ outcome: "accepted" });
  });

  it("solo permite que el DM autor oculte su resumen, incluso antes de complete", () => {
    const now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 15000; return () => uuid(n++); })()); session.setPublishedContext(publicContext);
    const dmRoll = begin(session, dm, 15100).rollId!;
    expect(session.setMapResultVisibility(dm, dmRoll, false, uuid(15101))).toMatchObject({ outcome: "accepted" });
    session.complete(dm, dmRoll, simulation, uuid(15102));
    expect(session.state(ana).public.presentation?.result).toBeNull();
    expect(session.state(dm).public.presentation?.result).toMatchObject({ poolTotal: 7 });
    session.dismiss(dm, dmRoll, uuid(15103));
    const playerRoll = begin(session, ana, 15104).rollId!;
    session.complete(ana, playerRoll, simulation, uuid(15105));
    expect(() => session.setMapResultVisibility(dm, playerRoll, false, uuid(15106))).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(session.state(bruno).public.presentation?.result).toMatchObject({ poolTotal: 7 });
  });

  it("reserva un ACK de moderación aunque el DM tenga una tirada oculta al límite", () => {
    const now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 16000; return () => uuid(n++); })()); session.setPublishedContext(publicContext); session.setPrivateContext(dm, privateContext);
    type StoredReceipt = { fingerprint: string; ack: { ok: true; version: 1; requestId: string; outcome: "accepted"; publicSequence: number }; until: number; role: "dm" | "player" };
    const receipts = (session as unknown as { receipts: Map<string, Map<string, StoredReceipt>> }).receipts;
    receipts.set(dm.id, new Map(Array.from({ length: 61 }, (_, i) => [uuid(16100 + i), { fingerprint: `d${i}`, ack: { ok: true, version: 1, requestId: uuid(16100 + i), outcome: "accepted", publicSequence: 0 }, until: 300000, role: "dm" as const }])));
    expect(begin(session, dm, 16200, "hidden")).toMatchObject({ outcome: "accepted" });
    const publicRoll = begin(session, ana, 16201).rollId!;
    const closed = session.dismiss(dm, publicRoll, uuid(16202));
    expect(session.operation(dm, uuid(16202))).toEqual(closed);
    expect(session.state(ana).public.occupancy).toBeNull();
  });

  it("acepta la entrada máxima demostrada sin mutar parcialmente complete", () => {
    const now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 17000; return () => uuid(n++); })()); session.setPublishedContext(publicContext);
    const damage = ["acid", "bludgeoning", "slashing", "piercing", "fire", "cold", "force", "necrotic", "psychic", "radiant", "lightning", "thunder"] as const;
    const groups = damage.map((damageType, index) => ({ id: "\u0001".repeat(149) + index, damageType, dice: { d6: 2 }, modifier: 0 }));
    const largeSelection = { ...selection, groups };
    const roll = session.begin(ana, { requestId: uuid(17100), contextToken: publicContext.token, visibility: "public", selection: largeSelection }).rollId!;
    const values = groups.flatMap(group => [0, 1].map(index => ({ id: `${group.id}:d6:${index}`, value: 4 })));
    const frames = Array(24 * 2 * 7).fill(0); for (let i = 0; i < frames.length; i += 7) frames[i + 6] = 1;
    const largeSimulation = { values, replay: { frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30, frames } };
    expect(session.complete(ana, roll, largeSimulation, uuid(17101))).toMatchObject({ status: "complete" });
    expect(Buffer.byteLength(JSON.stringify(session.history(ana, { offset: 0, limit: 10 }).entries[0]))).toBeGreaterThan(32 * 1024);
  });

  it("vence complete sin necesitar tick, reserva fail al autor y permite al DM cancelar con dismiss", () => {
    let now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 1000; return () => uuid(n++); })()); session.setPublishedContext(publicContext);
    const timed = begin(session, ana, 13000).rollId!; now = 20000;
    expect(() => session.complete(ana, timed, simulation, uuid(13001))).toThrow(expect.objectContaining({ code: "DICE_STALE_ROLL" }));
    now++;
    const pending = begin(session, ana, 13002).rollId!;
    expect(() => session.fail(dm, pending, uuid(13003))).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(session.dismiss(dm, pending, uuid(13004))).toMatchObject({ outcome: "accepted", status: "interrupted" });
  });

  it("exige revisión en páginas posteriores y descarta la presentación privada anterior al cambiar su contexto", () => {
    const now = 0; const session = new ServiceDiceSession(() => {}, () => now, (() => { let n = 1100; return () => uuid(n++); })()); session.setPublishedContext(publicContext); session.setPrivateContext(dm, privateContext);
    const publicRoll = begin(session, ana, 14000).rollId!; session.complete(ana, publicRoll, simulation, uuid(14001));
    const hidden = begin(session, dm, 14002, "hidden").rollId!; session.complete(dm, hidden, simulation, uuid(14003));
    expect(() => session.history(dm, { offset: 1, limit: 10 })).toThrow(expect.objectContaining({ code: "DICE_HISTORY_CHANGED" }));
    session.setPrivateContext(dm, { ...privateContext, token: "new-private-token" });
    const dmState = session.state(dm);
    if (dmState.audience === "dm") expect(dmState.private.presentation).toBeNull();
    expect(session.state(ana).public.presentation?.rollId).toBe(publicRoll);
  });
});
