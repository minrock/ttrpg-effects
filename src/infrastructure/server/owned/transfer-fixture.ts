import { catalogRecords, type CatalogManifest } from "./transfer-catalog";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { ServiceStore } from "../service-store";
import { SceneService } from "../../../server/scene-service";
import { SceneLinksService } from "../../../server/scene-links";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { createDefaultSceneMap, syncRuntimeFieldsFromActiveMap } from "../../../domain/sessions/scene-maps";
import { createMonsterLibraryEntry } from "../../../domain/monster-library/monster-library";
import { createNpcLibraryEntry, createPlayerCharacterLibraryEntry } from "../../../domain/entity-library/entity-library";
import { directory, png } from "./fixtures";
export const digestDirectory = (root: string) => Object.fromEntries(readdirSync(root).filter(name => !name.endsWith(".lock")).map(name => [name, createHash("sha256").update(readFileSync(join(root, name))).digest("hex")]));
export async function legacyFixture() {
  const source = directory(), store = new ServiceStore(source), now = new Date("2026-10-20T12:34:56.789Z"), services = new SceneService(store, () => now.getTime());
  const imageId = randomUUID(), orphanId = randomUUID(); store.saveAsset(imageId, "image/png", png); store.saveAsset(orphanId, "image/png", png);
  const reference = `asset:${imageId}`, base = createDefaultScene();
  const scene = syncRuntimeFieldsFromActiveMap({ ...base,
    maps: [{ ...base.maps[0], map: { ...base.maps[0].map, imagePath: reference }, mapAnnotations: { ...base.maps[0].mapAnnotations, sceneLinks: [{ id: "gate", kind: "scene-link", name: "Paso Ñ", locked: false, position: { x: 2, y: 3 }, connection: null }] } }, { ...createDefaultSceneMap({ id: "map-2" }), name: "Segundo 日本", map: { ...base.map, imagePath: "/ausente/imagen.png" } }],
    sceneAside: { ...base.sceneAside, notes: [{ id: "nota", parentId: null, name: "Nota Ñ", content: `![Imagen](${reference})\nContenido privado` }] }
  });
  const a = services.save("Escena Ñ A", scene), b = services.save("Escena 日本 B", scene);
  new SceneLinksService(services, store).connect({ sourceScenePath: `scene:${a.id}`, sourceMarkerId: "gate", targetScenePath: `scene:${b.id}`, targetMarkerId: "gate" });
  const template = { id: "legacy-personal", name: "Plantilla Ñ", system: "S", markdown: "# Prueba", css: ".stat { color: red; }", builtIn: false as const, updatedAt: now.toISOString() };
  await store.saveUserTemplate(template);
  const monster = createMonsterLibraryEntry({ name: "Monstruo 日本", system: "S", contentMarkdown: `![Ficha](${reference})`, imagePath: reference, templateId: template.id }, { id: randomUUID(), now });
  const npc = createNpcLibraryEntry({ name: "NPC Ñ", imagePath: reference, notes: "Notas privadas" }, { id: randomUUID(), now });
  const character = createPlayerCharacterLibraryEntry({ characterName: "Personaje 日本", playerName: "Jugador", level: "3", species: "Elfo", classes: "Mago", imagePath: reference, stats: { strength: "+2", dexterity: "+3", constitution: "+1", intelligence: "+4", wisdom: "-1", charisma: "0" }, initiative: "+3", armorClass: "12/14", passivePerception: "12", hitPoints: "18/20", spellSaveDc: "14", speeds: "30 ft", notes: "Notas Ñ" }, { id: randomUUID(), now });
  await store.monsters.save(monster); await store.entities.saveNpc(npc); await store.entities.savePlayerCharacter(character);
  const scenes = [store.getScene(a.id)!, store.getScene(b.id)!]; store.close();
  return { source, scenes, imageId, orphanId, template, monster, npc, character };
}

/** Fixture del formato anterior: catálogo y enlaces embebidos en manifest v2. */
export async function inlineVersion2(bundle: string): Promise<void> {
  const path = join(bundle, "manifest.json"), manifest = JSON.parse(readFileSync(path, "utf8")) as CatalogManifest;
  const catalog: NonNullable<CatalogManifest["catalog"]> = [], links: NonNullable<CatalogManifest["links"]> = [];
  for await (const entry of catalogRecords(manifest, () => join(bundle, "catalog.jsonl"))) {
    if (entry.type === "link") links.push(entry.value);
    else { let system = catalog.find(s => s.systemId === entry.value.systemId); if (!system) { system = { systemId: entry.value.systemId, name: entry.name, versions: [] }; catalog.push(system); } system.versions.push(entry.value); }
  }
  writeFileSync(path, JSON.stringify({ ...manifest, version: 2, catalog, links, catalogData: undefined }));
  if (manifest.version === 3) unlinkSync(join(bundle, "catalog.jsonl"));
}
