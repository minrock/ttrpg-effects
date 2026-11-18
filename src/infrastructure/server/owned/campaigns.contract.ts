import { afterEach, describe, expect, it } from "vitest";
import { DND_SYSTEM, GENERIC_SYSTEM } from "../../../domain/systems/system-catalog";
import { DND_55E_MONSTER_TEMPLATE_ID } from "../../../domain/monster-templates/monster-template";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { migrateCatalog } from "../database";
import { createDriver } from "../database/driver";
import { applyMigrations, migrations } from "../database/migrations";
import { randomUUID } from "node:crypto";
import { accounts, cleanup, fixture, http, listen, raw } from "./fixtures";

afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });

for (const kind of ["sqlite", "postgres"] as const) describe(`Campañas HTTP ${kind}`, () => {
  it("crea la jerarquía privada, exige cierre para inactivar y conserva la reactivación explícita", async () => {
    const { identity, aCookie, bCookie } = await accounts(await fixture(kind));
    const port = await listen(identity);
    const created = await http(port, "/campaigns", aCookie, "POST", { name: "Campaña Ñ", description: "Una campaña", coverAssetId: null, systemRef: GENERIC_SYSTEM });
    expect(created.status, JSON.stringify(created.json)).toBe(201);
    const campaign = created.json.campaign as { id: string; revision: number; state: string };
    expect(campaign).toMatchObject({ state: "active", revision: 1 });
    expect(created.headers.location).toBe(`/api/v1/dm/campaigns/${campaign.id}`);
    const listed = await http(port, "/campaigns", aCookie);
    expect(listed.json, JSON.stringify(listed.json)).toMatchObject({ ok: true, total: 1, items: [expect.objectContaining({ id: campaign.id })] });
    expect((await http(port, `/campaigns/${campaign.id}`, bCookie)).status).toBe(404);

    const arcs = await http(port, `/campaigns/${campaign.id}/arcs`, aCookie);
    expect(arcs.status).toBe(200);
    const initial = (arcs.json.items as Array<{ id: string; name: string }>)[0];
    expect(initial.name).toBe("Arco inicial");

    const opening = await identity.authorized(aCookie, "dm", (_, tx) => tx.openings.start(campaign.id, 1));
    const blocked = await http(port, `/campaigns/${campaign.id}`, aCookie, "PATCH", { state: "inactive" }, { "if-match": "1" });
    expect(blocked.json).toMatchObject({ error: { code: "CAMPAIGN_OPEN" } });
    expect(await identity.authorized(aCookie, "dm", async (_, tx) => (await tx.openings.current(campaign.id))?.state)).toBe("open");
    await identity.authorized(aCookie, "dm", (_, tx) => tx.openings.close(campaign.id, opening.id, opening.generation, opening.revision));
    const inactive = await http(port, `/campaigns/${campaign.id}`, aCookie, "PATCH", { state: "inactive" }, { "if-match": "1" });
    expect(inactive.status).toBe(200);
    expect(inactive.json).toMatchObject({ campaign: { state: "inactive", revision: 2 } });
    expect((await http(port, `/campaigns/${campaign.id}`, aCookie, "PATCH", { name: "No permitido" }, { "if-match": "2" })).json).toMatchObject({ error: { code: "CAMPAIGN_INACTIVE" } });
    expect((await http(port, `/campaigns/${campaign.id}`, aCookie, "PATCH", { state: "active", name: "No permitido" }, { "if-match": "2" })).status).toBe(422);
    expect((await http(port, `/campaigns/${campaign.id}/arcs`, aCookie, "POST", { name: "Tampoco" })).json).toMatchObject({ error: { code: "CAMPAIGN_INACTIVE" } });
    for (const kind of ["scenes", "monsters", "npcs", "player-characters"] as const) expect((await http(port, `/games/${campaign.id}/resources`, aCookie, "POST", { kind, resourceId: randomUUID() })).json).toMatchObject({ error: { code: "CAMPAIGN_INACTIVE" } });

    const active = await http(port, `/campaigns/${campaign.id}`, aCookie, "PATCH", { state: "active" }, { "if-match": "2" });
    expect(active.status).toBe(200);
    expect(active.json).toMatchObject({ campaign: { state: "active", revision: 3 } });
    const added = await http(port, `/campaigns/${campaign.id}/arcs`, aCookie, "POST", { name: "Segundo arco", description: "" });
    expect(added.status).toBe(201);
    expect((await http(port, `/games/${campaign.id}`, aCookie, "DELETE", {}, { "if-match": "3" })).status).toBe(200);
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${initial.id}`, aCookie)).status).toBe(404);
    for (const suffix of ["", "?text=sin-coincidencias", "?offset=100"]) expect((await http(port, `/campaigns/${campaign.id}/arcs/${initial.id}/scenes${suffix}`, aCookie)).status).toBe(404);
  });

  it("requiere destino de campaña y rechaza bindings incompatibles", async () => {
    const { identity, aCookie } = await accounts(await fixture(kind));
    const port = await listen(identity);
    const campaign = (await http(port, "/campaigns", aCookie, "POST", { name: "Genérica", systemRef: GENERIC_SYSTEM })).json.campaign as { id: string };
    const arc = ((await http(port, `/campaigns/${campaign.id}/arcs`, aCookie)).json.items as Array<{ id: string }>)[0];
    const scene = { ...createDefaultScene(), sceneAside: { monsters: [{ id: "guardian", name: "Guardia", imagePath: null, visibleToPlayer: false, notes: "", templateId: DND_55E_MONSTER_TEMPLATE_ID }], npcs: [], notes: [] } };
    const bindings = { monsters: { guardian: { scope: "catalog" as const, ...DND_SYSTEM, templateId: DND_55E_MONSTER_TEMPLATE_ID } } };
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/scenes`, aCookie, "POST", { name: "No compatible", scene, bindings })).json).toMatchObject({ error: { code: "INCOMPATIBLE" } });
    expect((await http(port, "/scenes", aCookie, "POST", { name: "Sin destino", scene: createDefaultScene() })).status).toBe(422);
    expect((await http(port, "/scenes", aCookie, "POST", { name: "D&D", scene, bindings, campaignId: campaign.id, arcId: arc.id })).json).toMatchObject({ error: { code: "INCOMPATIBLE" } });
  });

  it("normaliza documentos v1 al crear una escena contextual", async () => {
    const { identity, aCookie } = await accounts(await fixture(kind)), port = await listen(identity);
    const campaign = (await http(port, "/campaigns", aCookie, "POST", { name: "Legado", systemRef: GENERIC_SYSTEM })).json.campaign as { id: string };
    const arc = ((await http(port, `/campaigns/${campaign.id}/arcs`, aCookie)).json.items as Array<{ id: string }>)[0];
    const created = await http(port, "/scenes", aCookie, "POST", { name: "v1", scene: { ...createDefaultScene(), version: 1 }, campaignId: campaign.id, arcId: arc.id });
    expect(created.status).toBe(201);
    expect((created.json.resource as { scene: { version: number } }).scene.version).toBe(2);
  });

  it("conserva una única pertenencia y no deja adjuntar una escena existente", async () => {
    const { identity, aCookie } = await accounts(await fixture(kind));
    const port = await listen(identity);
    const create = async (name: string) => http(port, "/campaigns", aCookie, "POST", { name, systemRef: GENERIC_SYSTEM });
    const first = (await create("Primera")).json.campaign as { id: string; revision: number };
    const second = (await create("Segunda")).json.campaign as { id: string; revision: number };
    const firstArc = (await http(port, `/campaigns/${first.id}/arcs`, aCookie)).json.items as Array<{ id: string }>;
    const secondArc = (await http(port, `/campaigns/${second.id}/arcs`, aCookie)).json.items as Array<{ id: string }>;
    const created = await http(port, `/campaigns/${first.id}/arcs/${firstArc[0].id}/scenes`, aCookie, "POST", { name: "Escena común", scene: createDefaultScene(), bindings: { monsters: {} } });
    expect(created.status).toBe(201);
    const scene = created.json.scene as { sceneId: string; revision: number; coverRevision: number };
    expect((await http(port, `/campaigns/${second.id}/arcs/${secondArc[0].id}/scenes/${scene.sceneId}`, aCookie, "POST", {})).status).toBe(409);
    expect((await http(port, `/campaigns/${second.id}`, aCookie, "PATCH", { state: "inactive" }, { "if-match": "1" })).status).toBe(200);

    const write = await http(port, `/scenes/${scene.sceneId}`, aCookie, "PUT", { name: "Cambio permitido", scene: createDefaultScene() }, { "if-match": String(scene.revision) });
    expect(write.status).toBe(200);
    const cover = await http(port, `/campaigns/${first.id}/arcs/${firstArc[0].id}/scenes/${scene.sceneId}/cover`, aCookie, "PATCH", { customCoverAssetId: null }, { "if-match": String(scene.coverRevision) });
    expect(cover.status).toBe(200);
    expect((await http(port, `/campaigns/${second.id}`, aCookie, "PATCH", { state: "active" }, { "if-match": "2" })).status).toBe(200);
  });
});

for (const kind of ["sqlite", "postgres"] as const) describe(`Migración campañas ${kind}`, () => {
  it("aborta la migración 12 si arco y enlace de campaña discrepan", async () => {
    const config = await fixture(kind, 11), owner = randomUUID(), first = randomUUID(), second = randomUUID(), arc = randomUUID(), scene = randomUUID(), at = "2026-11-17T00:00:00.000Z";
    await raw(config, async c => {
      await c.query('INSERT INTO identity_user(id,name,email,"emailVerified","createdAt","updatedAt",role,enabled,"mustChangePassword","authVersion") VALUES($1,$2,$3,FALSE,$4,$5,\'dm\',TRUE,FALSE,0)', [owner, "Histórico", `mismatch-${owner}@test`, at, at]);
      for (const [id, name] of [[first, "Primera"], [second, "Segunda"]] as const) {
        await c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at,revision,deleted_at,system_id,system_version) VALUES($1,$2,$3,'ready',$4,$5,1,NULL,'generic',1)", [id, owner, name, at, at]);
        await c.query("INSERT INTO campaign_details(owner_id,game_id,description,cover_asset_id) VALUES($1,$2,'',NULL)", [owner, id]);
      }
      const body = JSON.stringify({ id: scene, name: "Escena", createdAt: at, updatedAt: at, warnings: [], scene: createDefaultScene() });
      await c.query("INSERT INTO owned_resources(owner_id,kind,id,name,search_text,sort_id,created_at,updated_at,revision,body,bindings) VALUES($1,'scenes',$2,'Escena','escena',$3,$4,$5,1,$6,$7)", [owner, scene, Buffer.from(scene).toString("hex"), at, at, body, JSON.stringify({ monsters: {} })]);
      await c.query("INSERT INTO campaign_arcs(owner_id,id,campaign_id,name,description,cover_asset_id,revision,created_at,updated_at,initial_game_id) VALUES($1,$2,$3,'Arco','',NULL,1,$4,$5,$3)", [owner, arc, first, at, at]);
      await c.query("INSERT INTO arc_scenes(owner_id,arc_id,kind,scene_id) VALUES($1,$2,'scenes',$3)", [owner, arc, scene]);
      await c.query("INSERT INTO game_resources(owner_id,game_id,kind,resource_id) VALUES($1,$2,'scenes',$3)", [owner, second, scene]);
    });
    await expect(migrateCatalog(config)).rejects.toMatchObject({ code: "SCHEMA_INCOMPATIBLE" });
    await raw(config, async c => {
      expect((await c.query("SELECT version FROM ttrpg_control_migrations WHERE version=12")).rows).toEqual([]);
      expect(Number((await c.query("SELECT COUNT(*) AS total FROM arc_scenes WHERE owner_id=$1 AND scene_id=$2", [owner, scene])).rows[0].total)).toBe(1);
      expect(Number((await c.query("SELECT COUNT(*) AS total FROM game_resources WHERE owner_id=$1 AND kind='scenes' AND resource_id=$2", [owner, scene])).rows[0].total)).toBe(1);
    });
  });

  it("migra v8 aditivamente, conserva resource/draft/bindings y es reejecutable", async () => {
    const config = await fixture(kind, 8), owner = randomUUID(), game = randomUUID(), scene = randomUUID(), draft = randomUUID(), at = "2026-11-13T00:00:00.000Z";
    const bindings = JSON.stringify({ monsters: {} }), body = JSON.stringify({ id: scene, name: "Escena", createdAt: at, updatedAt: at, scene: createDefaultScene(), warnings: [] }), draftBody = JSON.stringify({ sequence: 1, scene: "retained" });
    await raw(config, async c => {
      await c.query('INSERT INTO identity_user(id,name,email,"emailVerified","createdAt","updatedAt",role,enabled,"mustChangePassword","authVersion") VALUES($1,$2,$3,FALSE,$4,$5,\'dm\',TRUE,FALSE,0)', [owner, "Histórico", `historical-${owner}@test`, at, at]);
      await c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at,revision,deleted_at,system_id,system_version) VALUES($1,$2,'Legado','ready',$3,$4,1,NULL,'generic',1)", [game, owner, at, at]);
      await c.query("INSERT INTO owned_resources(owner_id,kind,id,name,search_text,sort_id,created_at,updated_at,revision,body,bindings) VALUES($1,'scenes',$2,'Escena',$3,$4,$5,$6,1,$7,$8)", [owner, scene, "escena", Buffer.from(scene).toString("hex"), at, at, body, bindings]);
      await c.query("INSERT INTO game_resources(owner_id,game_id,kind,resource_id) VALUES($1,$2,'scenes',$3)", [owner, game, scene]);
      await c.query("INSERT INTO owned_drafts(owner_id,id,game_id,context,revision,sequence,hash,updated_at,confirmed_sequence,receipt_key,receipt_hash,receipt_result) VALUES($1,$2,$3,'scene',1,1,'hash',$4,0,NULL,NULL,NULL)", [owner, draft, game, at]);
      await c.query("INSERT INTO owned_draft_versions(owner_id,draft_id,revision,sequence,body,bytes,updated_at) VALUES($1,$2,1,1,$3,$4,$5)", [owner, draft, draftBody, Buffer.byteLength(draftBody), at]);
    });
    const driver = createDriver(config), failing = [...migrations.slice(0, 8), { ...migrations[8], statements: [...migrations[8].statements, "SELECT missing_campaign_migration_fixture"] }];
    try { await expect(applyMigrations(driver, failing)).rejects.toBeTruthy(); } finally { await driver.close(); }
    await raw(config, async c => expect((await c.query("SELECT version FROM ttrpg_control_migrations ORDER BY version")).rows).toHaveLength(8));
    expect(await migrateCatalog(config)).toEqual([9, 10, 11, 12]);
    expect(await migrateCatalog(config)).toEqual([]);
    await raw(config, async c => {
      expect(Number((await c.query("SELECT COUNT(*) AS total FROM campaign_details WHERE owner_id=$1 AND game_id=$2", [owner, game])).rows[0].total)).toBe(1);
      const arc = (await c.query("SELECT id,initial_game_id FROM campaign_arcs WHERE owner_id=$1 AND campaign_id=$2", [owner, game])).rows;
      expect(arc).toHaveLength(1); expect(arc[0].initial_game_id).toBe(game);
      expect((await c.query("SELECT scene_id FROM arc_scenes WHERE owner_id=$1 AND arc_id=$2", [owner, String(arc[0].id)])).rows).toEqual([{ scene_id: scene }]);
      expect((await c.query("SELECT body,bindings FROM owned_resources WHERE owner_id=$1 AND kind='scenes' AND id=$2", [owner, scene])).rows[0]).toEqual({ body, bindings });
      expect((await c.query("SELECT body FROM owned_draft_versions WHERE owner_id=$1 AND draft_id=$2", [owner, draft])).rows[0].body).toBe(draftBody);
    });
  });
});
