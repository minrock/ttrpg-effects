import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { GameRuntimeRegistry } from "./game-runtime";
it("cotas globales/por partida, reserva DM, participantes únicos y limpieza", () => {
  const registry = new GameRuntimeRegistry(Date.now, randomUUID);
  const contexts = Array.from({ length: 33 }, () => ({ ownerId: "owner", gameId: randomUUID(), openingId: randomUUID(), generation: 1 }));
  for (const context of contexts.slice(0, 32)) registry.runtime(context);
  expect(() => registry.runtime(contexts[32])).toThrow(); registry.discard(contexts[0]); registry.runtime(contexts[32]); registry.clear();
  const releases: Array<() => void> = [];
  for (const context of contexts.slice(0, 2)) for (let n = 0; n < 28; n++) { let release = () => {}; release = registry.register(context, randomUUID(), "player", () => release(), randomUUID()); releases.push(release); }
  expect(() => registry.register(contexts[2], randomUUID(), "player", () => {})).toThrow();
  for (const context of contexts.slice(0, 2)) for (let n = 0; n < 4; n++) { let release = () => {}; release = registry.register(context, randomUUID(), "dm", () => release()); releases.push(release); }
  expect(() => registry.register(contexts[2], randomUUID(), "dm", () => {})).toThrow();
  releases.forEach(release => release()); registry.clear(); expect(() => registry.register(contexts[0], "free", "player", () => {})).not.toThrow();
});
it("lectores HTTP tienen cupos de principal/apertura, reserva DM y cancelación de ciclo de vida", () => {
  let at = 1000; const registry = new GameRuntimeRegistry(() => at, randomUUID), closed: string[] = [];
  const ctx = (owner: string, game = randomUUID()) => ({ ownerId: owner, gameId: game, openingId: randomUUID(), generation: 1 });
  const open = (context: ReturnType<typeof ctx>, principal: string, role: "player" | "dm", expiresAt?: string) => registry.request(context, principal, role, () => closed.push(principal), role === "player" ? principal : undefined, expiresAt);
  const context = ctx("owner"); for (let i = 0; i < 4; i++) open(context, "player", "player"); expect(() => open(context, "player", "player")).toThrow(); registry.revoke(context, "player"); expect(registry.pendingRequests).toBe(0); expect(closed).toHaveLength(4);
  for (let i = 0; i < 8; i++) { const c = ctx("owner"); for (let j = 0; j < 4; j++) open(c, `p${i}`, "player"); }
  expect(() => open(ctx("owner"), "exceso", "player")).toThrow();
  for (const owner of ["one", "two"]) { const c = ctx(owner); for (let i = 0; i < 8; i++) open(c, `${owner}${i}`, "dm"); }
  expect(registry.pendingRequests).toBe(48); expect(() => open(ctx("three"), "other", "dm")).toThrow(); registry.clear(); expect(registry.pendingRequests).toBe(0);
  const release = open(context, "expira", "player", new Date(2000).toISOString()); at = 2000; registry.expire(); release(); expect(registry.pendingRequests).toBe(0);
  open(context, "leave", "player"); registry.leave(context.gameId, "leave"); open(context, "closed", "player"); registry.discardGame(context.gameId); open(context, "disabled", "player"); registry.discardOwner(context.ownerId); open(context, "session", "dm"); registry.revokeHost(context.ownerId, "session"); expect(registry.pendingRequests).toBe(0);
});
