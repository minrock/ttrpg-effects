import type { SceneDocument } from "../sessions/scene-document";
import type { ResourceBindings } from "../systems/system-catalog";
import type { ScenePreparationReservationDto } from "../../shared/contracts/campaigns";

export type ScenePreparationReservation = ScenePreparationReservationDto;

export interface MaterializedScenePreparation {
  readonly scene: SceneDocument;
  readonly bindings: ResourceBindings;
  readonly inserted: boolean;
}

/**
 * Inserta una única copia estable. Si una reintento ve el ID ya materializado,
 * conserva el contenido existente: una preparación posterior nunca lo refresca.
 */
export function materializeReservedSceneEntity(document: SceneDocument, bindings: ResourceBindings, reservation: ScenePreparationReservation): MaterializedScenePreparation {
  // IDs legados pueden coincidir entre NPC y monstruo; solo la misma clase identifica un reintento.
  const exists = reservation.snapshot.kind === "monster"
    ? document.sceneAside.monsters.some(entity => entity.id === reservation.entityId)
    : document.sceneAside.npcs.some(entity => entity.id === reservation.entityId);
  if (exists) return { scene: document, bindings, inserted: false };
  if (reservation.snapshot.kind === "npc") {
    return {
      scene: { ...document, sceneAside: { ...document.sceneAside, npcs: [...document.sceneAside.npcs, { id: reservation.entityId, name: reservation.snapshot.name, imagePath: reservation.snapshot.imagePath, notes: reservation.snapshot.notes, visibleToPlayer: false }] } },
      bindings,
      inserted: true
    };
  }
  if (!reservation.binding) throw new Error("La reserva de monstruo no conserva su binding.");
  return {
    scene: { ...document, sceneAside: { ...document.sceneAside, monsters: [...document.sceneAside.monsters, { id: reservation.entityId, name: reservation.snapshot.name, imagePath: reservation.snapshot.imagePath, notes: reservation.snapshot.notes, templateId: reservation.snapshot.templateId, visibleToPlayer: false }] } },
    bindings: { ...bindings, monsters: { ...bindings.monsters, [reservation.entityId]: reservation.binding } },
    inserted: true
  };
}
