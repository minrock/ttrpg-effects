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

/** Fixture del lector v3: conserva su catálogo segmentado y omite la jerarquía que v3 no conocía. */
export async function streamVersion3(bundle: string): Promise<void> {
  const path = join(bundle, "manifest.json"), manifest = JSON.parse(readFileSync(path, "utf8")) as CatalogManifest;
  if (manifest.version !== 4 && manifest.version !== 5) throw new Error("La fixture v3 requiere una exportación v4 o v5.");
  const records = readFileSync(join(bundle, "records.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line)).filter((record: { type: string }) => ["resource", "asset", "game"].includes(record.type));
  const body = records.map(record => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
  const counts = records.reduce<Record<string, number>>((result, record: { type: string; kind?: string }) => { const kind = record.type === "resource" ? record.kind! : record.type; result[kind] = (result[kind] ?? 0) + 1; return result; }, {});
  writeFileSync(join(bundle, "records.jsonl"), body);
  writeFileSync(path, JSON.stringify({ ...manifest, version: 3, records: records.length, counts, sha256: createHash("sha256").update(body).digest("hex") }));
}
/** Fixture del formato anterior: catálogo y enlaces embebidos en manifest v2. */
export async function inlineVersion2(bundle: string): Promise<void> {
  const path = join(bundle, "manifest.json");
  const source = JSON.parse(readFileSync(path, "utf8")) as CatalogManifest;
  if (source.version === 4 || source.version === 5) await streamVersion3(bundle);
  else if (source.version !== 3) throw new Error("La fixture v2 requiere una exportación v3, v4 o v5.");
  const manifest = JSON.parse(readFileSync(path, "utf8")) as CatalogManifest;
  const catalog: NonNullable<CatalogManifest["catalog"]> = [], links: NonNullable<CatalogManifest["links"]> = [];
  for await (const entry of catalogRecords(manifest, () => join(bundle, "catalog.jsonl"))) {
    if (entry.type === "link") links.push(entry.value);
    else { let system = catalog.find(s => s.systemId === entry.value.systemId); if (!system) { system = { systemId: entry.value.systemId, name: entry.name, versions: [] }; catalog.push(system); } system.versions.push(entry.value); }
  }
  writeFileSync(path, JSON.stringify({ ...manifest, version: 2, catalog, links, catalogData: undefined }));
  unlinkSync(join(bundle, "catalog.jsonl"));
}

/** Fixture auténtica del lector v1: no llevaba bindings ni systemRef en partidas. */
export async function inlineVersion1(bundle: string): Promise<void> {
  await inlineVersion2(bundle);
  const path = join(bundle, "manifest.json"), manifest = JSON.parse(readFileSync(path, "utf8")) as CatalogManifest;
  const records = readFileSync(join(bundle, "records.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(line => {
    const record = JSON.parse(line) as { type: string; bindings?: unknown; value?: Record<string, unknown> };
    if (record.type === "resource") delete record.bindings;
    if (record.type === "game") delete record.value?.systemRef;
    return record;
  });
  const body = records.map(record => JSON.stringify(record)).join("\n") + (records.length ? "\n" : "");
  writeFileSync(path, JSON.stringify({ ...manifest, version: 1, catalog: undefined, links: undefined, catalogData: undefined, records: records.length, counts: records.reduce<Record<string, number>>((result, record: { type: string; kind?: string }) => { const kind = record.type === "resource" ? record.kind! : record.type; result[kind] = (result[kind] ?? 0) + 1; return result; }, {}), sha256: createHash("sha256").update(body).digest("hex") }));
  writeFileSync(join(bundle, "records.jsonl"), body);
}
