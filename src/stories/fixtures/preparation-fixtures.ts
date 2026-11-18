import type { CampaignClient } from "../../infrastructure/browser/campaign-client";
import type { CreatePreparedEntityInput, PreparedEntityDto, PreparedEntityListQuery, UpdatePreparedEntityInput } from "../../shared/contracts/campaigns";
import { storyArcId, storyCampaignId, storyTimestamp } from "./composition-fixtures";

export const storyPreparedNpc: PreparedEntityDto = { id: "44444444-4444-4444-8444-444444444444", arcId: storyArcId, kind: "npc", name: "Asha la vigía", imagePath: null, notes: "Conoce los pasadizos y evita nombrar al antiguo farero.", revision: 1, createdAt: storyTimestamp, updatedAt: storyTimestamp, provenance: null };
export const storyPreparedMonster: PreparedEntityDto = { id: "55555555-5555-4555-8555-555555555555", arcId: storyArcId, kind: "monster", name: "Vigía anfibio", imagePath: null, notes: "Protege el umbral inundado.", templateId: "vigia", binding: { scope: "catalog", systemId: "generic", version: 1, templateId: "vigia" }, revision: 1, createdAt: storyTimestamp, updatedAt: storyTimestamp, provenance: null };
export const storyRetainedMonster: PreparedEntityDto = { id: "77777777-7777-4777-8777-777777777777", arcId: storyArcId, kind: "monster", name: "Centinela retenido", imagePath: null, notes: "Conserva un vínculo histórico no disponible.", templateId: null, binding: { scope: "catalog", systemId: "private", version: 1, templateId: "retained-template" }, revision: 1, createdAt: storyTimestamp, updatedAt: storyTimestamp, provenance: null };

/** Cliente aislado para historias: conserva CRUD en memoria y no abre red, editor ni selector de archivos. */
export function preparationStoryClient(initial: readonly PreparedEntityDto[]): CampaignClient {
  let values = [...initial];
  let sequence = 6;
  return {
    listPreparation: async (_campaignId: string, _arcId: string, query: PreparedEntityListQuery = {}) => {
      const filtered = query.kind ? values.filter(value => value.kind === query.kind) : values;
      const offset = query.offset ?? 0; const limit = query.limit ?? 50;
      return { items: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset };
    },
    getPreparation: async (_campaignId: string, _arcId: string, id: string) => {
      const value = values.find(item => item.id === id);
      if (!value) throw new Error("La ficha ya no existe.");
      return value;
    },
    createPreparation: async (_campaignId: string, _arcId: string, input: CreatePreparedEntityInput) => {
      const id = `66666666-6666-4666-8666-${String(sequence++).padStart(12, "0")}`;
      const common = { id, arcId: storyArcId, name: input.name, imagePath: input.imagePath, notes: input.notes, revision: 1, createdAt: storyTimestamp, updatedAt: storyTimestamp, provenance: null };
      const value: PreparedEntityDto = input.kind === "npc" ? { ...common, kind: "npc" } : { ...common, kind: "monster", templateId: input.templateId, binding: input.binding };
      values = [value, ...values]; return value;
    },
    updatePreparation: async (_campaignId: string, _arcId: string, id: string, _revision: number, input: UpdatePreparedEntityInput) => {
      const current = values.find(value => value.id === id);
      if (!current) throw new Error("La ficha ya no existe.");
      const next: PreparedEntityDto = input.kind === "monster" && current.kind === "monster"
        ? { ...current, ...input, templateId: input.templateId ?? current.templateId, binding: input.binding ?? current.binding, revision: current.revision + 1, updatedAt: storyTimestamp }
        : { ...current, ...input, revision: current.revision + 1, updatedAt: storyTimestamp } as PreparedEntityDto;
      values = values.map(value => value.id === id ? next : value); return next;
    },
    deletePreparation: async (_campaignId: string, _arcId: string, id: string) => { values = values.filter(value => value.id !== id); },
    uploadCover: async () => null
  } as unknown as CampaignClient;
}
export const preparationTemplates = [{ id: "vigia", name: "Vigía anfibio" }, { id: "lobo", name: "Lobo de las cavernas" }];
export const preparationStoryCampaignId = storyCampaignId;
