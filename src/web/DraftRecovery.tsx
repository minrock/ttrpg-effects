import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { BrowserClient } from "../infrastructure/browser/browser-client";
import type { LocalDraftIndex } from "../infrastructure/browser/drafts/indexeddb-store";
import { ServiceError } from "../infrastructure/browser/http";
import { contentHash, detachedScene, type DraftCheckpoint } from "../domain/drafts/draft";
import { ScenePicker, ServiceDialog } from "./dialogs";
import { useActiveOperation } from "./use-active-operation";

function download(value:unknown){
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:"application/json"}));
  const link=document.createElement("a");link.href=url;link.download="borrador.ttrpg-recovery.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

/** La recuperación normal depende de IndexedDB, no del listado de borradores del servidor. */
type OpeningRecovery={state:"checking"|"continue"|"start"|"foreign"|"failed";message:string;onRetry:()=>void;onAction:(action:"continue"|"start",checkpoint:DraftCheckpoint,isCurrent:()=>boolean)=>Promise<boolean>};
export function DraftRecovery({browser,gameId,active,onRecovered,onExit=()=>{},conflict=false,selectedSceneId,selectedSceneName,openingRecovery,handoff,onHandoffConsumed}:{browser:BrowserClient;gameId:string;active:boolean;onRecovered:()=>void;onExit?:()=>void;conflict?:boolean;selectedSceneId?:string;selectedSceneName?:string;openingRecovery?:OpeningRecovery;handoff?:DraftCheckpoint|null;onHandoffConsumed?:()=>void}){
  const drafts=browser.drafts!;
  const status=useSyncExternalStore(drafts.subscribe,drafts.getStatus);
  const [open,setOpen]=useState(false),[items,setItems]=useState<LocalDraftIndex[]>([]),[selected,setSelected]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0),[picking,setPicking]=useState(false),[disable,setDisable]=useState(false),[handoffReady,setHandoffReady]=useState(!handoff);
  const prompted=useRef(false);
  const restoredHandoff=useRef<string|null>(null);
  const completedHandoff=useRef<string|null>(null);
  const captureOperation=useActiveOperation(active);
  useEffect(()=>{prompted.current=false;setOpen(false);},[selectedSceneId]);
  useEffect(()=>{
    if(!handoff){setHandoffReady(true);completedHandoff.current=null;return;}
    if(!active||status.ready===false||completedHandoff.current===handoff.localDraftId||restoredHandoff.current===handoff.localDraftId)return;
    let live=true;restoredHandoff.current=handoff.localDraftId;prompted.current=true;setHandoffReady(false);
    void drafts.restore(handoff).then(()=>{
      if(!live)return;
      completedHandoff.current=handoff.localDraftId;setHandoffReady(true);onHandoffConsumed?.();onRecovered();
    }).catch(cause=>{if(live){setError(cause instanceof Error?cause.message:"No se pudo restaurar el borrador traspasado.");setOpen(true);}});
    return()=>{live=false;if(restoredHandoff.current===handoff.localDraftId)restoredHandoff.current=null;};
  },[active,drafts,handoff,onHandoffConsumed,onRecovered,status.ready]);
  useEffect(()=>{
    if(!active||status.ready===false||!handoffReady)return;let live=true;
    void (async()=>{
      const entries=await browser.localDrafts.list(drafts.ownerId,drafts.origin,gameId).catch(()=>[]);
      const targetSceneId=selectedSceneId??await browser.latestSavedScene?.()??null;
      const selectedEntry=targetSceneId ? entries.find(entry=>entry.context.sceneId===targetSceneId) : entries.find(entry=>entry.context.sceneId===null);
      if(!live)return;setItems(selectedEntry?[selectedEntry]:[]);setSelected(selectedEntry?.id??"");
      if(prompted.current)return;
      const latest=selectedEntry;
      let clean=!!latest&&(!!latest.confirmedHash&&latest.confirmedHash===latest.hash||!!latest.confirmedSceneHash&&latest.confirmedSceneHash===latest.sceneHash);
      // Incluye índices antiguos y confirmaciones cuya respuesta o escritura local se perdió.
      if(latest&&!clean&&latest.context.sceneId&&browser.isDraftSaved){
        try{clean=await browser.isDraftSaved(await browser.localDrafts.read(drafts.ownerId,drafts.origin,latest.id));}catch{/* Conservar la elección local si no puede verificarse. */}
      }
      if(!live)return;prompted.current=true;
      if(latest&&!clean){setOpen(true);return;}
      const sceneId=targetSceneId??latest?.context.sceneId;
      if(live&&sceneId)await loadSaved(`scene:${sceneId}`);
    })().catch(e=>{if(live){setError(e instanceof Error?e.message:"No se pudo abrir la escena guardada.");setOpen(true);}});
    return()=>{live=false;};
  },[active,browser,drafts,gameId,handoffReady,refresh,status.ready,selectedSceneId]);
  useEffect(()=>{if(active&&(conflict||openingRecovery)){setOpen(true);setRefresh(n=>n+1);}},[active,conflict,openingRecovery]);
  if(!active)return null;
  const entry=items.find(item=>item.id===selected);
  const memory=conflict?drafts.checkpoint:null;
  async function run(work:()=>Promise<void>){
    if(busy)return;setBusy(true);setError("");
    try{await work();}catch(e){setError(e instanceof Error?e.message:"No se pudo recuperar. La copia local se conserva.");setOpen(true);}finally{setBusy(false);}
  }
  async function recover(){await run(async()=>{
    await drafts.flushLocal().catch(()=>{});
    const value=memory??(entry?await browser.localDrafts.read(drafts.ownerId,drafts.origin,entry.id):drafts.checkpoint);
    if(!value)throw new Error("Aún no hay un respaldo local para esta partida.");
    // Recuperar el contenido local elegido, sin reenviar sus operaciones pendientes.
    const local={...value,pending:null,confirmation:null};
    try{await drafts.restore(local);}catch(e){
      if(!(e instanceof ServiceError)||!(e.status===404||e.code==="REVISION_CONFLICT"))throw e;
      await drafts.restore({...local,context:{...local.context,sceneId:null,baseRevision:0},content:{...local.content,scene:detachedScene(local.content.scene)}});
    }
    setOpen(false);onRecovered();
  });}
  async function checkpointForHandoff():Promise<DraftCheckpoint>{
    // flushLocal captura el snapshot más reciente incluso con el respaldo local
    // desactivado. Leer después evita traspasar una versión anterior al remonte.
    await drafts.flushLocal();
    const value=drafts.checkpoint??memory??(entry?await browser.localDrafts.read(drafts.ownerId,drafts.origin,entry.id):null);
    if(!value)throw new Error("Aún no hay un respaldo para conservar antes de cambiar la apertura.");
    if(value.pending||value.confirmation)throw new Error("Hay un guardado pendiente sin resolver. Exporta la copia o resuelve ese guardado antes de cambiar la apertura.");
    if(status.enabled){
      if(!drafts.getStatus().local.startsWith("Guardado en este dispositivo"))throw new Error("No se confirmó el respaldo local. Conserva o exporta la copia antes de continuar.");
    }
    return value;
  }
  async function resolveOpening(action:"continue"|"start"){await run(async()=>{
    if(!openingRecovery)throw new Error("La comprobación de apertura ya no está disponible.");
    const current=captureOperation();
    const checkpoint=await checkpointForHandoff();
    if(!current()||!await openingRecovery.onAction(action,checkpoint,current))throw new Error("La apertura cambió antes de continuar. Comprueba su estado otra vez.");
  });}
  async function loadSaved(reference:string){await run(async()=>{
    let saved;
    try{saved=await browser.openSaved(reference);}catch(e){
      if(e instanceof ServiceError&&e.status===404){
        if(selectedSceneId)throw new Error("La escena seleccionada ya no está disponible. Vuelve al arco para elegir otra.");
        setOpen(false);setPicking(true);return;
      }
      throw e;
    }
    const content=browser.draftContent(saved.scene,{camera:saved.scene.camera,...(saved.scene.editorView??{sidebar:true,aside:true,selectedId:null})});
    const value:DraftCheckpoint={schemaVersion:1,localDraftId:crypto.randomUUID(),ownerId:drafts.ownerId,origin:drafts.origin,instanceId:null,context:browser.draftContext(saved.filePath),remote:null,sequence:0,hash:await contentHash(content),updatedAt:new Date().toISOString(),content,pending:null,confirmation:null,createKey:crypto.randomUUID(),confirmedHash:null};
    await drafts.restore(value,{confirmed:true});setOpen(false);onRecovered();
  });}
  function reloadMap(){
    const sceneId=selectedSceneId??memory?.context.sceneId??entry?.context.sceneId;
    if(sceneId)void loadSaved(`scene:${sceneId}`);else {setOpen(false);setPicking(true);}
  }
  if(!open&&!picking)return null;
  const sceneLabel=selectedSceneName??"esta escena";
  const leave=()=>{if(!busy){setOpen(false);setPicking(false);onExit();}};
  return <div className="draft-recovery" onKeyDown={event=>event.stopPropagation()}>
    {picking&&<ScenePicker browser={browser} finish={reference=>{setPicking(false);if(reference)void loadSaved(reference);else setOpen(true);}}/>}
    {open&&<ServiceDialog title={openingRecovery?"La apertura de la partida cambió":`Cambios sin guardar de ${sceneLabel}`} onCancel={leave}>
      {openingRecovery&&<><p role="alert">{openingRecovery.message}</p>{openingRecovery.state==="checking"&&<p role="status">Comprobando apertura…</p>}{openingRecovery.state==="failed"&&<><p role="alert">{openingRecovery.message}</p><button disabled={busy} onClick={openingRecovery.onRetry}>Reintentar comprobación</button></>}{openingRecovery.state==="continue"&&<><p>La apertura sigue vigente. Continuar conserva el borrador y no publica la escena.</p><button disabled={busy} onClick={()=>void resolveOpening("continue")}>Continuar partida</button></>}{openingRecovery.state==="start"&&<><p>La apertura anterior terminó. Iniciar una nueva apertura genera una invitación nueva; las personas jugadoras deberán volver a entrar.</p><button disabled={busy} onClick={()=>void resolveOpening("start")}>Iniciar nueva apertura</button></>}{openingRecovery.state==="foreign"&&<p role="alert">{openingRecovery.message}</p>}</>}
      <p>{entry||memory?(status.enabled?"Hay una copia de tu trabajo en este dispositivo, con sus figuras y cambios sin confirmar.":"Tu borrador permanece en memoria, con sus figuras y cambios sin confirmar."):"Todavía no hay una copia local disponible. Puedes abrir la escena guardada."}</p>
      {entry&&<p>Último respaldo: <time dateTime={entry.updatedAt}>{new Date(entry.updatedAt).toLocaleString()}</time>.</p>}
      <p>Recuperar usa IndexedDB de este navegador. Abrir la escena guardada en el servidor conserva la copia local.</p>
      <div className="draft-actions">
        <button autoFocus disabled={busy||!(entry||memory||drafts.checkpoint)} onClick={()=>void recover()}>Recuperar borrador</button>
        <button disabled={busy} onClick={reloadMap}>Abrir escena guardada</button>
      </div>
      {(error||status.error)&&<p role="alert">{error||status.error}</p>}
      <details><summary>Más opciones</summary>
        <p role="status">{status.local}<br/>{status.remote}<br/>{status.confirmed}</p>
        <p>Se conserva solo la última copia de recuperación de cada escena. Los cambios nuevos reemplazan la anterior.</p>
        <p>Si la escena del servidor cambió o fue eliminada, tu trabajo se recuperará como una copia sin sobrescribirla. Los enlaces de esa copia se desconectan.</p>
        <button disabled={busy||!entry} onClick={()=>void run(async()=>download(await browser.localDrafts.raw(drafts.ownerId,drafts.origin,entry!.id)))}>Exportar copia local</button>
        <p>El respaldo contiene datos privados. Cerrar sesión explícitamente elimina las copias locales; la caducidad de sesión las conserva.</p>
        <button disabled={busy} onClick={()=>status.enabled?setDisable(true):void run(async()=>{await browser.localDrafts.setEnabled(drafts.ownerId,drafts.origin,true);drafts.setEnabled(true);await drafts.flushLocal();})}>{status.enabled?"Desactivar respaldo local":"Activar respaldo local"}</button>
        {disable&&<div><p>Se borrarán las copias locales de esta cuenta en este dispositivo. Exporta primero si quieres conservarlas.</p><button disabled={busy} onClick={()=>setDisable(false)}>Cancelar</button><button disabled={busy} onClick={()=>void run(async()=>{await browser.localDrafts.setEnabled(drafts.ownerId,drafts.origin,false);drafts.setEnabled(false);setDisable(false);setRefresh(n=>n+1);})}>Desactivar y borrar copias locales</button></div>}
      </details>
      <footer><button disabled={busy} onClick={leave}>Volver al arco</button></footer>
    </ServiceDialog>}
  </div>;
}
