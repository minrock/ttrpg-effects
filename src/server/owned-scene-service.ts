import type { ResourceBindings } from "../domain/systems/system-catalog";
import { sceneId } from "../shared/contracts/service-references";
import { randomUUID } from "node:crypto";
import { detectOutdatedSceneFields, parseSceneDocument, serializeSceneDocument } from "../domain/sessions/scene-schema";
import type { SceneDocument } from "../domain/sessions/scene-document";
import type { MissingImage, SceneResource, ServiceWarning } from "../shared/contracts/http-api";
import type { OwnedTransaction } from "../application/services/owned-store";
import { invalid, missing } from "./errors";
import { idSchema } from "./schemas";

export class OwnedSceneService {
  constructor(private readonly store: OwnedTransaction, private readonly now: () => number) {}
  async resolve(reference: string): Promise<string | null> {
    const id = reference.startsWith("asset:") ? reference.slice(6) : "";
    return idSchema.safeParse(id).success && await this.store.assets.has(id) ? `/api/v1/dm/assets/${id}` : null;
  }
  private async missingImages(scene: SceneDocument): Promise<MissingImage[]> {
    const found = new Map<string, string[]>();
    const record = async (reference: string | null, location: string) => {
      if (reference && !await this.resolve(reference)) found.set(reference, [...(found.get(reference) ?? []), location]);
    };
    for (const map of scene.maps) {
      await record(map.map.imagePath, `maps/${map.id}/map`);
      for (const token of map.tokens) await record(token.imagePath, `maps/${map.id}/tokens/${token.id}`);
    }
    for (const [kind, entities] of Object.entries(scene.sceneAside)) {
      if (!Array.isArray(entities)) continue;
      for (const entity of entities) if (typeof entity === "object" && entity !== null && "imagePath" in entity && "id" in entity) await record(entity.imagePath as string | null, `sceneAside/${kind}/${entity.id}`);
    }
    for (const note of scene.sceneAside.notes) {
      for (const image of note.content.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) await record(image[1], `sceneAside/notes/${note.id}`);
    }
    return [...found].map(([reference, locations]) => ({ reference, locations }));
  }
  async get(id: string): Promise<SceneResource & { revision: number; bindings?: ResourceBindings }> {
    const record = await this.store.resources.get("scenes", id); if (!record) throw missing();
    const saved = record.value;
    return { ...saved, revision: record.revision, bindings: record.bindings, missingImages: await this.missingImages(saved.scene) };
  }
  async save(name: string, input: unknown, id?: string, revision = 0, bindings?: ResourceBindings): Promise<SceneResource & { revision: number; bindings?: ResourceBindings }> {
    const previous = id ? (await this.store.resources.get("scenes", id))?.value : null;
    if (id && !previous) throw missing();
    let scene: SceneDocument;
    try { scene = parseSceneDocument(JSON.parse(serializeSceneDocument(parseSceneDocument(input)))); }
    catch { throw invalid("La escena no es válida o no contiene mapas compatibles."); }
    const imageReferences = [
      ...scene.maps.flatMap((map) => [map.map.imagePath, ...map.tokens.map((token) => token.imagePath)]),
      ...scene.sceneAside.monsters.map((entry) => entry.imagePath),
      ...scene.sceneAside.npcs.map((entry) => entry.imagePath),
      ...scene.sceneAside.playerCharacters.map((entry) => entry.imagePath)
    ];
    if (imageReferences.some((reference) => reference !== null && reference.length > 2048)) throw invalid("Las referencias de imagen admiten hasta 2048 caracteres.");
    const warnings: ServiceWarning[] = [];
    if (detectOutdatedSceneFields(input).length) warnings.push({ code: "scene-format-outdated", message: "Se actualizaron campos del formato anterior al formato de escena 2." });
    if (scene.maps.some((map) => map.mapAnnotations.sceneLinks.some((link) => link.connection !== null && [link.connection.origin, link.connection.destination, link.connection.peer].some((end) => end.scenePath !== "" && (() => { try { sceneId(end.scenePath); return false; } catch { return true; } })())))) {
      warnings.push({ code: "external-link-unresolved", message: "Los enlaces heredados se conservan, pero el servicio no abre archivos enlazados." });
    }
    const timestamp = new Date(Math.max(this.now(), previous ? Date.parse(previous.createdAt) : this.now())).toISOString();
    const saved = { id: id ?? randomUUID(), name, createdAt: previous?.createdAt ?? timestamp, updatedAt: timestamp, scene, warnings };
    const result = await this.store.resources.put("scenes", saved, revision, bindings);
    return { ...saved, revision: result.revision, bindings: result.bindings, missingImages: await this.missingImages(scene) };
  }
}
