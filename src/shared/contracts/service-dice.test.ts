import { describe, expect, it } from "vitest";
import { serviceDiceBeginSchema, serviceDiceHistoryPageSchema, serviceDicePlayerBeginSchema, serviceDicePublicStateSchema, serviceDiceStateSchema } from "./service-dice";
import { SERVICE_DICE_FIXTURE_IDS, serviceDiceDmFixture, serviceDiceFailureFixture, serviceDicePlayerFixture, serviceDicePublicFixture } from "./service-dice.fixtures";
import { serviceDiceTableEventSchema, serviceDiceTableStateSchema } from "./table";
import { contextualEventSchema, serviceDiceContextualEventSchema, serviceDiceContextualStateSchema } from "./moderation";

describe("contrato C-61 de dados de servicio", () => {
  it("mantiene una fixture pública estable sin identidad privada", () => {
    expect(serviceDicePublicStateSchema.parse(serviceDicePublicFixture)).toEqual(serviceDicePublicFixture);
    expect(serviceDiceStateSchema.parse(serviceDicePlayerFixture)).toEqual(serviceDicePlayerFixture);
    expect(serviceDiceStateSchema.parse(serviceDiceDmFixture)).toEqual(serviceDiceDmFixture);
    expect(serviceDicePublicStateSchema.parse(serviceDiceFailureFixture)).toEqual(serviceDiceFailureFixture);
    const serialized = JSON.stringify(serviceDicePlayerFixture);
    expect(serialized).not.toContain("accountId");
    expect(serialized).not.toContain("cookie");
    expect(serialized).not.toContain("Private");
  });

  it("solo admite begin público en el límite de jugador y no admite autor inyectado", () => {
    const selection = serviceDicePublicFixture.history.entries[0].selection;
    const player = { requestId: "44444444-4444-4444-8444-444444444444", contextToken: SERVICE_DICE_FIXTURE_IDS.context, visibility: "public", selection };
    expect(serviceDicePlayerBeginSchema.parse(player)).toEqual(player);
    expect(() => serviceDicePlayerBeginSchema.parse({ ...player, visibility: "hidden" })).toThrow();
    expect(() => serviceDiceBeginSchema.parse({ ...player, author: { kind: "dm" } })).toThrow();
  });

  it("no acepta un historial público que cambie el tipo de visibilidad o fabrique resultado", () => {
    const page = structuredClone(serviceDicePublicFixture.history) as { entries: Array<Record<string, unknown>> };
    page.entries[0] = { ...page.entries[0], visibility: "hidden" };
    expect(() => serviceDicePublicStateSchema.parse({ ...serviceDicePublicFixture, history: page })).toThrow();
    const incomplete = structuredClone(serviceDicePublicFixture.history) as { entries: Array<Record<string, unknown>> };
    incomplete.entries[0] = { ...incomplete.entries[0], result: null };
    expect(() => serviceDiceHistoryPageSchema.parse(incomplete)).toThrow();
  });

  it("mantiene la extensión de mesa separada del protocolo base", () => {
    const table = {
      protocolVersion: 1,
      epoch: "66666666-6666-4666-8666-666666666666",
      context: null,
      revision: 0,
      serverTime: 1000,
      snapshot: null,
      camera: null,
      cameraCommand: null,
      dice: { revision: 0, presentation: null },
      sizes: { revision: 0, dm: 1, player: 1 },
      pointer: null,
      highlight: null,
      diceVersion: 1,
      serviceDice: serviceDicePlayerFixture
    };
    expect(serviceDiceTableStateSchema.parse(table).serviceDice).toEqual(serviceDicePlayerFixture);
    expect(serviceDiceContextualStateSchema.parse({ ...table, protocolVersion: 2, gameId: "77777777-7777-4777-8777-777777777777", openingId: "88888888-8888-4888-8888-888888888888", generation: 1, systemRef: { systemId: "generic", version: 1 }, systemHash: "a".repeat(64), modules: { version: 1, rules: "generic-v1", measurement: "grid-measurement-v1", presentation: "monster-markdown-v1" }, audience: "player" }).serviceDice).toEqual(serviceDicePlayerFixture);
  });

  it("conserva los payloads heredados y exige estado de dados solo en service-dice", () => {
    const base = { epoch: "66666666-6666-4666-8666-666666666666", context: null, revision: 0, serverTime: 1000, sequence: 2, diceVersion: 1 as const };
    expect(serviceDiceTableEventSchema.parse({ ...base, protocolVersion: 1, type: "camera", payload: { center: { x: 12, y: 4 }, zoom: 1.5 } }).payload).toEqual({ center: { x: 12, y: 4 }, zoom: 1.5 });
    expect(() => serviceDiceTableEventSchema.parse({ ...base, protocolVersion: 1, type: "service-dice", payload: { wrong: true } })).toThrow();
    const contextual = { ...base, protocolVersion: 2 as const, type: "presence", payload: { count: 2 }, gameId: "77777777-7777-4777-8777-777777777777", openingId: "88888888-8888-4888-8888-888888888888", generation: 1, systemRef: { systemId: "generic", version: 1 }, systemHash: "a".repeat(64), modules: { version: 1, rules: "generic-v1", measurement: "grid-measurement-v1", presentation: "monster-markdown-v1" }, audience: "player" as const };
    expect(serviceDiceContextualEventSchema.parse(contextual).payload).toEqual({ count: 2 });
    expect(() => serviceDiceContextualEventSchema.parse({ ...contextual, type: "service-dice", payload: { wrong: true } })).toThrow();
  });

  it("conserva el wire bootstrap de cliente anterior y aísla la variante negociada", () => {
    const table = {
      protocolVersion: 1 as const, epoch: "66666666-6666-4666-8666-666666666666", context: null, revision: 0, serverTime: 1000,
      snapshot: null, camera: null, cameraCommand: null, dice: { revision: 0, presentation: null }, sizes: { revision: 0, dm: 1, player: 1 }, pointer: null, highlight: null
    };
    const transport = { gameId: "77777777-7777-4777-8777-777777777777", openingId: "88888888-8888-4888-8888-888888888888", generation: 1, systemRef: { systemId: "generic", version: 1 }, systemHash: "a".repeat(64), modules: { version: 1, rules: "generic-v1", measurement: "grid-measurement-v1", presentation: "monster-markdown-v1" }, audience: "player" as const };
    const legacyBootstrap = { protocolVersion: 2 as const, epoch: table.epoch, context: null, revision: 0, serverTime: 1000, sequence: 0, type: "bootstrap" as const, state: table, ...transport };
    expect(contextualEventSchema.parse(legacyBootstrap).state?.protocolVersion).toBe(1);
    expect(() => contextualEventSchema.parse({ ...legacyBootstrap, state: { ...table, protocolVersion: 2 } })).toThrow();
    const negotiated = { ...legacyBootstrap, diceVersion: 1 as const, state: { ...table, protocolVersion: 2 as const, ...transport, diceVersion: 1 as const, serviceDice: serviceDicePlayerFixture } };
    expect(serviceDiceContextualEventSchema.parse(negotiated).state?.protocolVersion).toBe(2);
    expect(() => serviceDiceContextualEventSchema.parse({ ...negotiated, state: table })).toThrow();
  });
});
