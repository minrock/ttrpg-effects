import { describe, expect, it } from "vitest";
import { createDefaultScene } from "../sessions/default-scene";
import { materializeReservedSceneEntity, type ScenePreparationReservation } from "./scene-snapshot";

const baseReservation: ScenePreparationReservation = {
  sceneId: "11111111-1111-4111-8111-111111111111",
  preparedId: "22222222-2222-4222-8222-222222222222",
  entityId: "reserved-goblin",
  snapshot: { version: 2, kind: "monster", name: "Goblin", imagePath: "asset:goblin", notes: "No refrescar", templateId: "generic-markdown", binding: { scope: "catalog", systemId: "generic", version: 1, templateId: "generic-markdown" } },
  binding: { scope: "catalog", systemId: "generic", version: 1, templateId: "generic-markdown" }
};

describe("materialización de preparación reservada", () => {
  it("crea una copia táctica invisible y conserva el binding retenido", () => {
    const result = materializeReservedSceneEntity(createDefaultScene(), { monsters: {} }, baseReservation);
    expect(result.inserted).toBe(true);
    expect(result.scene.sceneAside.monsters).toEqual([{ id: "reserved-goblin", name: "Goblin", imagePath: "asset:goblin", notes: "No refrescar", templateId: "generic-markdown", visibleToPlayer: false }]);
    expect(result.bindings.monsters["reserved-goblin"]).toEqual(baseReservation.binding);
  });

  it("es idempotente y no refresca una copia existente", () => {
    const first = materializeReservedSceneEntity(createDefaultScene(), { monsters: {} }, baseReservation);
    const changedReservation: ScenePreparationReservation = { ...baseReservation, snapshot: { ...baseReservation.snapshot, name: "Goblin actualizado", notes: "No debe propagarse" } };
    const retry = materializeReservedSceneEntity(first.scene, first.bindings, changedReservation);
    expect(retry.inserted).toBe(false);
    expect(retry.scene.sceneAside.monsters[0]).toMatchObject({ name: "Goblin", notes: "No refrescar" });
  });

  it("no agrega binding a NPC y conserva su visibilidad inicial privada", () => {
    const reservation: ScenePreparationReservation = { ...baseReservation, entityId: "reserved-npc", snapshot: { version: 2, kind: "npc", name: "Guía", imagePath: null, notes: "Secreto" }, binding: null };
    const result = materializeReservedSceneEntity(createDefaultScene(), { monsters: {} }, reservation);
    expect(result.scene.sceneAside.npcs).toEqual([{ id: "reserved-npc", name: "Guía", imagePath: null, notes: "Secreto", visibleToPlayer: false }]);
    expect(result.bindings).toEqual({ monsters: {} });
  });

  it("no confunde un ID legado de NPC con el reintento de un monstruo", () => {
    const scene = { ...createDefaultScene(), sceneAside: { ...createDefaultScene().sceneAside, npcs: [{ id: baseReservation.entityId, name: "NPC legado", imagePath: null, notes: "", visibleToPlayer: false }] } };
    const result = materializeReservedSceneEntity(scene, { monsters: {} }, baseReservation);
    expect(result.inserted).toBe(true);
    expect(result.scene.sceneAside.npcs).toHaveLength(1);
    expect(result.scene.sceneAside.monsters).toHaveLength(1);
  });
});
