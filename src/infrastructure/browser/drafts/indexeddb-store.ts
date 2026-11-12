import { sceneContentHash, readLocalCheckpoint, DRAFT_LIMITS, encodedBytes, type DraftCheckpoint, type DraftContext } from "../../../domain/drafts/draft";
export interface LocalDraftIndex {
  id:string; ownerId:string; origin:string; instanceId:string|null; context:DraftContext;
  confirmedHash?:string|null; confirmedSceneHash?:string|null; sceneHash?:string;
  sequence:number; hash:string; updatedAt:string; remoteId:string|null; bytes:number; revisions:number[];
}
const DATABASE="ttrpg-drafts-v1";
function request<T>(req:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function complete(tx:IDBTransaction):Promise<void>{return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error("No se pudo guardar el respaldo local."));tx.onerror=()=>{};});}
export class IndexedDbDraftStore {
  private epochs=new Map<string,number>();
  constructor(private readonly factory: IDBFactory | undefined = globalThis.indexedDB) {}
  private async open():Promise<IDBDatabase>{
    if(!this.factory)throw new Error("El navegador no permite IndexedDB. El borrador sigue en memoria; guarda o exporta antes de cerrar.");
    const req=this.factory.open(DATABASE,1);
    req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore("index",{keyPath:"id"});db.createObjectStore("versions",{keyPath:"key"});db.createObjectStore("preferences");};
    const db=await request(req);db.onversionchange=()=>db.close();return db;
  }
  private async run<T>(stores:string[], mode:IDBTransactionMode, work:(tx:IDBTransaction)=>Promise<T>):Promise<T>{
    const db=await this.open();const tx=db.transaction(stores,mode);const done=complete(tx);void done.catch(()=>{});
    try{const result=await work(tx);await done;return result;}catch(error){try{tx.abort();}catch{/* Ya abortada. */}throw error;}finally{db.close();}
  }
  list(ownerId:string,origin:string,gameId?:string):Promise<LocalDraftIndex[]>{return this.run(["index"],"readonly",async tx=>(await request(tx.objectStore("index").getAll()) as LocalDraftIndex[]).filter(v=>v.ownerId===ownerId&&v.origin===origin&&(!gameId||v.context.gameId===gameId)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));}
  async read(ownerId:string,origin:string,id:string,sequence?:number):Promise<DraftCheckpoint>{
    return readLocalCheckpoint(await this.raw(ownerId,origin,id,sequence));
  }
  raw(ownerId:string,origin:string,id:string,sequence?:number):Promise<unknown>{return this.run(["index","versions"],"readonly",async tx=>{
    const index=await request(tx.objectStore("index").get(id)) as LocalDraftIndex|undefined;
    if(!index||index.ownerId!==ownerId||index.origin!==origin)throw new Error("No se encontró este respaldo para tu cuenta.");
    const row=await request(tx.objectStore("versions").get(`${id}:${sequence??index.sequence}`)) as {value:unknown}|undefined;
    if(!row)throw new Error("La generación local ya no está disponible.");return row.value;
  });}
  async write(value:DraftCheckpoint):Promise<void>{
    const sceneHash=await sceneContentHash(value.content);
    const bytes=encodedBytes(value);
    if(bytes>DRAFT_LIMITS.bytes) return Promise.reject(new Error("El respaldo supera 10 MiB. Reduce el documento o expórtalo; se conserva la copia anterior."));
    return this.run(["index","versions","preferences"],"readwrite",async tx=>{
      const epoch=Number(await request(tx.objectStore("preferences").get(`epoch:${value.ownerId}`))??0);
      const expected=this.epochs.get(value.ownerId)??epoch;this.epochs.set(value.ownerId,expected);
      if(epoch!==expected)throw new Error("La cuenta cerró sesión. El respaldo anterior no puede volver a escribirse.");
      if(await request(tx.objectStore("preferences").get(value.ownerId))===false)return;
      const indices=await request(tx.objectStore("index").getAll()) as LocalDraftIndex[];
      const previous=indices.find(v=>v.id===value.localDraftId);
      if(previous&&(previous.ownerId!==value.ownerId||previous.origin!==value.origin||previous.sequence>value.sequence))throw new Error("El respaldo cambió en otra ventana. Se conserva la versión anterior.");
      const versions=tx.objectStore("versions");
      const keep=[value.sequence,...(previous?.revisions??[]).filter(n=>n!==value.sequence)].sort((a,b)=>b-a).slice(0,DRAFT_LIMITS.generations);
      let branchBytes=bytes;
      for(const seq of keep.filter(n=>n!==value.sequence)){const row=await request(versions.get(`${value.localDraftId}:${seq}`)) as {bytes:number}|undefined;branchBytes+=row?.bytes??0;}
      if(indices.reduce((n,v)=>n+v.bytes,0)-(previous?.bytes??0)+branchBytes>DRAFT_LIMITS.localBytes)throw new Error("Se alcanzó el límite local de 50 MiB. Exporta o descarta un respaldo; no se borró ninguno.");
      await request(versions.put({key:`${value.localDraftId}:${value.sequence}`,value,bytes}));
      for(const seq of previous?.revisions??[])if(!keep.includes(seq))await request(versions.delete(`${value.localDraftId}:${seq}`));
      const index:LocalDraftIndex={sceneHash,confirmedSceneHash:value.confirmedSceneHash,confirmedHash:value.confirmedHash,id:value.localDraftId,ownerId:value.ownerId,origin:value.origin,instanceId:value.instanceId,context:value.context,sequence:value.sequence,hash:value.hash,updatedAt:value.updatedAt,remoteId:value.remote?.id??null,bytes:branchBytes,revisions:keep};
      await request(tx.objectStore("index").put(index));
    });
  }
  remove(ownerId:string,origin:string,id?:string):Promise<void>{return this.run(["index","versions"],"readwrite",async tx=>{
    for(const index of await request(tx.objectStore("index").getAll()) as LocalDraftIndex[]){
      if(index.ownerId!==ownerId||index.origin!==origin||id&&index.id!==id)continue;
      for(const sequence of index.revisions)await request(tx.objectStore("versions").delete(`${index.id}:${sequence}`));
      await request(tx.objectStore("index").delete(index.id));
    }
  });}
  enabled(ownerId:string):Promise<boolean>{return this.run(["preferences"],"readonly",async tx=>{
    const epoch=Number(await request(tx.objectStore("preferences").get(`epoch:${ownerId}`))??0);if(!this.epochs.has(ownerId))this.epochs.set(ownerId,epoch);
    return await request(tx.objectStore("preferences").get(ownerId))!==false;
  });}
  forgetAccount(ownerId:string,origin:string):Promise<void>{return this.run(["preferences","index","versions"],"readwrite",async tx=>{
    const prefs=tx.objectStore("preferences"),epoch=Number(await request(prefs.get(`epoch:${ownerId}`))??0);
    await request(prefs.put(epoch+1,`epoch:${ownerId}`));
    for(const index of await request(tx.objectStore("index").getAll()) as LocalDraftIndex[]){
      if(index.ownerId!==ownerId||index.origin!==origin)continue;
      for(const sequence of index.revisions)await request(tx.objectStore("versions").delete(`${index.id}:${sequence}`));
      await request(tx.objectStore("index").delete(index.id));
    }
  });}
  async setEnabled(ownerId:string,origin:string,enabled:boolean):Promise<void>{
    await this.run(["preferences"],"readwrite",async tx=>{await request(tx.objectStore("preferences").put(enabled,ownerId));});
    if(!enabled)await this.remove(ownerId,origin);
  }
}
