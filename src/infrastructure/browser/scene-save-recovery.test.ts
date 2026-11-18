import { afterEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { IDBFactory } from "fake-indexeddb";
import { z } from "zod";
import { createEmptyScene } from "../../domain/sessions/scene-maps";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { sceneContentHash, contentHash } from "../../domain/drafts/draft";
import { sceneServiceFixture as fixture, cleanupSceneService } from "./scene-save.fixture";
afterEach(cleanupSceneService);
it.each([true,false])("guardar confirma figuras/notas/cámara, reabre desde servidor sin IndexedDB y distingue cambios posteriores (mapa: %s)",async(withMap)=>{
 const f=await fixture(),browser=f.create(),base=withMap?createDefaultScene():createEmptyScene();
 const shape={id:"circle-1",type:"circle" as const,emoji:"🔥",points:[{x:20,y:30}],radius:60,color:"#ff0000"};
 const document={...base,shapes:[shape],sceneAside:{...base.sceneAside,notes:[{id:"note",parentId:null,name:"Nota",content:"Contenido privado"}]}};
 const view={camera:{x:120,y:230,zoom:1.7},sidebar:false,aside:true,selectedId:shape.id};
 const content=browser.draftContent(document,view);
 browser.drafts!.update(()=>({content,context:browser.draftContext(null)}));await browser.drafts!.flushLocal();
 const saved=await browser.client.api.saveScene(content.scene);expect(saved.ok,JSON.stringify(saved)).toBe(true);if(!saved.ok)return;
 expect(saved.scene.shapes).toHaveLength(1);expect(saved.scene.sceneAside.notes[0].content).toBe("Contenido privado");expect(saved.scene.camera).toEqual(view.camera);expect(saved.scene.editorView).toEqual({sidebar:false,aside:true,selectedId:shape.id});
 const indices=await browser.localDrafts.list(browser.drafts!.ownerId,browser.drafts!.origin,f.gameId);expect(indices[0].sceneHash).toBe(indices[0].confirmedSceneHash);expect(indices[0].context.sceneId).toBe(saved.filePath.slice(6));
 await browser.drafts!.stop();vi.stubGlobal("indexedDB",new IDBFactory());const reopened=f.create();
 expect(await reopened.latestSavedScene()).toBe(saved.filePath.slice(6));expect(await reopened.localDrafts.list(reopened.drafts!.ownerId,reopened.drafts!.origin)).toEqual([]);
 const loaded=await reopened.openSaved(saved.filePath);expect(loaded.scene).toEqual(saved.scene);
 await expect(f.http.request(`/games/${randomUUID()}/last-scene`,z.unknown())).rejects.toMatchObject({status:404});
 const changed=reopened.draftContent({...loaded.scene,shapes:[...loaded.scene.shapes,{...shape,id:"circle-2",points:[{x:300,y:200}]}]},view);
 reopened.drafts!.update(()=>({content:changed,context:reopened.draftContext(saved.filePath)}));await reopened.drafts!.flushLocal();expect(await reopened.isDraftSaved(reopened.drafts!.checkpoint!)).toBe(false);
 const again=await reopened.client.api.saveScene(changed.scene,{suggestedFilePath:saved.filePath});expect(again.ok,JSON.stringify(again)).toBe(true);if(!again.ok)return;
 expect(again.filePath).toBe(saved.filePath);expect(again.scene.shapes).toHaveLength(2);
 expect(await sceneContentHash(reopened.drafts!.checkpoint!.content)).toBe(reopened.drafts!.checkpoint!.confirmedSceneHash);
 expect((await f.http.request("/scenes",z.object({total:z.number()}))).total).toBe(1);
 expect((await f.create().openSaved(saved.filePath)).scene.shapes).toHaveLength(2);
},30000);

it("más de veinte guardar/salir/reabrir no agotan la cuota de borradores pendientes",async()=>{
 const f=await fixture();let reference:string|undefined;
 const base=createDefaultScene();
 for(let index=0;index<23;index++){
  const browser=f.create();
  const scene=reference?(await browser.openSaved(reference)).scene:base;
  const document={...scene,sceneAside:{...scene.sceneAside,notes:[{id:"nota",parentId:null,name:"Progreso",content:`Guardado ${index}`}]}};
  const saved=await browser.client.api.saveScene(document,reference?{suggestedFilePath:reference}:undefined);
  expect(saved.ok,`Guardado ${index}: ${JSON.stringify(saved)}`).toBe(true);if(!saved.ok)return;
  reference=saved.filePath;
  expect(browser.drafts!.getStatus().confirmed).toBe("Escena guardada");
  await browser.drafts!.stop();
 }
 const reopened=f.create();vi.stubGlobal("indexedDB",new IDBFactory());
 expect(await reopened.latestSavedScene()).toBe(reference!.slice(6));
 expect((await reopened.openSaved(reference!)).scene.sceneAside.notes[0].content).toBe("Guardado 22");
 const list=await reopened.drafts!.remote.list(f.gameId);
 expect(list.total).toBe(1);
 expect((await reopened.drafts!.remote.get(list.drafts[0].id)).versions).toHaveLength(1);
 expect(await reopened.localDrafts.list(reopened.drafts!.ownerId,reopened.drafts!.origin,f.gameId)).toHaveLength(1);
 expect(list.drafts.every(d=>d.sequence===d.confirmedSequence)).toBe(true);
 expect((await f.http.request("/scenes",z.object({total:z.number()}))).total).toBe(1);
},30000);

it("veinte ramas pendientes conservan sus datos y devuelven cuota explícita, no payload 413",async()=>{
 const f=await fixture(),browser=f.create();
 const content=browser.draftContent(createDefaultScene(),{camera:{x:0,y:0,zoom:1},sidebar:true,aside:true,selectedId:null});
 const context=browser.draftContext(null);
 for(let n=0;n<20;n++){
  const saved=await f.http.request('/scenes',z.object({resource:z.object({id:z.string()})}),{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":randomUUID()},body:JSON.stringify({name:`Escena ${n}`,scene:content.scene,bindings:content.bindings,campaignId:f.gameId})});
  await browser.drafts!.remote.create({...context,writerId:randomUUID(),sceneId:saved.resource.id,baseRevision:1},randomUUID());
 }
 await expect(browser.drafts!.remote.create({...context,writerId:randomUUID(),sceneId:null,gameId:context.gameId},randomUUID())).rejects.toMatchObject({status:409,code:"DRAFT_BRANCH_LIMIT"});
 const before=await browser.drafts!.remote.list(f.gameId);expect(before.total).toBe(20);
 browser.drafts!.update(()=>({content,context}));await browser.drafts!.flushLocal();
 await expect(browser.drafts!.flushRemote()).rejects.toMatchObject({code:"DRAFT_BRANCH_LIMIT"});
 expect(await browser.localDrafts.list(browser.drafts!.ownerId,browser.drafts!.origin,f.gameId)).toHaveLength(1);
 expect((await browser.drafts!.remote.list(f.gameId)).total).toBe(20);
 // Confirmar una rama libera una plaza; editarla de nuevo debe reservarla otra vez.
 const first=before.drafts[0],put={sequence:1,hash:await contentHash(content),content,sceneId:null,baseRevision:0};
 await browser.drafts!.remote.put(first.id,0,randomUUID(),put);
 await f.http.request(`/drafts/${first.id}/confirm`,z.unknown(),{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":randomUUID(),"If-Match":"1"},body:JSON.stringify({name:"Guardada",mode:"copy",sceneRevision:0,targetGameId:f.gameId})});
 await browser.drafts!.remote.create({...context,writerId:randomUUID(),sceneId:null,gameId:context.gameId},randomUUID());
 await expect(browser.drafts!.remote.put(first.id,1,randomUUID(),{...put,sequence:2})).rejects.toMatchObject({status:409,code:"DRAFT_BRANCH_LIMIT"});
 expect((await browser.drafts!.remote.get(first.id)).draft).toMatchObject({revision:1,sequence:1,confirmedSequence:1});
 expect((await browser.drafts!.remote.list(f.gameId)).total).toBe(21);
 // Un tamaño declarado excesivo sigue devolviendo 413 antes de leer el cuerpo.
 await expect(f.http.request(`/games/${f.gameId}/drafts`,z.unknown(),{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":randomUUID(),"Content-Length":String(10*1024*1024+1)},body:"{}"})).rejects.toMatchObject({status:413,code:"PAYLOAD_TOO_LARGE"});
},30000);

it("dos ventanas reutilizan el respaldo y una escritura atrasada recibe conflicto sin pisarlo",async()=>{
 const f=await fixture(),browser=f.create(),remote=browser.drafts!.remote,context=browser.draftContext(null);
 const first=await remote.create(context,randomUUID());
 const second=await remote.create({...context,writerId:randomUUID()},randomUUID());expect(second.id).toBe(first.id);
 const content=browser.draftContent(createDefaultScene(),{camera:{x:0,y:0,zoom:1},sidebar:true,aside:true,selectedId:null});
 const put={content,hash:await contentHash(content),sequence:1,sceneId:null,baseRevision:0},key=randomUUID();
 const saved=await remote.put(first.id,first.revision,key,put);
 expect(await remote.put(first.id,first.revision,key,put)).toEqual(saved);
 await expect(remote.put(second.id,second.revision,randomUUID(),{...put,sequence:2})).rejects.toMatchObject({status:409});
 const current=await remote.get(first.id);expect(current.draft).toEqual(saved);expect(current.versions).toHaveLength(1);expect((await remote.list(f.gameId)).total).toBe(1);
},30000);

it("no reconoce una confirmación antigua con los datos guardados después por otra ventana",async()=>{
 const f=await fixture(),first=f.create();
 const saved=await first.client.api.saveScene(createDefaultScene());expect(saved.ok).toBe(true);if(!saved.ok)return;
 const before=first.drafts!.checkpoint!,head=before.remote!;
 // Un diario cuyo recibo ya no está disponible debe producir conflicto, no confirmar otro documento.
 await first.drafts!.pendingConfirmation({hash:head.hash,key:randomUUID(),draftId:head.id,revision:head.revision,sequence:head.sequence,payload:{name:"Escena completa",mode:"update",sceneRevision:1,targetGameId:f.gameId}});
 const second=f.create(),loaded=await second.openSaved(saved.filePath);
 const changed={...loaded.scene,sceneAside:{...loaded.scene.sceneAside,notes:[{id:"nueva",parentId:null,name:"Nota",content:"Otro guardado"}]}};
 const newer=await second.client.api.saveScene(changed,{suggestedFilePath:saved.filePath});expect(newer.ok).toBe(true);
 const old=await first.client.api.saveScene(saved.scene,{suggestedFilePath:saved.filePath});expect(old.ok).toBe(false);
 expect((await f.create().openSaved(saved.filePath)).scene.sceneAside.notes[0].content).toBe("Otro guardado");
},30000);
