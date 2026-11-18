import type { PreparedEntityDto, PreparedEntitySnapshot } from "../../shared/contracts/campaigns";

export type { PreparedEntitySnapshot } from "../../shared/contracts/campaigns";

/** Snapshot inmutable para una instancia táctica: nunca arrastra visibilidad, tokens ni combate. */
export function snapshotPreparedEntity(entity: PreparedEntityDto): PreparedEntitySnapshot {
  if (entity.kind === "npc") return { version: 2, kind: "npc", name: entity.name, imagePath: entity.imagePath, notes: entity.notes };
  return { version: 2, kind: "monster", name: entity.name, imagePath: entity.imagePath, notes: entity.notes, templateId: entity.templateId, binding: entity.binding };
}
