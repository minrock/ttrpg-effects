import { createHash } from "node:crypto";
import { canonical } from "../../../domain/drafts/draft";
import { IDBFactory } from "fake-indexeddb";
import { expect,it } from "vitest";
import { IndexedDbDraftStore } from "./indexeddb-store";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import type { DraftCheckpoint } from "../../../domain/drafts/draft";
function checkpoint():DraftCheckpoint{const value:DraftCheckpoint={schemaVersion:1,localDraftId:crypto.randomUUID(),ownerId:'owner',origin:'https://mesa.test',instanceId:null,context:{gameId:crypto.randomUUID(),writerId:crypto.randomUUID(),parentDraftId:null,sceneId:null,baseRevision:0,systemRef:{systemId:'generic',version:1},systemHash:'hash'},remote:null,sequence:1,hash:'',updatedAt:new Date().toISOString(),pending:null,createKey:crypto.randomUUID(),confirmedHash:null,content:{scene:createDefaultScene(),bindings:{monsters:{}},view:{camera:{x:1,y:2,zoom:3},sidebar:true,aside:true,selectedId:null}}};return {...value,hash:createHash("sha256").update(canonical(value.content)).digest("hex")};}
it('reabre la DB, retiene solo la última copia y separa cuentas/orígenes',async()=>{
 const factory=new IDBFactory(),store=new IndexedDbDraftStore(factory),value=checkpoint();
 for(let sequence=1;sequence<=5;sequence++)await store.write({...value,sequence});
 const reopened=new IndexedDbDraftStore(factory),index=await reopened.list('owner','https://mesa.test');expect(index).toHaveLength(1);expect(index[0].revisions).toEqual([5]);
 expect((await reopened.read('owner','https://mesa.test',value.localDraftId)).content.view.camera.zoom).toBe(3);
 await expect(reopened.read('otro','https://mesa.test',value.localDraftId)).rejects.toThrow('cuenta');
 await expect(reopened.read('owner','https://otro.test',value.localDraftId)).rejects.toThrow('cuenta');
 await reopened.remove('otro','https://mesa.test');expect(await reopened.list('owner','https://mesa.test')).toHaveLength(1);
 await reopened.remove('owner','https://mesa.test');expect(await reopened.list('owner','https://mesa.test')).toHaveLength(0);
});
it('tamaño excesivo y escritura atrasada preservan la copia anterior',async()=>{
 const store=new IndexedDbDraftStore(new IDBFactory()),value=checkpoint();await store.write({...value,sequence:2});
 await expect(store.write(value)).rejects.toThrow('cambió');
 await expect(store.write({...value,sequence:3,hash:'x'.repeat(11*1024*1024)})).rejects.toThrow('10 MiB');
 expect((await store.read(value.ownerId,value.origin,value.localDraftId)).sequence).toBe(2);
});
it('opt-out elimina y no recrea copias por un envío atrasado',async()=>{
 const store=new IndexedDbDraftStore(new IDBFactory()),value=checkpoint();await store.write(value);await store.setEnabled(value.ownerId,value.origin,false);await store.write({...value,sequence:2});
 expect(await store.list(value.ownerId,value.origin)).toHaveLength(0);expect(await store.enabled(value.ownerId)).toBe(false);
});
it('IndexedDB denegado produce error recuperable',async()=>{
 const store=new IndexedDbDraftStore(undefined);await expect(store.write(checkpoint())).rejects.toThrow('IndexedDB');
});
it('logout invalida escritores anteriores incluso desde otra pestaña',async()=>{
 const factory=new IDBFactory(),first=new IndexedDbDraftStore(factory),second=new IndexedDbDraftStore(factory),value=checkpoint();
 await first.enabled(value.ownerId);await first.write(value);await second.forgetAccount(value.ownerId,value.origin);
 await expect(first.write({...value,sequence:2})).rejects.toThrow('cerró sesión');expect(await second.list(value.ownerId,value.origin)).toHaveLength(0);
 const afterLogin=new IndexedDbDraftStore(factory);await afterLogin.enabled(value.ownerId);await afterLogin.write({...value,sequence:3});expect(await afterLogin.list(value.ownerId,value.origin)).toHaveLength(1);
});

it('respaldo incompatible sigue exportable sin mantener versiones anteriores',async()=>{
 const store=new IndexedDbDraftStore(new IDBFactory()),value=checkpoint();await store.write(value);
 await store.write({...value,sequence:2,schemaVersion:99} as unknown as DraftCheckpoint);
 await expect(store.read(value.ownerId,value.origin,value.localDraftId)).rejects.toThrow('incompatible');
 expect(await store.raw(value.ownerId,value.origin,value.localDraftId)).toMatchObject({schemaVersion:99});
 await expect(store.read(value.ownerId,value.origin,value.localDraftId,1)).rejects.toThrow('ya no está disponible');
});

it('la cuota agregada rechaza sin rotar ni borrar respaldos anteriores',async()=>{
 const store=new IndexedDbDraftStore(new IDBFactory()),values=Array.from({length:7},()=>({...checkpoint(),hash:'x'.repeat(8*1024*1024)}));
 for(const value of values.slice(0,6))await store.write(value);
 await expect(store.write(values[6])).rejects.toThrow('50 MiB');
 expect(await store.list('owner','https://mesa.test')).toHaveLength(6);
 expect((await store.raw('owner','https://mesa.test',values[0].localDraftId) as DraftCheckpoint).sequence).toBe(1);
});

it('detecta contenido alterado aunque el JSON siga siendo válido',async()=>{
 const store=new IndexedDbDraftStore(new IDBFactory()),value=checkpoint();await store.write({...value,content:{...value.content,view:{...value.content.view,sidebar:false}}});
 await expect(store.read(value.ownerId,value.origin,value.localDraftId)).rejects.toThrow('dañado');
 expect(await store.raw(value.ownerId,value.origin,value.localDraftId)).toBeDefined();
});

it('recupera el contenido íntegro de un respaldo con PUT cero y conserva el original exportable',async()=>{
 const store=new IndexedDbDraftStore(new IDBFactory()),value=checkpoint();
 const pending={key:crypto.randomUUID(),revision:0,put:{sequence:0,hash:value.hash,content:value.content,sceneId:null,baseRevision:0}};
 const legacy={...value,sequence:0,pending,remote:{id:crypto.randomUUID(),context:value.context,revision:0,sequence:0,hash:'',updatedAt:value.updatedAt,confirmedSequence:0}};
 await store.write(legacy);
 const recovered=await store.read(value.ownerId,value.origin,value.localDraftId);
 expect(recovered.content).toEqual(value.content);expect(recovered.pending).toBeNull();expect(recovered.sequence).toBe(1);
 expect(await store.raw(value.ownerId,value.origin,value.localDraftId)).toEqual(legacy);
 await store.write({...legacy,sequence:1,pending:{...pending,put:{...pending.put,hash:'a'.repeat(64)}}});
 await expect(store.read(value.ownerId,value.origin,value.localDraftId)).rejects.toThrow('dañado');
});

it('una nueva ventana reemplaza la misma escena y una escritura atrasada no recupera la copia anterior',async()=>{
 const store=new IndexedDbDraftStore(new IDBFactory()),first={...checkpoint(),updatedAt:"2026-11-12T10:00:00.000Z"};await store.write(first);
 const next={...first,localDraftId:crypto.randomUUID(),sequence:1,updatedAt:"2026-11-12T10:01:00.000Z"};await store.write(next);
 expect(await store.list(first.ownerId,first.origin)).toMatchObject([{id:next.localDraftId,revisions:[1]}]);
 await expect(store.read(first.ownerId,first.origin,first.localDraftId)).rejects.toThrow('cuenta');
 await expect(store.write({...first,sequence:10})).rejects.toThrow('más reciente');
 const other={...checkpoint(),context:{...first.context,sceneId:crypto.randomUUID()}};await store.write(other);
 expect(await store.list(first.ownerId,first.origin)).toHaveLength(2);
});

it('consolida índices antiguos y elimina sus versiones al listar, aislando otras cuentas',async()=>{
 const factory=new IDBFactory(),store=new IndexedDbDraftStore(factory),first=checkpoint();await store.write(first);
 const next={...first,localDraftId:crypto.randomUUID(),sequence:3,updatedAt:"2099-01-01T00:00:00.000Z"};
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const req=factory.open("ttrpg-drafts-v1",1);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
 const index=(await store.list(first.ownerId,first.origin))[0];
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction(["index","versions"],"readwrite");tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);
  tx.objectStore("index").put({...index,id:next.localDraftId,sequence:3,updatedAt:next.updatedAt,revisions:[3,2],bytes:200});
  tx.objectStore("versions").put({key:`${next.localDraftId}:2`,value:{...next,sequence:2},bytes:100});
  tx.objectStore("versions").put({key:`${next.localDraftId}:3`,value:next,bytes:100});
 });db.close();
 expect(await store.list(first.ownerId,first.origin)).toMatchObject([{id:next.localDraftId,revisions:[3],bytes:100}]);
 await expect(store.raw(first.ownerId,first.origin,first.localDraftId)).rejects.toThrow('cuenta');
 await expect(store.raw(first.ownerId,first.origin,next.localDraftId,2)).rejects.toThrow('disponible');
 expect(await store.read(first.ownerId,first.origin,next.localDraftId)).toEqual(next);
});
