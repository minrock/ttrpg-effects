import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { cleanup, fixture, accounts, listen, http, raw } from "./fixtures";
import { GENERIC_SYSTEM } from "../../../domain/systems/system-catalog";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { contentHash, draftContentSchema, type DraftContent, type DraftContext, type DraftHead } from "../../../domain/drafts/draft";
afterEach(async()=>{for(const action of cleanup.splice(0).reverse())await action();});
for(const kind of ['sqlite','postgres'] as const)describe(`Borradores reales ${kind}`,()=>{
  async function ready(){const config=await fixture(kind),auth=await accounts(config),port=await listen(auth.identity);
    const created=await http(port,'/games',auth.aCookie,'POST',{name:'Mesa borradores',systemRef:GENERIC_SYSTEM});
    const game=created.json.game as {id:string};
    const configuration=(await http(port,`/games/${game.id}/configuration`,auth.aCookie)).json.configuration as {hash:string};
    const context:DraftContext={gameId:game.id,writerId:randomUUID(),parentDraftId:null,sceneId:null,baseRevision:0,systemRef:GENERIC_SYSTEM,systemHash:configuration.hash};
    const made=await http(port,`/games/${game.id}/drafts`,auth.aCookie,'POST',context);expect(made.status).toBe(201);
    const head=made.json.draft as DraftHead;
    const content:DraftContent={scene:createDefaultScene(),bindings:{monsters:{}},view:{camera:{x:10,y:12,zoom:2},sidebar:true,aside:false,selectedId:null}};
    return {config,...auth,port,context,head,content};
  }
  it('aislamiento, CAS, recibos durables, una copia y confirmación atómica',async()=>{
    const t=await ready(),path=`/drafts/${t.head.id}`,put={sequence:1,hash:await contentHash(t.content),content:t.content,sceneId:null,baseRevision:0},key=randomUUID();
    for(const cookie of [t.bCookie,t.adminCookie,''])expect((await http(t.port,path,cookie)).status).toBe(cookie===t.bCookie?404:cookie?403:401);
    const first=await http(t.port,path,t.aCookie,'PUT',put,{'if-match':'0','idempotency-key':key});expect(first.status).toBe(200);
    expect((await http(t.port,path,t.aCookie,'PUT',put,{'if-match':'0','idempotency-key':key})).json).toEqual(first.json);
    expect((await http(t.port,path,t.aCookie,'PUT',{...put,sequence:2},{'if-match':'0'})).status).toBe(409);
    for(let sequence=2;sequence<=5;sequence++)expect((await http(t.port,path,t.aCookie,'PUT',{...put,sequence},{'if-match':String(sequence-1)})).status).toBe(200);
    const read=await http(t.port,path,t.aCookie);expect((read.json.versions as unknown[]).length).toBe(1);expect(read.json.content).toEqual(t.content);
    expect((await http(t.port,'/scenes',t.aCookie)).json.total).toBe(0);
    const confirmKey=randomUUID(),command={name:'Confirmada',mode:'copy',sceneRevision:0,targetGameId:t.context.gameId};
    const saved=await http(t.port,path+'/confirm',t.aCookie,'POST',command,{'if-match':'5','idempotency-key':confirmKey});expect(saved.status).toBe(200);
    expect((await http(t.port,path+'/confirm',t.aCookie,'POST',command,{'if-match':'5','idempotency-key':confirmKey})).json).toEqual(saved.json);
    expect((await http(t.port,'/scenes',t.aCookie)).json.total).toBe(1);
    expect((await http(t.port,path,t.aCookie)).json.draft).toMatchObject({confirmedSequence:5,context:{sceneId:saved.json.sceneId,baseRevision:1}});
    await t.identity.close();
    const counts=await raw(t.config,async c=>(await c.query('SELECT COUNT(*) AS n FROM owned_draft_versions')).rows[0]);expect(Number(counts.n)).toBe(1);
  });
  it('2000 autoguardados no consumen el diario general; borrar no admite resurrección por PUT',async()=>{
    const t=await ready(),path=`/drafts/${t.head.id}`,hash=await contentHash(t.content);
    // Contrato de repositorio en transacciones reales; evita usar un mock SQL para la carga.
    for(let sequence=1;sequence<=2000;sequence++)await t.identity.authorized(t.aCookie,'dm',async(_,tx)=>tx.drafts.put(t.head.id,sequence-1,randomUUID(),{sequence,hash,content:t.content,sceneId:null,baseRevision:0}));
    await t.identity.authorized(t.aCookie,'dm',async(_,tx)=>{expect((await tx.drafts.get(t.head.id)).versions).toHaveLength(1);});
    expect((await http(t.port,path,t.aCookie,'DELETE',{}, {'if-match':'2000'})).status).toBe(200);
    expect((await http(t.port,path,t.aCookie,'PUT',{sequence:2001,hash,content:t.content,sceneId:null,baseRevision:0},{'if-match':'2000'})).status).toBe(404);
    await t.identity.close();const count=await raw(t.config,async c=>(await c.query('SELECT COUNT(*) AS n FROM owned_operations')).rows[0]);expect(Number(count.n)).toBeLessThan(10);
  },120000);
  it('conserva huérfanos de partidas borradas y rechaza contextos, hashes o revisiones manipulados',async()=>{
    const t=await ready(),path=`/drafts/${t.head.id}`,input={sequence:1,hash:await contentHash(t.content),content:t.content,sceneId:null,baseRevision:0};
    expect((await http(t.port,path,t.aCookie,'PUT',{...input,hash:'a'.repeat(64)},{'if-match':'0'})).status).toBe(422);
    expect((await http(t.port,path,t.aCookie,'PUT',input,{'if-match':'0'})).status).toBe(200);
    expect((await http(t.port,`/games/${t.context.gameId}`,t.aCookie,'DELETE',{}, {'if-match':'1'})).status).toBe(200);
    expect((await http(t.port,'/drafts',t.aCookie)).json.total).toBe(1);
    expect((await http(t.port,path,t.aCookie)).status).toBe(200);
    expect((await http(t.port,path,t.aCookie,'PUT',{...input,sequence:2},{'if-match':'1'})).status).toBe(404);
  });
  it('confirmación con base atrasada conserva ambas versiones y no confirma el borrador',async()=>{
    const t=await ready(),path=`/drafts/${t.head.id}`,put={sequence:1,hash:await contentHash(t.content),content:t.content,sceneId:null,baseRevision:0};
    const key=randomUUID();const first=await http(t.port,path,t.aCookie,'PUT',put,{'if-match':'0','idempotency-key':key});expect(first.status).toBe(200);
    const saved=await http(t.port,path+'/confirm',t.aCookie,'POST',{name:'Base',mode:'copy',sceneRevision:0,targetGameId:t.context.gameId},{'if-match':'1'});expect(saved.status).toBe(200);
    // El mismo recibo PUT se conserva aun después de avanzar la confirmación.
    expect((await http(t.port,path,t.aCookie,'PUT',put,{'if-match':'0','idempotency-key':key})).json).toEqual(first.json);
    const resource=(await http(t.port,`/scenes/${saved.json.sceneId}`,t.aCookie)).json.resource as {scene:typeof t.content.scene};
    expect((await http(t.port,`/scenes/${saved.json.sceneId}`,t.aCookie,'PUT',{name:'Cambio ajeno',scene:resource.scene,bindings:{monsters:{}}},{'if-match':'1'})).status).toBe(200);
    const content=draftContentSchema.parse({...t.content,view:{...t.content.view,camera:{x:321,y:12,zoom:2}}});
    const updated=await http(t.port,path,t.aCookie,'PUT',{...put,sequence:2,sceneId:saved.json.sceneId,baseRevision:1,content,hash:await contentHash(content)},{'if-match':'1'});expect(updated.status,JSON.stringify(updated.json)).toBe(200);
    expect((await http(t.port,path+'/confirm',t.aCookie,'POST',{name:'No reemplazar',mode:'update',sceneRevision:1,targetGameId:t.context.gameId},{'if-match':'2'})).status).toBe(409);
    expect((await http(t.port,path,t.aCookie)).json.draft).toMatchObject({confirmedSequence:1,sequence:2});
    expect((await http(t.port,`/scenes/${saved.json.sceneId}`,t.aCookie)).json.resource).toMatchObject({name:'Cambio ajeno',revision:2});
  });

});
