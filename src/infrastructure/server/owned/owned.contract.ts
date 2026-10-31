import { GENERIC_SYSTEM } from "../../../domain/systems/system-catalog";
import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { request } from "node:http";
import { cleanup, fixture, accounts, open, listen, http, png, raw, origin } from "./fixtures";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { createDefaultSceneMap, syncRuntimeFieldsFromActiveMap } from "../../../domain/sessions/scene-maps";
import { OwnedSceneService } from "../../../server/owned-scene-service";
import { OwnedSceneLinksService } from "../../../server/owned-scene-links";
import { ownedGames } from "../../../application/services/owned-games";
import { ownedRepositories } from "./repository";
import { GameRuntimeRegistry } from "../../../application/services/game-runtime";
import { identityDatabase } from "../identity/database";
import type { OwnedTransaction } from "../../../application/services/owned-store";
import type { SceneResource } from "../../../shared/contracts/http-api";
import type { GameMetadata } from "../../../domain/games/game-metadata";
import { builtInMonsterTemplates } from "../../../domain/monster-templates/monster-template";
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
const template = { id: "personal", name: "Personal", system: "Prueba", markdown: "# Ñ", css: "", builtIn: false as const, updatedAt: new Date().toISOString() };
function marked() { const scene = createDefaultScene(); return syncRuntimeFieldsFromActiveMap({ ...scene, maps: scene.maps.map(m => ({ ...m, mapAnnotations: { ...m.mapAnnotations, sceneLinks: [{ id: "gate", kind: "scene-link" as const, position: { x: 0, y: 0 }, name: "Paso", locked: false, connection: null }] } })) }); }
for (const kind of ["sqlite", "postgres"] as const) describe(`Propiedad real ${kind}`, () => {
  it("HTTP CRUD partidas, revisión/idempotencia persistida, dueño inmutable y recursos reutilizables", async () => {
    const config = await fixture(kind), { identity, aCookie, bCookie, adminCookie, a } = await accounts(config), port = await listen(identity);
    const op = randomUUID();
    const response = await http(port, "/games", aCookie, "POST", { name: "  Ñ 日本  ", systemRef: GENERIC_SYSTEM }, { "idempotency-key": op }); expect(response.status).toBe(201);
    const game = response.json.game as GameMetadata; expect(game).toMatchObject({ ownerId: a.id, revision: 1, name: "Ñ 日本", state: "ready" }); expect(response.headers.location).toContain(game.id);
    expect((await http(port, "/games", aCookie, "POST", { name: "  Ñ 日本  ", systemRef: GENERIC_SYSTEM }, { "idempotency-key": op })).json).toEqual(response.json);
    expect((await http(port, "/games", aCookie, "POST", { name: "Distinta", systemRef: GENERIC_SYSTEM }, { "idempotency-key": op })).status).toBe(409);
    expect((await http(port, "/games", aCookie, "POST", { name: "Falsa", systemRef: GENERIC_SYSTEM, ownerId: "otro" })).status).toBe(422);
    await http(port, "/games", aCookie, "POST", { name: "Ñ 日本", systemRef: GENERIC_SYSTEM }); await http(port, "/games", bCookie, "POST", { name: "B", systemRef: GENERIC_SYSTEM });
    expect((await http(port, "/games?offset=100", aCookie)).json).toMatchObject({ games: [], total: 2 });
    for (const cookie of [bCookie, adminCookie, "ttrpg_session=legacy", ""]) {
      const expected = cookie === bCookie ? 404 : cookie === adminCookie ? 403 : 401;
      expect((await http(port, `/games/${game.id}`, cookie)).status).toBe(expected);
      expect((await http(port, `/games/${game.id}`, cookie, "PATCH", { name: "Invasión" }, { "if-match": "1" })).status).toBe(expected);
      expect((await http(port, `/games/${game.id}`, cookie, "DELETE", {}, { "if-match": "1" })).status).toBe(expected);
    }
    const image = await http(port, "/assets", aCookie, "POST", png, { "content-type": "image/png" }); expect(image.status).toBe(201); const asset = image.json.asset as { id: string; reference: string };
    const scene = createDefaultScene(); const withImage = syncRuntimeFieldsFromActiveMap({ ...scene, maps: scene.maps.map(m => ({ ...m, map: { ...m.map, imagePath: asset.reference } })) });
    const created = await http(port, "/scenes", aCookie, "POST", { name: "A", scene: withImage }); expect(created.status).toBe(201);
    await identity.authorized(aCookie, "dm", async (_, tx) => { await tx.openings.start(game.id, 1); });
    expect((await http(port, `/games/${game.id}`, aCookie, "PATCH", { state: "archived" }, { "if-match": "1" })).status).toBe(200);
    expect(await identity.authorized(aCookie, "dm", async (_, tx) => (await tx.openings.current(game.id))?.state)).toBe("closed");
    for (const method of ["PATCH", "DELETE"]) {
      const stale = await http(port, `/games/${game.id}`, aCookie, method, method === "PATCH" ? { name: "Pendiente" } : {}, { "if-match": "1" });
      expect(stale.status).toBe(409); expect(stale.json).toMatchObject({ error: { code: "REVISION_CONFLICT", message: expect.stringContaining("Conserva tus cambios pendientes") } });
    }
    expect((await http(port, `/games/${game.id}`, aCookie, "DELETE", {}, { "if-match": "2" })).status).toBe(200);
    expect((await http(port, "/scenes", aCookie)).json.total).toBe(1); expect((await http(port, `/assets/${asset.id}`, aCookie)).bytes).toEqual(png);
    expect((await http(port, "/games", aCookie)).json.total).toBe(1);
    await identity.close(); const restarted = await open(config), retryPort = await listen(restarted);
    expect((await http(retryPort, "/games", aCookie, "POST", { name: "  Ñ 日本  ", systemRef: GENERIC_SYSTEM }, { "idempotency-key": op })).json).toEqual(response.json);
    expect((await http(retryPort, `/games/${game.id}`, aCookie)).status).toBe(404);
  });
  it("matriz HTTP de escenas/assets/plantillas/bibliotecas y búsqueda literal Unicode", async () => {
    const { identity, aCookie, bCookie, adminCookie } = await accounts(await fixture(kind)), port = await listen(identity);
    const scene = (await http(port, "/scenes/import", aCookie, "POST", { name: "Privada", scene: createDefaultScene() })).json.resource as SceneResource;
    const asset = (await http(port, "/assets", aCookie, "POST", png, { "content-type": "image/png" })).json.asset as { id: string; reference: string };
    for (const cookie of [aCookie,bCookie]) expect((await http(port,"/monster-templates/personal",cookie,"PUT",{ template })).status).toBe(409);
    expect((await http(port, `/monster-templates/${builtInMonsterTemplates[0].id}`, aCookie,"PUT",{template})).status).toBe(409);
    const npc = (await http(port, "/libraries/npcs", aCookie, "POST", { entry: { name: "Ñ %_\\ 日本", notes: "秘密" } })).json.entry as { id: string };
    const monster = (await http(port, "/libraries/monsters", aCookie, "POST", { entry: { name: "M", system: "S", contentMarkdown: "# M", templateId: builtInMonsterTemplates[0].id }, bindings: { root: { scope: "catalog", systemId: "dnd-55e", version: 1, templateId: builtInMonsterTemplates[0].id }, monsters: {} } })).json.entry as { id: string };
    const character = (await http(port, "/libraries/player-characters", aCookie, "POST", { entry: { characterName: "C", stats: { strength: "+2" }, armorClass: "12/14" } })).json.entry as { id: string };
    expect(npc.id).toBeTruthy(); expect(monster.id).toBeTruthy(); expect(character.id).toBeTruthy();
    const blocked = await http(port, "/monster-templates/personal", aCookie, "DELETE", {}, { "if-match": "1" });
    expect(blocked.status).toBe(409); expect(blocked.json).toMatchObject({ error: { code: "IMMUTABLE", message: expect.stringContaining("conserva") } });
    expect((await http(port, "/monster-templates/personal", bCookie, "DELETE", {}, { "if-match": "1" })).status).toBe(409);
    expect((await http(port, `/libraries/monsters/${monster.id}`, aCookie, "PUT", { entry: { name: "Editado", system: "S", contentMarkdown: "# M", templateId: builtInMonsterTemplates[0].id }, bindings: { root: { scope: "catalog", systemId: "dnd-55e", version: 1, templateId: builtInMonsterTemplates[0].id }, monsters: {} } }, { "if-match": "1" })).status).toBe(200);
    expect((await http(port, "/libraries/npcs?text=" + encodeURIComponent("ñ %_\\"), aCookie)).json.total).toBe(1);
    expect((await http(port, "/libraries/npcs?text=" + encodeURIComponent("%%"), aCookie)).json.total).toBe(0);
    expect((await http(port, "/libraries/npcs", bCookie)).json.total).toBe(0);
    for (const cookie of [bCookie, adminCookie, "legacy=dm", ""]) {
      const status = cookie === bCookie ? 404 : cookie === adminCookie ? 403 : 401;
      for (const path of [`/scenes/${scene.id}`, `/scenes/${scene.id}/export`, `/scenes/${scene.id}/links/candidates`, `/assets/${asset.id}`, `/libraries/npcs/${npc.id}`, `/libraries/monsters/${monster.id}`, `/libraries/player-characters/${character.id}`]) expect((await http(port, path, cookie)).status).toBe(status);
      expect((await http(port, `/assets/${asset.id}`, cookie, "HEAD")).status).toBe(status);
      expect((await http(port, `/scenes/${scene.id}`, cookie, "PUT", { name: "Robo", scene: createDefaultScene() }, { "if-match": "1" })).status).toBe(status);
      expect((await http(port, `/scenes/${scene.id}`, cookie, "DELETE", {}, { "if-match": "1" })).status).toBe(status);
      const resolve = await http(port, "/assets/resolve", cookie, "POST", { references: [asset.reference] });
      if (cookie === bCookie) expect(resolve.json).toMatchObject({ assets: [{ url: null }] }); else expect(resolve.status).toBe(status);
    }
    const foreignImport = await http(port, "/scenes/import", bCookie, "POST", { name: "Solo documento", scene: { ...scene.scene, map: { ...scene.scene.map, imagePath: asset.reference } } }); expect(foreignImport.status).toBe(201);
    expect((await http(port, `/assets/${asset.id}`, bCookie)).status).toBe(404);
    expect((await http(port, `/scenes/${scene.id}`, aCookie, "PUT", { name: "X", scene: scene.scene })).status).toBe(422);
  });
  it("dos conexiones con misma revisión, idempotencia concurrente y rollback tras await", async () => {
    const config = await fixture(kind), { identity, aCookie, a } = await accounts(config), other = await open(config), op = randomUUID();
    const results = await Promise.all([identity, other].map(service => service.authorized(aCookie, "dm", async (_, tx) => tx.operation(op, "create-game", { name: "Una" }, () => tx.games.create(a.id, "Una", GENERIC_SYSTEM)))));
    expect(results[0]).toEqual(results[1]); const game = results[0];
    const writes = await Promise.allSettled([identity, other].map((service, i) => service.authorized(aCookie, "dm", (_, tx) => tx.games.update(a.id, game.id, { name: String(i) }, 1))));
    expect(writes.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(writes.find(r => r.status === "rejected")).toMatchObject({ reason: { code: "REVISION_CONFLICT" } });
    let expired!: OwnedTransaction; const rollbackAsset = randomUUID();
    await expect(identity.authorized(aCookie, "dm", async (_, tx) => { expired = tx; await tx.assets.create(rollbackAsset, "image/png", png); await Promise.resolve(); throw new Error("late"); })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(await identity.authorized(aCookie, "dm", (_, tx) => tx.assets.get(rollbackAsset))).toBeNull();
    await expect(expired.assets.has(randomUUID())).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await identity.authorized(aCookie, "dm", async (p, tx) => { const g = await tx.games.find(p.account.id, game.id); await tx.openings.start(game.id, g!.revision); });
    await expect(identity.authorized(aCookie, "dm", (_, tx) => ownedGames(a.id, tx).update(game.id, { state: "archived" }, 1))).rejects.toMatchObject({ code: "REVISION_CONFLICT" });
    expect(await identity.authorized(aCookie, "dm", async (_, tx) => (await tx.openings.current(game.id))?.state)).toBe("open");
  });
  it("enlaces de tres escenas son atómicos y exigen revisiones de todos los extremos", async () => {
    const { identity, aCookie, bCookie } = await accounts(await fixture(kind));
    const records = await identity.authorized(aCookie, "dm", async (_, tx) => { const service = new OwnedSceneService(tx, Date.now); return Promise.all(["A", "B", "C"].map(name => service.save(name, marked()))); });
    const [a, b, c] = records, path = (id: string) => `scene:${id}`;
    await identity.authorized(aCookie, "dm", async (_, tx) => new OwnedSceneLinksService(new OwnedSceneService(tx, Date.now), { [a.id]: 1, [b.id]: 1 }).connect({ sourceScenePath: path(a.id), sourceMarkerId: "gate", targetScenePath: path(b.id), targetMarkerId: "gate" }));
    await expect(identity.authorized(aCookie, "dm", async (_, tx) => new OwnedSceneLinksService(new OwnedSceneService(tx, Date.now), { [a.id]: 2, [b.id]: 2, [c.id]: 99 }).connect({ sourceScenePath: path(a.id), sourceMarkerId: "gate", targetScenePath: path(c.id), targetMarkerId: "gate" }))).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await identity.authorized(aCookie, "dm", async (_, tx) => (await tx.resources.get("scenes", b.id))?.revision)).toBe(2);
    await identity.authorized(aCookie, "dm", async (_, tx) => new OwnedSceneLinksService(new OwnedSceneService(tx, Date.now), { [a.id]: 2, [b.id]: 2, [c.id]: 1 }).connect({ sourceScenePath: path(a.id), sourceMarkerId: "gate", targetScenePath: path(c.id), targetMarkerId: "gate" }));
    await expect(identity.authorized(bCookie, "dm", async (_, tx) => new OwnedSceneLinksService(new OwnedSceneService(tx, Date.now), { [a.id]: 3, [b.id]: 3 }).connect({ sourceScenePath: path(a.id), sourceMarkerId: "gate", targetScenePath: path(b.id), targetMarkerId: "gate" }))).rejects.toMatchObject({ status: 404 });
    const revisions = await identity.authorized(aCookie, "dm", async (_, tx) => Promise.all(records.map(r => tx.resources.get("scenes", r.id)))); expect(revisions.map(r => r?.revision)).toEqual([3, 3, 2]);
  });
  it("lease con reloj inyectado, patrocinador renovado, generaciones y runtime separado", async () => {
    const config = await fixture(kind), { identity, aCookie, bCookie, a } = await accounts(config), principal = await identity.session(aCookie);
    const secondPrincipal = { ...principal, sessionId: "otra-sesion-verificada" }; let clock = Date.now();
    const unit = await identityDatabase(config); cleanup.push(() => unit.close());
    const execute = <T>(work: (tx: OwnedTransaction) => Promise<T>, p = principal) => unit.transaction((c, effects) => work(ownedRepositories(action => action(c), p, { now: () => new Date(clock), id: randomUUID }, effects)));
    const [g1, g2] = await identity.authorized(aCookie, "dm", (_, tx) => Promise.all([tx.games.create(a.id, "1", GENERIC_SYSTEM), tx.games.create(a.id, "2", GENERIC_SYSTEM)]));
    const first = await execute(tx => tx.openings.start(g1.id, 1)); clock += 40000;
    const renewed = await execute(tx => tx.openings.renew(g1.id, first.id, first.generation), secondPrincipal); expect(renewed.revision).toBe(1); expect(renewed.hostSessionId).toBe(secondPrincipal.sessionId);
    clock += 150000; await expect(execute(tx => tx.openings.renew(g1.id, first.id, 1))).rejects.toMatchObject({ code: "CONFLICT" });
    const next = await execute(tx => tx.openings.start(g1.id, 1)); expect(next.generation).toBe(2); await execute(tx => tx.openings.start(g2.id, 1));
    await expect(execute(tx => tx.openings.renew(g1.id, first.id, 1))).rejects.toMatchObject({ code: "CONFLICT" });
    const registry = new GameRuntimeRegistry(() => clock, randomUUID), imageId = randomUUID();
    const scene = createDefaultScene(); const imageScene = syncRuntimeFieldsFromActiveMap({ ...scene, maps: [ { ...scene.maps[0], map: { ...scene.maps[0].map, imagePath: `asset:${imageId}` } }, createDefaultSceneMap({ id: "map-2" })] });
    const snapshot = { scene: imageScene, camera: { center: { x: 0, y: 0 }, zoom: 1 }, mapImageUrl: null, tokenImageUrls: {}, showDmFogOverlay: false };
    await execute(tx => tx.assets.create(imageId, "image/png", png));
    const contexts = await execute(async tx => Promise.all([registry.context(tx, a.id, g1.id), registry.context(tx, a.id, g2.id)]));
    await execute(tx => registry.publish(tx, contexts[0], snapshot)); expect(registry.allows(contexts[0], `asset:${imageId}`)).toBe(true); expect(registry.allows(contexts[1], `asset:${imageId}`)).toBe(false);
    await execute(tx => registry.publish(tx, contexts[1], snapshot)); await execute(tx => registry.publish(tx, contexts[1], null)); expect(registry.allows(contexts[0], `asset:${imageId}`)).toBe(true);
    expect(registry.state(contexts[0])?.epoch).not.toBe(registry.state(contexts[1])?.epoch);
    await expect(identity.authorized(bCookie, "dm", async (p, tx) => registry.context(tx, p.account.id, g1.id))).rejects.toMatchObject({ code: "NOT_FOUND" });
    await execute(tx => tx.openings.close(g1.id, next.id, next.generation, 1)); await expect(execute(tx => tx.openings.renew(g1.id, next.id, next.generation))).rejects.toMatchObject({ code: "CONFLICT" });
    registry.clear();
  });
  it("principal revocado mientras espera cuerpo no escribe ni recupera deduplicación", async () => {
    const { identity, aCookie, adminCookie, a } = await accounts(await fixture(kind)), port = await listen(identity), operationId = randomUUID();
    const saved = await http(port, "/games", aCookie, "POST", { name: "Primera", systemRef: GENERIC_SYSTEM }, { "idempotency-key": operationId }); expect(saved.status).toBe(201);
    let finish!: () => void;
    const pending = new Promise<number>((resolve, reject) => {
      const req = request({ host: "127.0.0.1", port, path: "/api/v1/dm/games", method: "POST", headers: { host: "localhost:8787", origin, cookie: aCookie, "content-type": "application/json", "idempotency-key": randomUUID() } }, res => { res.resume(); res.on("end", () => resolve(res.statusCode!)); }); req.on("error", reject); req.write('{"name":'); finish = () => req.end('"Tardía"}');
    });
    await identity.administer(adminCookie, a.id, "revoke-sessions"); finish(); expect(await pending).toBe(401);
    expect((await http(port, "/games", aCookie, "POST", { name: "Primera", systemRef: GENERIC_SYSTEM }, { "idempotency-key": operationId })).status).toBe(401);
  });
  it("lectura de corrupción falla cerrado; constraints impiden apertura con otro propietario", async () => {
    const config = await fixture(kind), { identity, aCookie, a, b } = await accounts(config);
    const scene = await identity.authorized(aCookie, "dm", async (_, tx) => new OwnedSceneService(tx, Date.now).save("Válida", createDefaultScene()));
    const game = await identity.authorized(aCookie, "dm", (_, tx) => tx.games.create(a.id, "Juego", GENERIC_SYSTEM)); await identity.close();
    await raw(config, c => c.query("UPDATE owned_resources SET body='{}' WHERE id=$1", [scene.id])); const reopened = await open(config);
    await expect(reopened.authorized(aCookie, "dm", (_, tx) => tx.resources.get("scenes", scene.id))).rejects.toMatchObject({ code: "CORRUPT" }); await reopened.close();
    await expect(raw(config, c => c.query("INSERT INTO game_openings(id,game_id,generation,state,host_account_id,host_session_id,created_at,last_heartbeat_at,lease_expires_at,revision) VALUES($1,$2,1,'open',$3,'session',$4,$5,$6,1)", [randomUUID(), game.id, b.id, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]))).rejects.toBeTruthy();
  });
});
