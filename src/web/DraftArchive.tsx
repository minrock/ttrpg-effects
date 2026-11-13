import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { HttpTransport } from "../infrastructure/browser/http";
import { httpDraftStore } from "../infrastructure/browser/drafts/http-store";
import { IndexedDbDraftStore, type LocalDraftIndex } from "../infrastructure/browser/drafts/indexeddb-store";
import { contentHash, detachedScene, type DraftCheckpoint, type DraftHead, type DraftConfirmation } from "../domain/drafts/draft";
import { configurationReply, gameReply, ok } from "./service-model";
import { ServiceDialog } from "./dialogs";
/** Acceso a respaldos sin abrir una mesa: también partidas archivadas/eliminadas. */
export function DraftArchive({http}:{http:HttpTransport}){
  const remote=useMemo(()=>httpDraftStore(http,'/dm'),[http]),local=useMemo(()=>new IndexedDbDraftStore(),[]);
  const [open,setOpen]=useState(false),[items,setItems]=useState<LocalDraftIndex[]>([]),[heads,setHeads]=useState<DraftHead[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[games,setGames]=useState<Array<{id:string;name:string}>>([]),[target,setTarget]=useState(''),[name,setName]=useState('Escena recuperada'),[discard,setDiscard]=useState(false),[reload,setReload]=useState(0),[notice,setNotice]=useState('');
  const pendingCopy=useRef<{source:string;target:string;name:string;checkpoint:DraftCheckpoint}|null>(null);
  const owner=http.accountId??'',origin=location.origin;
  useEffect(()=>{if(!open)return;let live=true;setError('');
    async function destinations(){
      const games:z.infer<typeof gameReply.shape.game>[]=[];
      for(let offset=0;live;){const page=await http.request(`/dm/games?limit=100&offset=${offset}`,z.object({ok,games:z.array(gameReply.shape.game),total:z.number()}));games.push(...page.games);offset+=page.games.length;if(!page.games.length||offset>=page.total)break;}
      return {games};
    }
    void Promise.allSettled([local.list(owner,origin),remote.list(),destinations()]).then(([l,r,g])=>{
      if(!live)return;if(l.status==='fulfilled')setItems(l.value);if(r.status==='fulfilled')setHeads(r.value.drafts);if(g.status==='fulfilled')setGames(g.value.games.filter(v=>v.state==='ready'));
      const failed=[l,r,g].find(v=>v.status==='rejected');if(failed?.status==='rejected')setError(failed.reason instanceof Error?failed.reason.message:'Algunos respaldos no están disponibles.');
    });return()=>{live=false;};
  },[open,owner,origin,local,remote,http,reload]);
  const entry=items.find(v=>selected===`local:${v.id}`),head=heads.find(v=>selected===`remote:${v.id}`);
  async function read():Promise<DraftCheckpoint>{
    if(entry)return local.read(owner,origin,entry.id);
    if(head){const reply=await remote.get(head.id);if(!reply.content)throw new Error('La rama está vacía.');return {schemaVersion:1,localDraftId:crypto.randomUUID(),ownerId:owner,origin,instanceId:null,context:reply.draft.context,remote:reply.draft,sequence:reply.draft.sequence,hash:reply.draft.hash,updatedAt:reply.draft.updatedAt,content:reply.content,pending:null,createKey:crypto.randomUUID(),confirmedHash:null};}
    throw new Error('Selecciona un respaldo.');
  }
  async function run(work:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await work();}catch(e){setError(e instanceof Error?e.message:'No se pudo completar. El respaldo se conserva.');}finally{setBusy(false);}}
  async function confirmCopy(command:DraftConfirmation){
    const current=await remote.get(command.draftId);
    if(current.draft.confirmedSequence>=command.sequence&&current.draft.context.sceneId)return {sceneId:current.draft.context.sceneId,sceneRevision:current.draft.context.baseRevision};
    return http.request(`/dm/drafts/${command.draftId}/confirm`,z.object({ok,sceneId:z.uuid(),sceneRevision:z.number()}),{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':command.key,'If-Match':String(command.revision)},body:JSON.stringify(command.payload)});
  }
  async function copy(){await run(async()=>{
    let pending=pendingCopy.current;
    if(pending&&(pending.source!==selected||pending.target!==target||pending.name!==name))throw new Error('Hay una copia pendiente. Reintenta con el destino y nombre originales para resolverla.');
    if(!pending){
      const source=await read();
      if(source.confirmation){
        const command=source.confirmation,ack=await confirmCopy(command);
        source.confirmation=null;source.context={...source.context,sceneId:ack.sceneId,baseRevision:ack.sceneRevision};source.confirmedHash=command.hash;
        await local.write(source);setReload(n=>n+1);setNotice('Se confirmó el guardado pendiente sin crear otra copia. La escena está disponible en su partida destino.');return;
      }
      const configuration=(await http.request(`/dm/games/${target}/configuration`,configurationReply)).configuration;
      if(configuration.hash!==source.context.systemHash)throw new Error('La partida destino necesita el mismo sistema y versión retenida.');
      const caps=await remote.capabilities();if(!caps)throw new Error('El servidor no admite recuperación de borradores.');
      if(source.instanceId&&source.instanceId!==caps.instanceId)throw new Error('El respaldo pertenece a otra instancia. Exporta la recuperación y repara las referencias antes de importarla.');
      const content={...source.content,scene:detachedScene(source.content.scene)},context={...source.context,gameId:target,sceneId:null,baseRevision:0,writerId:crypto.randomUUID(),parentDraftId:source.remote?.id??null};
      const checkpoint:DraftCheckpoint={...source,localDraftId:crypto.randomUUID(),context,content,hash:await contentHash(content),sequence:1,remote:null,pending:null,confirmation:null,instanceId:caps.instanceId,createKey:crypto.randomUUID()};
      pending={source:selected,target,name,checkpoint};pendingCopy.current=pending;
    }
    const cp=pending.checkpoint;
    if(!cp.remote){cp.remote=await remote.create(cp.context,cp.createKey);}
    if(cp.remote.sequence===0){cp.pending??={key:crypto.randomUUID(),revision:0,put:{sequence:1,hash:cp.hash,content:cp.content,sceneId:null,baseRevision:0}};await local.write(cp).catch(()=>{});cp.remote=await remote.put(cp.remote.id,cp.pending.revision,cp.pending.key,cp.pending.put);cp.pending=null;}
    cp.confirmation??={hash:cp.hash,draftId:cp.remote.id,sequence:1,revision:cp.remote.revision,key:crypto.randomUUID(),payload:{name:pending.name,mode:'copy',sceneRevision:0,targetGameId:pending.target}};
    await local.write(cp).catch(()=>{});
    const command=cp.confirmation;
    const ack=await confirmCopy(command);
    cp.confirmation=null;cp.context={...cp.context,sceneId:ack.sceneId,baseRevision:ack.sceneRevision};cp.confirmedHash=cp.hash;await local.write(cp).catch(()=>{});pendingCopy.current=null;setReload(n=>n+1);setNotice('Copia guardada. Abre la partida destino y carga la escena desde su biblioteca. El respaldo original se conserva.');
  });}
  return <><button onClick={()=>setOpen(true)}>Recuperar borradores de mis partidas</button>{open&&<ServiceDialog title="Archivo de borradores" onCancel={()=>{if(!busy)setOpen(false);}}>
    <p>Incluye respaldos de partidas archivadas o eliminadas. Puedes exportarlos o crear una escena en una partida compatible sin reactivar la original.</p>
    <label>Respaldo<select value={selected} disabled={busy||!!pendingCopy.current} onChange={e=>{setSelected(e.target.value);setDiscard(false);}}><option value="">Selecciona…</option>{items.map(v=><option key={v.id} value={`local:${v.id}`}>Dispositivo · {v.context.gameId.slice(0,8)} · {new Date(v.updatedAt).toLocaleString()}</option>)}{heads.map(v=><option key={v.id} value={`remote:${v.id}`}>Servidor · {v.context.gameId.slice(0,8)} · {new Date(v.updatedAt).toLocaleString()}</option>)}</select></label>
    <button disabled={busy||!selected} onClick={()=>void run(async()=>{const value=entry?await local.raw(owner,origin,entry.id):await read();const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='borrador.ttrpg-recovery.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>Exportar recuperación</button>
    <label>Partida destino<select disabled={busy||!!pendingCopy.current} value={target} onChange={e=>setTarget(e.target.value)}><option value="">Selecciona…</option>{games.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    <label>Nombre de la copia<input value={name} disabled={busy||!!pendingCopy.current} maxLength={200} onChange={e=>setName(e.target.value)}/></label>
    <button disabled={busy||!selected||!target||!name.trim()} onClick={()=>void copy()}>{pendingCopy.current?'Reintentar copia pendiente':'Guardar como copia'}</button>
    <button disabled={busy||!selected||!!pendingCopy.current} onClick={()=>setDiscard(true)}>Descartar este respaldo</button>
    {discard&&<div><p>Se eliminará solo la copia seleccionada ({entry?'local':'remota'}) de recuperación. Esta acción no elimina la escena guardada.</p><button disabled={busy} onClick={()=>setDiscard(false)}>Cancelar</button><button disabled={busy} onClick={()=>void run(async()=>{if(entry)await local.remove(owner,origin,entry.id);else if(head)await remote.remove(head.id,head.revision);setDiscard(false);setSelected('');setReload(n=>n+1);})}>Confirmar descarte</button></div>}
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}<footer><button disabled={busy} onClick={()=>setOpen(false)}>Cerrar</button></footer>
  </ServiceDialog>}</>;
}
