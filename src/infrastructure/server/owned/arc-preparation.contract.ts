import { afterEach, describe, expect, it } from "vitest";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { DND_SYSTEM, GENERIC_SYSTEM, systemSeeds } from "../../../domain/systems/system-catalog";
import { migrateCatalog } from "../database";
import { randomUUID } from "node:crypto";
import { raw } from "./fixtures";
import { accounts, cleanup, fixture, http, listen, open } from "./fixtures";

afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) describe(`Preparación de arco ${kind}`, () => {
  it("prepara, reserva una vez y conserva el snapshot de NPC", async () => {
    const config = await fixture(kind), { identity, aCookie } = await accounts(config), port = await listen(identity);
    const campaignReply = await http(port, "/campaigns", aCookie, "POST", { name: "Campaña", systemRef: GENERIC_SYSTEM, description: "", coverAssetId: null });
    const campaign = campaignReply.json.campaign as { id: string };
    const arc = (await http(port, `/campaigns/${campaign.id}/arcs`, aCookie)).json.items as Array<{ id: string }>;
    const sceneReply = await http(port, "/scenes", aCookie, "POST", { name: "Escena", scene: createDefaultScene(), campaignId: campaign.id, arcId: arc[0].id });
    const scene = sceneReply.json.resource as { id: string };
    const created = await http(port, `/campaigns/${campaign.id}/arcs/${arc[0].id}/preparation`, aCookie, "POST", { kind: "npc", name: "Guía", imagePath: null, notes: "# guía" });
    expect(created.status).toBe(201); const prepared = created.json.prepared as { id: string; revision: number };
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc[0].id}/preparation`, aCookie)).json).toMatchObject({ total: 1, items: [expect.objectContaining({ id: prepared.id, kind: "npc" })] });
    const first = await http(port, `/campaigns/${campaign.id}/arcs/${arc[0].id}/preparation/${prepared.id}/instance`, aCookie, "POST", { sceneId: scene.id });
    const second = await http(port, `/campaigns/${campaign.id}/arcs/${arc[0].id}/preparation/${prepared.id}/instance`, aCookie, "POST", { sceneId: scene.id });
    expect(first.json).toMatchObject({ ok: true, reservation: { sceneId: scene.id, preparedId: prepared.id, snapshot: { kind: "npc", notes: "# guía" } } });
    expect(second.json).toEqual(first.json);
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc[0].id}/preparation/${prepared.id}`, aCookie, "PATCH", { kind: "npc", notes: "nuevo" }, { "if-match": String(prepared.revision) })).status).toBe(200);
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc[0].id}/preparation/${prepared.id}/instance`, aCookie, "POST", { sceneId: scene.id })).json).toEqual(first.json);
  });

  it("filtra antes de paginar y borra lógicamente sin perder una reserva", async () => {
    const config = await fixture(kind), { identity, a, aCookie } = await accounts(config), port = await listen(identity);
    const campaign = (await http(port, "/campaigns", aCookie, "POST", { name: "Catálogo", systemRef: GENERIC_SYSTEM, description: "", coverAssetId: null })).json.campaign as { id: string };
    const arc = ((await http(port, `/campaigns/${campaign.id}/arcs`, aCookie)).json.items as Array<{ id: string }>)[0];
    const scene = (await http(port, "/scenes", aCookie, "POST", { name: "Escena", scene: createDefaultScene(), campaignId: campaign.id, arcId: arc.id })).json.resource as { id: string };
    const npc = (await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation`, aCookie, "POST", { kind: "npc", name: "NPC", imagePath: null, notes: "" })).json.prepared as { id: string; revision: number };
    const monster = (await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation`, aCookie, "POST", { kind: "monster", name: "Monstruo", imagePath: null, notes: "", templateId: "generic-markdown", binding: { scope: "catalog", ...GENERIC_SYSTEM, templateId: "generic-markdown" } })).json.prepared as { id: string };
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation?kind=npc&limit=1&offset=0`, aCookie)).json).toMatchObject({ total: 1, items: [{ id: npc.id, kind: "npc" }] });
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation?kind=invalid`, aCookie)).status).toBe(422);
    const reservation = await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation/${npc.id}/instance`, aCookie, "POST", { sceneId: scene.id });
    expect(reservation.status).toBe(200);
    const path = `/campaigns/${campaign.id}/arcs/${arc.id}/preparation/${npc.id}`;
    expect((await http(port, path, aCookie, "DELETE", {})).status).toBe(422);
    const key = randomUUID();
    expect((await http(port, path, aCookie, "DELETE", {}, { "if-match": String(npc.revision), "idempotency-key": key })).json).toEqual({ ok: true });
    expect((await http(port, path, aCookie, "DELETE", {}, { "if-match": String(npc.revision), "idempotency-key": key })).json).toEqual({ ok: true });
    expect((await http(port, path, aCookie, "DELETE", {}, { "if-match": String(npc.revision), "idempotency-key": randomUUID() })).json).toMatchObject({ error: { code: "NOT_FOUND" } });
    for (const request of [
      http(port, path, aCookie),
      http(port, path, aCookie, "PATCH", { kind: "npc", notes: "no" }, { "if-match": String(npc.revision + 1) }),
      http(port, `${path}/instance`, aCookie, "POST", { sceneId: scene.id })
    ]) expect((await request).status).toBe(404);
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation`, aCookie)).json).toMatchObject({ total: 1, items: [{ id: monster.id, kind: "monster" }] });
    await identity.close();
    await raw(config, async c => {
      const row = (await c.query("SELECT deleted_at,revision FROM arc_preparations WHERE owner_id=$1 AND id=$2", [a.id, npc.id])).rows[0];
      expect(row).toMatchObject({ revision: 2 });
      expect(row.deleted_at).toBeTruthy();
      expect((await c.query("SELECT prepared_id FROM scene_preparation_instances WHERE prepared_id=$1", [npc.id])).rows).toHaveLength(1);
    });
  });
  it("rechaza sin pérdida el historial M:N antes de imponer escenas propias", async () => {
    const config = await fixture(kind, 9), owner = randomUUID(), sceneId = randomUUID(), first = randomUUID(), second = randomUUID(), at = "2026-11-13T00:00:00.000Z";
    const npcId = "historico", scene = createDefaultScene();
    const body = JSON.stringify({ id: sceneId, name: "Compartida", createdAt: at, updatedAt: at, warnings: [], scene: { ...scene, sceneAside: { ...scene.sceneAside, npcs: [{ id: npcId, name: "Alias", imagePath: null, notes: "retenida", visibleToPlayer: false }] } } });
    await raw(config, async c => {
      await c.query(`INSERT INTO identity_user(id,name,email,"emailVerified","createdAt","updatedAt",role,enabled,"mustChangePassword","authVersion") VALUES($1,$2,$3,FALSE,$4,$5,'dm',TRUE,FALSE,0)`, [owner,"DM",`${owner}@test`,at,at]);
      await c.query("INSERT INTO owned_resources(owner_id,kind,id,name,search_text,sort_id,created_at,updated_at,revision,body,bindings) VALUES($1,'scenes',$2,'Compartida','compartida',$3,$4,$5,1,$6,$7)",[owner,sceneId,Buffer.from(sceneId).toString('hex'),at,at,body,JSON.stringify({monsters:{}})]);
      for (const game of [first,second]) { await c.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at,revision,deleted_at,system_id,system_version) VALUES($1,$2,$3,'ready',$4,$5,1,NULL,'generic',1)",[game,owner,game,at,at]); await c.query("INSERT INTO campaign_details(owner_id,game_id,description,cover_asset_id) VALUES($1,$2,'',NULL)",[owner,game]); const arc=randomUUID(); await c.query("INSERT INTO campaign_arcs(owner_id,id,campaign_id,name,description,cover_asset_id,revision,created_at,updated_at,initial_game_id) VALUES($1,$2,$3,'Inicial','',NULL,1,$4,$5,$3)",[owner,arc,game,at,at]); await c.query("INSERT INTO arc_scenes(owner_id,arc_id,kind,scene_id) VALUES($1,$2,'scenes',$3)",[owner,arc,sceneId]); }

    });
    await expect(migrateCatalog(config)).rejects.toMatchObject({ code: "SCHEMA_INCOMPATIBLE" });
    await raw(config, async c => {
      expect(Number((await c.query("SELECT COUNT(*) AS total FROM arc_scenes WHERE owner_id=$1 AND scene_id=$2", [owner, sceneId])).rows[0].total)).toBe(2);
      expect((await c.query("SELECT version FROM ttrpg_control_migrations WHERE version=12")).rows).toEqual([]);
    });
  });

  it("reserva dos preparados concurrentes sin colisionar", async () => {
    const { identity, aCookie } = await accounts(await fixture(kind)), port = await listen(identity);
    const campaign=(await http(port,"/campaigns",aCookie,"POST",{name:"C",systemRef:GENERIC_SYSTEM,description:"",coverAssetId:null})).json.campaign as {id:string};
    const arc=((await http(port,`/campaigns/${campaign.id}/arcs`,aCookie)).json.items as Array<{id:string}>)[0];
    const scene=(await http(port,"/scenes",aCookie,"POST",{name:"S",scene:createDefaultScene(),campaignId:campaign.id,arcId:arc.id})).json.resource as {id:string};
    const create=async(name:string)=>(await http(port,`/campaigns/${campaign.id}/arcs/${arc.id}/preparation`,aCookie,"POST",{kind:"npc",name,imagePath:null,notes:""})).json.prepared as {id:string};
    const [a,b]=await Promise.all([create("A"),create("B")]);
    const reserve=(id:string)=>http(port,`/campaigns/${campaign.id}/arcs/${arc.id}/preparation/${id}/instance`,aCookie,"POST",{sceneId:scene.id});
    const [ra,rb]=await Promise.all([reserve(a.id),reserve(b.id)]); const ida=(ra.json.reservation as {entityId:string}).entityId, idb=(rb.json.reservation as {entityId:string}).entityId;
    expect(ida).not.toBe(idb); expect((await reserve(a.id)).json).toEqual(ra.json);
  });

  it("conserva el binding permitido al deshabilitar plantilla o sistema y retiene el snapshot", async () => {
    const { identity, adminCookie, aCookie } = await accounts(await fixture(kind)), port = await listen(identity);
    const campaign = (await http(port, "/campaigns", aCookie, "POST", { name: "D&D", systemRef: DND_SYSTEM, description: "", coverAssetId: null })).json.campaign as { id: string };
    const arc = ((await http(port, `/campaigns/${campaign.id}/arcs`, aCookie)).json.items as Array<{ id: string }>)[0];
    const scene = (await http(port, "/scenes", aCookie, "POST", { name: "Escena", scene: createDefaultScene(), campaignId: campaign.id, arcId: arc.id })).json.resource as { id: string };
    const templateId = systemSeeds[1].definition.presentations[0].id;
    const binding = { scope: "catalog" as const, ...DND_SYSTEM, templateId };
    const created = await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation`, aCookie, "POST", { kind: "monster", name: "Centinela", imagePath: null, notes: "primera", templateId, binding });
    expect(created.status).toBe(201);
    const prepared = created.json.prepared as { id: string; revision: number };

    expect((await http(port, `/api/v1/admin/systems/${DND_SYSTEM.systemId}/versions/${DND_SYSTEM.version}/templates/${templateId}/availability`, adminCookie, "PATCH", { availability: "disabled" }, { "if-match": "1" })).status).toBe(200);
    const retained = await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation/${prepared.id}`, aCookie, "PATCH", { kind: "monster", name: "Centinela retenido", notes: "snapshot retenido", templateId, binding }, { "if-match": String(prepared.revision) });
    expect(retained.status).toBe(200);
    expect(retained.json).toMatchObject({ prepared: { templateId, binding } });
    const first = await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation/${prepared.id}/instance`, aCookie, "POST", { sceneId: scene.id });
    expect(first.json).toMatchObject({ reservation: { snapshot: { kind: "monster", name: "Centinela retenido", notes: "snapshot retenido", templateId, binding }, binding } });

    const system = await identity.authorized(adminCookie, "admin", (_, tx) => tx.systems.get(DND_SYSTEM));
    expect((await http(port, `/api/v1/admin/systems/${DND_SYSTEM.systemId}/versions/${DND_SYSTEM.version}/availability`, adminCookie, "PATCH", { availability: "disabled" }, { "if-match": String(system.revision) })).status).toBe(200);
    const afterSystemDisable = retained.json.prepared as { revision: number };
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation/${prepared.id}`, aCookie, "PATCH", { kind: "monster", name: "Centinela actualizado", notes: "no modifica reserva", templateId, binding }, { "if-match": String(afterSystemDisable.revision) })).status).toBe(200);
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation/${prepared.id}/instance`, aCookie, "POST", { sceneId: scene.id })).json).toEqual(first.json);
    expect((await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation`, aCookie, "POST", { kind: "monster", name: "Nuevo bloqueado", imagePath: null, notes: "", templateId, binding })).json).toMatchObject({ error: { code: "DISABLED" } });
  });

  it("retiene una preparación histórica de plantilla nula y binding privado", async () => {
    const config = await fixture(kind), { identity, a, aCookie } = await accounts(config), port = await listen(identity);
    const campaign = (await http(port, "/campaigns", aCookie, "POST", { name: "Histórica", systemRef: GENERIC_SYSTEM, description: "", coverAssetId: null })).json.campaign as { id: string };
    const arc = ((await http(port, `/campaigns/${campaign.id}/arcs`, aCookie)).json.items as Array<{ id: string }>)[0];
    const scene = (await http(port, "/scenes", aCookie, "POST", { name: "Escena", scene: createDefaultScene(), campaignId: campaign.id, arcId: arc.id })).json.resource as { id: string };
    const preparedId = randomUUID(), at = new Date().toISOString();
    const binding = { scope: "private" as const, ownerId: a.id, templateId: "plantilla-historica", version: 1 as const, hash: "a".repeat(64) };
    await identity.close();
    await raw(config, c => c.query("INSERT INTO arc_preparations(owner_id,id,arc_id,kind,name,image_path,notes,template_id,binding,source_scene_id,source_kind,source_entity_id,revision,created_at,updated_at) VALUES($1,$2,$3,'monster',$4,NULL,$5,NULL,$6,NULL,NULL,NULL,1,$7,$8)", [a.id, preparedId, arc.id, "Reliquia", "binding privado retenido", JSON.stringify(binding), at, at]));
    const resumedPort = await listen(await open(config));
    expect((await http(resumedPort, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation/${preparedId}`, aCookie)).json).toMatchObject({ prepared: { kind: "monster", templateId: null, binding } });
    expect((await http(resumedPort, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation/${preparedId}/instance`, aCookie, "POST", { sceneId: scene.id })).json).toMatchObject({ reservation: { snapshot: { kind: "monster", templateId: null, binding }, binding } });
  });

  it("aísla preparación de otro DM y prohíbe el rol admin en todas sus rutas", async () => {
    const { identity, adminCookie, aCookie, bCookie } = await accounts(await fixture(kind)), port = await listen(identity);
    const campaign = (await http(port, "/campaigns", aCookie, "POST", { name: "Privada", systemRef: GENERIC_SYSTEM, description: "", coverAssetId: null })).json.campaign as { id: string };
    const arc = ((await http(port, `/campaigns/${campaign.id}/arcs`, aCookie)).json.items as Array<{ id: string }>)[0];
    const scene = (await http(port, "/scenes", aCookie, "POST", { name: "Escena", scene: createDefaultScene(), campaignId: campaign.id, arcId: arc.id })).json.resource as { id: string };
    const prepared = (await http(port, `/campaigns/${campaign.id}/arcs/${arc.id}/preparation`, aCookie, "POST", { kind: "npc", name: "Secreto", imagePath: null, notes: "" })).json.prepared as { id: string; revision: number };
    const list = `/campaigns/${campaign.id}/arcs/${arc.id}/preparation`, item = `${list}/${prepared.id}`, reserve = `${item}/instance`;
    for (const [cookie, status] of [[bCookie, 404], [adminCookie, 403]] as const) {
      expect((await http(port, list, cookie)).status).toBe(status);
      expect((await http(port, item, cookie)).status).toBe(status);
      expect((await http(port, list, cookie, "POST", { kind: "npc", name: "Intruso", imagePath: null, notes: "" })).status).toBe(status);
      expect((await http(port, item, cookie, "PATCH", { kind: "npc", name: "Intruso" }, { "if-match": String(prepared.revision) })).status).toBe(status);
      expect((await http(port, reserve, cookie, "POST", { sceneId: scene.id })).status).toBe(status);
    }
  });

  it("mantiene preparaciones aisladas y rechaza adjuntar una escena de otro arco", async () => {
    const { identity, aCookie } = await accounts(await fixture(kind)), port = await listen(identity);
    const make=async(name:string)=>(await http(port,"/campaigns",aCookie,"POST",{name,systemRef:GENERIC_SYSTEM,description:"",coverAssetId:null})).json.campaign as {id:string;revision:number};
    const a=await make("A"), b=await make("B"); const arcA=((await http(port,`/campaigns/${a.id}/arcs`,aCookie)).json.items as Array<{id:string}>)[0], arcB=((await http(port,`/campaigns/${b.id}/arcs`,aCookie)).json.items as Array<{id:string}>)[0];
    const scene=(await http(port,"/scenes",aCookie,"POST",{name:"S",scene:createDefaultScene(),campaignId:a.id,arcId:arcA.id})).json.resource as {id:string};
    expect((await http(port,`/campaigns/${b.id}/arcs/${arcB.id}/scenes/${scene.id}`,aCookie,"POST",{})).status).toBe(409);
    const preparedInB = (await http(port, `/campaigns/${b.id}/arcs/${arcB.id}/preparation`, aCookie, "POST", { kind: "npc", name: "Solo B", imagePath: null, notes: "" })).json.prepared as { id: string; revision: number };
    const preparedInA = (await http(port, `/campaigns/${a.id}/arcs/${arcA.id}/preparation`, aCookie, "POST", { kind: "npc", name: "Solo A", imagePath: null, notes: "" })).json.prepared as { id: string };
    expect((await http(port, `/campaigns/${a.id}/arcs/${arcA.id}/preparation/${preparedInA.id}/instance`, aCookie, "POST", { sceneId: scene.id })).status).toBe(200);
    expect((await http(port, `/campaigns/${b.id}/arcs/${arcB.id}/preparation/${preparedInA.id}/instance`, aCookie, "POST", { sceneId: scene.id })).status).toBe(404);
    const opening=await identity.authorized(aCookie,"dm",(_,tx)=>tx.openings.start(b.id,b.revision)); await identity.authorized(aCookie,"dm",(_,tx)=>tx.openings.close(b.id,opening.id,opening.generation,opening.revision));
    await http(port,`/campaigns/${b.id}`,aCookie,"PATCH",{state:"inactive"},{"if-match":String(b.revision)});
    expect((await http(port,`/campaigns/${b.id}/arcs/${arcB.id}/preparation`,aCookie,"POST",{kind:"npc",name:"x",imagePath:null,notes:""})).json).toMatchObject({error:{code:"CAMPAIGN_INACTIVE"}});
    expect((await http(port, `/campaigns/${b.id}/arcs/${arcB.id}/preparation/${preparedInB.id}`, aCookie, "PATCH", { kind: "npc", notes: "bloqueado" }, { "if-match": String(preparedInB.revision) })).json).toMatchObject({ error: { code: "CAMPAIGN_INACTIVE" } });
    const p=(await http(port,`/campaigns/${a.id}/arcs/${arcA.id}/preparation`,aCookie,"POST",{kind:"npc",name:"x",imagePath:null,notes:""})).json.prepared as {id:string};
    expect((await http(port,`/campaigns/${a.id}/arcs/${arcA.id}/preparation/${p.id}/instance`,aCookie,"POST",{sceneId:scene.id})).status).toBe(200);
  });

});
