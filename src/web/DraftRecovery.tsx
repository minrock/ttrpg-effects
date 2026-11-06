import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { BrowserClient } from "../infrastructure/browser/browser-client";
import type { LocalDraftIndex } from "../infrastructure/browser/drafts/indexeddb-store";
import { ServiceError } from "../infrastructure/browser/http";
import { contentHash, detachedScene, type DraftCheckpoint } from "../domain/drafts/draft";
import { ScenePicker, ServiceDialog } from "./dialogs";

function download(value:unknown){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download="borrador.ttrpg-recovery.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** La recuperación normal depende de IndexedDB, no del listado de borradores del servidor. */
export function DraftRecovery({browser,gameId,active,onRecovered,conflict=false}:{browser:BrowserClient;gameId:string;active:boolean;onRecovered:()=>void;conflict?:boolean}){
  const drafts=browser.drafts!;
  const status=useSyncExternalStore(drafts.subscribe,drafts.getStatus);
  const [open,setOpen]=useState(false),[items,setItems]=useState<LocalDraftIndex[]>([]),[selected,setSelected]=useState(""),[generation,setGeneration]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0),[picking,setPicking]=useState(false),[disable,setDisable]=useState(false);
  const prompted=useRef(false);
  useEffect(()=>{
    if(!active)return;let live=true;
    void browser.localDrafts.list(drafts.ownerId,drafts.origin,gameId).then(entries=>{
      if(!live)return;setItems(entries);setSelected(current=>entries.some(v=>v.id===current)?current:entries[0]?.id??"");
      if(!prompted.current&&entries.length)setOpen(true);
      prompted.current=true;
    }).catch(e=>{if(live){setError(e instanceof Error?e.message:"No se pudo leer el respaldo de este dispositivo.");setOpen(true);}});
    return()=>{live=false;};
  },[active,browser,drafts,gameId,refresh]);
  useEffect(()=>{if(active&&conflict){setOpen(true);setRefresh(n=>n+1);}},[active,conflict]);
  if(!active)return null;
  const entry=items.find(item=>item.id===selected);
  const memory=conflict?drafts.checkpoint:null;
  async function run(work:()=>Promise<void>){
    if(busy)return;setBusy(true);setError("");
    try{await work();}catch(e){setError(e instanceof Error?e.message:"No se pudo recuperar. La copia local se conserva.");setOpen(true);}finally{setBusy(false);}
  }
  async function recover(){await run(async()=>{
    await drafts.flushLocal().catch(()=>{});
    const value=memory??(entry?await browser.localDrafts.read(drafts.ownerId,drafts.origin,entry.id,generation||undefined):drafts.checkpoint);
    if(!value)throw new Error("Aún no hay un respaldo local para esta partida.");
    // Recuperar no reenvía una operación incierta. El original y su journal siguen en IndexedDB.
    const local={...value,pending:null,confirmation:null};
    try{await drafts.restore(local);}catch(e){
      if(!(e instanceof ServiceError)||!(e.status===404||e.code==="REVISION_CONFLICT"))throw e;
      await drafts.restore({...local,context:{...local.context,sceneId:null,baseRevision:0},content:{...local.content,scene:detachedScene(local.content.scene)}});
    }
    setOpen(false);onRecovered();
  });}
  async function loadSaved(reference:string){await run(async()=>{
    let saved;
    try{saved=await browser.openSaved(reference);}catch(e){
      if(e instanceof ServiceError&&e.status===404){setOpen(false);setPicking(true);return;}
      throw e;
    }
    const content=browser.draftContent(saved.scene,{camera:saved.scene.camera,sidebar:true,aside:true,selectedId:null});
    const value:DraftCheckpoint={schemaVersion:1,localDraftId:crypto.randomUUID(),ownerId:drafts.ownerId,origin:drafts.origin,instanceId:null,context:browser.draftContext(saved.filePath),remote:null,sequence:0,hash:await contentHash(content),updatedAt:new Date().toISOString(),content,pending:null,confirmation:null,createKey:crypto.randomUUID(),confirmedHash:null};
    await drafts.restore(value,{confirmed:true});setOpen(false);onRecovered();
  });}
  function reloadMap(){
    const sceneId=memory?.context.sceneId??entry?.context.sceneId;
    if(sceneId)void loadSaved(`scene:${sceneId}`);else {setOpen(false);setPicking(true);}
  }
  return <div className="draft-recovery" onKeyDown={event=>event.stopPropagation()}>
    <button type="button" aria-label="Recuperar estado local" title={`${status.local}\n${status.remote}\n${status.confirmed}`} onClick={()=>{setOpen(true);setRefresh(n=>n+1);}}>
      {status.enabled?(status.local==="Sin cambios pendientes"?"Respaldo local":status.local):"Respaldo local desactivado"}{status.error?" · Atención":""}
    </button>
    {picking&&<ScenePicker browser={browser} finish={reference=>{setPicking(false);if(reference)void loadSaved(reference);else setOpen(true);}}/>}
    {open&&<ServiceDialog title="¿Cómo quieres continuar?" onCancel={()=>{if(!busy)setOpen(false);}}>
      <p>{entry||memory?"Hay una copia de tu trabajo en este dispositivo, con sus figuras y cambios sin confirmar.":"Todavía no hay una copia local disponible. Puedes cargar una escena guardada."}</p>
      {entry&&<p>Último respaldo: <time dateTime={entry.updatedAt}>{new Date(entry.updatedAt).toLocaleString()}</time>.</p>}
      <p>Recuperar usa IndexedDB de este navegador. Cargar el mapa abre la escena guardada en el servidor y conserva la copia local.</p>
      <div className="draft-actions">
        <button autoFocus disabled={busy||!(entry||memory||drafts.checkpoint)} onClick={()=>void recover()}>Recuperar estado local</button>
        <button disabled={busy} onClick={reloadMap}>Cargar mapa nuevamente</button>
      </div>
      {(error||status.error)&&<p role="alert">{error||status.error}</p>}
      <details><summary>Más opciones</summary>
        <p role="status">{status.local}<br/>{status.remote}<br/>{status.confirmed}</p>
        <p>Si la escena del servidor cambió o fue eliminada, tu trabajo se recuperará como una copia sin sobrescribirla. Los enlaces de esa copia se desconectan.</p>
        {items.length>1&&<label>Otras copias de este dispositivo<select disabled={busy} value={selected} onChange={event=>{setSelected(event.target.value);setGeneration(0);}}>{items.map(item=><option key={item.id} value={item.id}>{new Date(item.updatedAt).toLocaleString()} · {item.context.sceneId?`Escena ${item.context.sceneId.slice(0,8)}`:"Lienzo sin guardar"}</option>)}</select></label>}
        {(entry?.revisions?.length??0)>1&&<label>Versión local<select disabled={busy} value={generation} onChange={event=>setGeneration(Number(event.target.value))}><option value={0}>Más reciente</option>{entry!.revisions.slice(1).map(sequence=><option key={sequence} value={sequence}>Anterior ({sequence})</option>)}</select></label>}
        <button disabled={busy||!entry} onClick={()=>void run(async()=>download(await browser.localDrafts.raw(drafts.ownerId,drafts.origin,entry!.id,generation||undefined)))}>Exportar copia local</button>
        <p>El respaldo contiene datos privados. Cerrar sesión explícitamente elimina las copias locales; la caducidad de sesión las conserva.</p>
        <button disabled={busy} onClick={()=>status.enabled?setDisable(true):void run(async()=>{await browser.localDrafts.setEnabled(drafts.ownerId,drafts.origin,true);drafts.setEnabled(true);await drafts.flushLocal();})}>{status.enabled?"Desactivar respaldo local":"Activar respaldo local"}</button>
        {disable&&<div><p>Se borrarán las copias locales de esta cuenta en este dispositivo. Exporta primero si quieres conservarlas.</p><button disabled={busy} onClick={()=>setDisable(false)}>Cancelar</button><button disabled={busy} onClick={()=>void run(async()=>{await browser.localDrafts.setEnabled(drafts.ownerId,drafts.origin,false);drafts.setEnabled(false);setDisable(false);setRefresh(n=>n+1);})}>Desactivar y borrar copias locales</button></div>}
      </details>
      <footer><button disabled={busy} onClick={()=>setOpen(false)}>Ahora no</button></footer>
    </ServiceDialog>}
  </div>;
}
