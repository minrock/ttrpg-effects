import { DraftRecovery } from "./DraftRecovery";
import { createPortal } from "react-dom";
import { RotateCcw, Square, LayoutGrid } from "lucide-react";
import { HeaderDropdown } from "./HeaderDropdown";
import { useActiveOperation } from "./use-active-operation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { App } from "../renderer/src/App";
import { ClientProvider } from "../renderer/src/client/ClientProvider";
import { PortalTargetProvider } from "../renderer/src/client/PortalTarget";
import { createBrowserClient } from "../infrastructure/browser/browser-client";
import { contextualTableClient } from "../infrastructure/browser/contextual-table-client";
import { HttpTransport, ServiceError } from "../infrastructure/browser/http";
import { resolveCompiledModules } from "../domain/systems/system-catalog";
import { DialogBroker, DialogHost, ServiceDialog } from "./dialogs";
import { Participants } from "./Participants";
import { Mutations, gameReply, configurationReply, openingReply, versionSchema, ok, failureMessage, identitySchema, type OpeningReply } from "./service-model";
import type { ServiceWorkspace } from "./workspace";
import type { GameMetadata } from "../domain/games/game-metadata";
import type { ResolvedSystem, SystemVersion } from "../domain/systems/system-catalog";
import { campaignSelectionSchema, type CampaignSelection } from "../shared/contracts/campaigns";
import { CampaignClient } from "../infrastructure/browser/campaign-client";
import { CampaignSceneMenu } from "./CampaignSceneMenu";
import type { DraftCheckpoint } from "../domain/drafts/draft";
export type LeaveRegistration=(guard:()=>Promise<boolean>)=>()=>void;
export function GameEditor({http,gameId,active,expired,onExit,onExitAfterLeave=onExit,onLogout,registerLeave,headerSlot,editorHeaderSlot,selection: suppliedSelection,onSelectScene}:{http:HttpTransport;gameId:string;active:boolean;expired:()=>void;onExit:()=>void;onExitAfterLeave?:()=>void;onLogout:()=>Promise<void>;registerLeave:LeaveRegistration;headerSlot?:HTMLElement|null;editorHeaderSlot?:HTMLElement|null;selection?:CampaignSelection;onSelectScene?: (selection: CampaignSelection) => Promise<boolean>}){
  const[loaded,setLoaded]=useState<{game:GameMetadata;configuration:ResolvedSystem;version:SystemVersion}|null>(null),[opening,setOpening]=useState<OpeningReply|null>(null),[running,setRunning]=useState(false),[url,setUrl]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[confirmation,setConfirmation]=useState<"reopen"|"close"|"rotate"|null>(null),[terminal,setTerminal]=useState(""),[recoveryHandoff,setRecoveryHandoff]=useState<{checkpoint:DraftCheckpoint;selectionKey:string|null}|null>(null);
  const query=new URLSearchParams(location.search);
  const hasSelectionQuery=["campaignId","arcId","sceneId"].some(key=>query.has(key));
  const parsed=campaignSelectionSchema.safeParse({campaignId:query.get("campaignId"),arcId:query.get("arcId"),sceneId:query.get("sceneId")});
  const invalidSelection=(hasSelectionQuery&&(!parsed.success||parsed.data.campaignId!==gameId))||(!!suppliedSelection&&suppliedSelection.campaignId!==gameId);
  const selection=invalidSelection?undefined:(suppliedSelection??(parsed.success?parsed.data:undefined));
  const [selectionState,setSelectionState]=useState<{readonly state:"none"|"checking"|"valid"|"blocked"|"invalid";readonly key?:string|null;readonly name?:string;readonly message?:string}>(()=>invalidSelection?{state:"invalid",message:"La selección de escena de la URL no es válida para esta campaña."}:selection?{state:"checking",key:`${selection.campaignId}:${selection.arcId}:${selection.sceneId}`}:{state:"none"});
  const [reload, setReload] = useState(0);
  const [openRetry,setOpenRetry]=useState(0);
  const [selectionRetry,setSelectionRetry]=useState(0);
  const captureOperation=useActiveOperation(active&&!terminal);
  const captureAuthority=useActiveOperation(active);
  const openingContext=opening?.opening?`${opening.opening.id}:${opening.opening.generation}`:null;
  const liveContext=useRef<string|null>(null);
  const retiring=useRef<{context:string;terminal?:string}|null>(null);
  const selectionKey=selection?`${selection.campaignId}:${selection.arcId}:${selection.sceneId}`:null;
  const selectionKeyRef=useRef<string|null>(selectionKey);selectionKeyRef.current=selectionKey;
  const openingAttempt=useRef<string|null>(null);
  const closedForExit=useRef(false);
  useLayoutEffect(()=>{liveContext.current=active&&running?openingContext:null;if(!active)retiring.current=null;},[active,running,openingContext]);
  function beginRetirement(){const context=liveContext.current;if(context)retiring.current={context};}
  function finishRetirement(next:string|null){liveContext.current=next;retiring.current=null;}
  function failRetirement(){const pending=retiring.current;retiring.current=null;if(pending?.terminal&&liveContext.current===pending.context)setTerminal(pending.terminal);}

  useEffect(()=>{
    if(invalidSelection){setSelectionState({state:"invalid",message:"La selección de escena de la URL no es válida para esta campaña."});return;}
    if(!selection){setSelectionState({state:"none"});return;}
    let live=true;const client=new CampaignClient(http);
    setSelectionState({state:"checking",key:selectionKey});
    void (async()=>{
      try{
        const campaign=await client.getCampaign(selection.campaignId);
        if(campaign.state!=="active")throw new Error("La campaña está inactiva. Reactívala antes de abrir una mesa.");
        const arc=await client.getArc(selection.campaignId,selection.arcId);
        if(arc.campaignId!==selection.campaignId)throw new Error("El arco seleccionado no pertenece a esta campaña.");
        let offset=0,scene:import("../shared/contracts/campaigns").ArcSceneDto|undefined,total=0;
        do{const page=await client.listScenes(selection.campaignId,selection.arcId,{limit:100,offset});total=page.total;scene=page.items.find(item=>item.sceneId===selection.sceneId)??scene;offset+=page.items.length;}while(!scene&&offset<total);
        if(!scene)throw new Error("La escena seleccionada no pertenece a este arco.");
        if(scene.writeBlock)throw new Error("Esta escena está compartida con una campaña inactiva. Reactívala antes de abrir una mesa.");
        if(live)setSelectionState({state:"valid",key:selectionKey,name:scene.name});
      }catch(cause){if(live)setSelectionState({state:"blocked",key:selectionKey,message:failureMessage(cause)});}
    })();
    return()=>{live=false;client.clear();};
  },[http,invalidSelection,selection?.arcId,selection?.campaignId,selection?.sceneId,selectionKey,selectionRetry]);

  useEffect(()=>{if(!active||terminal){setUrl("");setConfirmation(null);setBusy(false);setError("");}},[active,terminal]);
  useEffect(()=>{if(!active)openingAttempt.current=null;},[active]);
  const mutations=useMemo(()=>new Mutations(http),[http]);const guard=useRef<()=>Promise<boolean>>(async()=>true);
  const localRegister=useMemo<LeaveRegistration>(()=>fn=>{guard.current=fn;const unregister=registerLeave(fn);return()=>{guard.current=async()=>true;unregister();};},[registerLeave]);
  useEffect(()=>{let live=true;void Promise.all([http.request(`/dm/games/${gameId}`,gameReply),http.request(`/dm/games/${gameId}/configuration`,configurationReply),http.request(`/dm/games/${gameId}/opening`,openingReply)]).then(async([g,c,o])=>{resolveCompiledModules(c.configuration.definition.manifest);const v=await http.request(`/dm/systems/${c.configuration.ref.systemId}/versions/${c.configuration.ref.version}`,z.object({ok,version:versionSchema}));if(live){setLoaded({game:g.game,configuration:c.configuration,version:v.version});setOpening(o);}}).catch(e=>{if(live)setError(failureMessage(e));});return()=>{live=false;};},[http,gameId,reload]);
  function discardAndReload() {
    if (!captureAuthority()()) return;
    // Desmontar el editor libera canvas, leases y suscripciones antes de leer
    // el contexto vigente; no pasar por reload/beforeunload con el borrador vivo.
    openingAttempt.current=null; finishRetirement(null); setRunning(false); setLoaded(null); setOpening(null);
    setTerminal(""); setUrl(""); setError(""); setConfirmation(null);
    setReload(value => value + 1);
  }
  async function resolveRejectedOpening(action:"continue"|"start", latest:OpeningReply, checkpoint:DraftCheckpoint, recoveryCurrent:()=>boolean, expectedSelection=selectionKey):Promise<boolean>{
    const current=captureOperation(),valid=()=>recoveryCurrent()&&current()&&selectionKeyRef.current===expectedSelection;
    if(!valid()||!loaded||busy)return false;setBusy(true);setError("");
    try{
      const expected=latest.opening?{id:latest.opening.id,generation:latest.opening.generation,revision:latest.opening.revision}:null;
      if(action==="start"){
        const [game,configuration]=await Promise.all([http.request(`/dm/games/${gameId}`,gameReply),http.request(`/dm/games/${gameId}/configuration`,configurationReply)]);
        if(!valid())return false;
        if(game.game.revision!==loaded.game.revision||configuration.configuration.hash!==loaded.configuration.hash)throw new Error("La partida o su configuración cambiaron. Comprueba el contexto antes de iniciar una apertura nueva.");
      }
      const result=action==="continue"
        ? await http.json(`/dm/games/${gameId}/opening/heartbeat`,openingReply,"POST",{openingId:latest.opening!.id,generation:latest.opening!.generation})
        : await mutations.send(`/dm/games/${gameId}/opening/start`,openingReply,"POST",{expectedOpening:expected},loaded.game.revision);
      if(!valid())return false;
      const actual=await http.request(`/dm/games/${gameId}/opening`,openingReply);
      if(!valid())return false;
      if(!actual.opening||actual.opening.id!==result.opening?.id||actual.opening.generation!==result.opening?.generation)throw new Error("La apertura cambió antes de continuar. Comprueba su estado otra vez.");
      setRecoveryHandoff({checkpoint,selectionKey:expectedSelection});setOpening(actual);setUrl(result.invitationUrl??"");setRunning(true);setTerminal("");return true;
    }catch(cause){if(valid())setError(failureMessage(cause));return false;}finally{if(valid())setBusy(false);}
  }
  async function start(reopen=false,expectedSelection=selectionKey){
    const current=captureOperation();if(!current()||!loaded||!opening||busy)return;setBusy(true);setError("");if(reopen)beginRetirement();
    try{const o=opening.opening;const r=await mutations.send(`/dm/games/${gameId}/opening/${reopen?"reopen":"start"}`,openingReply,"POST",{expectedOpening:o?{id:o.id,generation:o.generation,revision:o.revision}:null},loaded.game.revision);if(!current()||selectionKeyRef.current!==expectedSelection)return;const actual=await http.request(`/dm/games/${gameId}/opening`,openingReply);if(!current()||selectionKeyRef.current!==expectedSelection)return;if(actual.opening?.id!==r.opening?.id||actual.opening?.generation!==r.opening?.generation)throw new Error("El resultado corresponde a una apertura anterior. Revisa el estado actual.");finishRetirement(actual.opening?`${actual.opening.id}:${actual.opening.generation}`:null);setOpening(actual);setUrl(r.invitationUrl??"");setRunning(true);setTerminal("");setConfirmation(null);}catch(e){if(current()&&selectionKeyRef.current===expectedSelection){failRetirement();setError(failureMessage(e));}}finally{if(current())setBusy(false);}
  }
  async function continueGame(expectedSelection=selectionKey){
    const current=captureOperation();if(!current()||!opening?.opening||busy)return;setBusy(true);
    try{const r=await http.json(`/dm/games/${gameId}/opening/heartbeat`,openingReply,"POST",{openingId:opening.opening.id,generation:opening.opening.generation});if(current()&&selectionKeyRef.current===expectedSelection){setOpening(r);setRunning(true);setTerminal("");}}catch(e){if(current()&&selectionKeyRef.current===expectedSelection)setError(failureMessage(e));}finally{if(current())setBusy(false);}
  }
  useEffect(()=>{
    openingAttempt.current=null;
    setError("");
    setRecoveryHandoff(current=>current?.selectionKey===selectionKey?current:null);
  },[selectionKey]);
  useEffect(()=>{
    if(!selectionKey||selectionState.state!=="valid"||selectionState.key!==selectionKey||closedForExit.current||!active||terminal||running||busy||error||!loaded||!opening)return;
    const attempt=`${selectionKey}:${opening.status}:${opening.opening?.id??"none"}:${opening.opening?.generation??0}:${openRetry}`;
    if(openingAttempt.current===attempt)return;
    openingAttempt.current=attempt;
    if(opening.status==="fresh"||opening.status==="reconnecting")void continueGame(selectionKey);
    else void start(false,selectionKey);
  },[active,busy,error,loaded,openRetry,opening,running,selectionKey,selectionState.key,selectionState.state,terminal]);
  function retrySelectedScene(){
    openingAttempt.current=null;
    setError("");
    if(selectionState.state==="blocked"){setSelectionRetry(value=>value+1);return;}
    if(loaded&&opening)setOpenRetry(value=>value+1);
    else setReload(value=>value+1);
  }
  async function apply(){
    const current=captureOperation();if(!current()||!opening?.opening||!confirmation||busy)return;
    if(confirmation!=="rotate"&&!await guard.current())return;if(!current())return;
    if(confirmation==="reopen"){await start(true);return;}setBusy(true);
    const closing=confirmation==="close";if(closing)beginRetirement();
    try{const o=opening.opening;
      if(closing){await mutations.send(`/dm/games/${gameId}/opening/close`,z.undefined(),"POST",{openingId:o.id,generation:o.generation},o.revision);if(!current())return;}
      else{const r=await mutations.send(`/dm/games/${gameId}/invitation/rotate`,openingReply,"POST",{openingId:o.id,generation:o.generation,expectedInvitationVersion:opening.invitation?.version??0},o.revision);if(!current())return;setUrl(r.invitationUrl??"");}
      const latest=await http.request(`/dm/games/${gameId}/opening`,openingReply);
      if(current()){if(closing){finishRetirement(null);setRunning(false);setUrl("");setTerminal("");closedForExit.current=true;setConfirmation(null);onExitAfterLeave();return;}setOpening(latest);setConfirmation(null);}
    }catch(e){if(current()){if(closing)failRetirement();setError(failureMessage(e));}}finally{if(current())setBusy(false);}
  }

  async function requestAction(action:"close"|"reopen"|"rotate"){
    const current=captureOperation();if(!current()||busy)return;
    try{const latest=await http.request(`/dm/games/${gameId}/opening`,openingReply);if(current()){setOpening(latest);setConfirmation(action);}}catch(e){if(current())setError(failureMessage(e));}
  }
  function terminalReceived(reason:string,context:string|null){
    const authorized=captureAuthority();if(!authorized()||!context||liveContext.current!==context)return;
    // La cuenta sigue validándose durante un cierre propio. El terminal pertenece
    // a esa apertura: se difiere hasta conocer el resultado de la operación.
    void http.request("/identity/session",identitySchema).then(()=>{
      if(!authorized()||liveContext.current!==context)return;
      if(retiring.current?.context===context)retiring.current.terminal=reason;
      else setTerminal(reason);
    }).catch(()=>{if(authorized()&&liveContext.current===context)expired();});
  }
  const title=loaded?`${loaded.game.name} · ${loaded.configuration.ref.systemId} v${loaded.configuration.ref.version}`:"Cargando partida…";
  const [sceneMenuOpen,setSceneMenuOpen]=useState(false);
  const gameMenu = <div className="game-heading" onKeyDown={event=>event.stopPropagation()}>
    <HeaderDropdown title="Opciones de partida" label={<><span className="game-heading-title" title={title}>{title}</span></>} className="header-game" onOpenChange={setSceneMenuOpen}>
      <p className="header-dropdown-heading">Partida</p>
      <button onClick={()=>void guard.current().then(ok=>{if(ok)onExit();})}><LayoutGrid size={16} aria-hidden="true"/>Campañas</button>
      {loaded&&onSelectScene&&active&&!terminal&&<CampaignSceneMenu http={http} campaignId={gameId} currentSelection={selection} open={sceneMenuOpen} disabled={busy||confirmation!==null} onSelect={onSelectScene}/>}
      {running&&<><div className="header-dropdown-divider"/>
        <button disabled={busy} onClick={()=>void requestAction("reopen")}><RotateCcw size={16} aria-hidden="true"/>Reabrir partida</button>
        <button className="header-danger" disabled={busy} onClick={()=>void requestAction("close")}><Square size={16} aria-hidden="true"/>Cerrar partida</button>
      </>}
    </HeaderDropdown>
    {running&&<span className="header-live" title="Partida en curso"><i aria-hidden="true"/><span>En curso</span></span>}
    {loaded?.configuration.availability==="disabled"&&<span className="header-disabled" title="Deshabilitada para usos nuevos">Sistema deshabilitado</span>}
  </div>;
  const selectedFlow=hasSelectionQuery||selection!==undefined;
  const selectionValidated=selectionKey!==null&&selectionState.state==="valid"&&selectionState.key===selectionKey;
  const selectionPending=selectionKey!==null&&!selectionValidated&&(selectionState.key!==selectionKey||selectionState.state==="checking");
  const selectionBlocked=selectionState.state==="blocked"&&selectionState.key===selectionKey;
  const selectionInvalid=selectionState.state==="invalid";
  const canRenderLiveEditor=selectionValidated||(!hasSelectionQuery&&!selection&&!invalidSelection);
  const selectedFallback=<main className="service-page"><h1>{title}</h1>{terminal&&<p role="alert">{terminal==="replaced"?"Esta partida está abierta en otra pestaña.":terminal==="unavailable"?"Servicio no disponible. Reintenta explícitamente.":"Tu acceso a esta partida ya no está disponible."}</p>}{selectionPending&&<p className="campaign-selection-status" role="status">Validando la escena seleccionada…</p>}{selectionValidated&&!error&&<p className="campaign-selection-status" role="status">Abriendo {selectionState.name??"la escena"}…</p>}{(selectionBlocked||selectionInvalid)&&<p className="campaign-selection-status" role="alert">{selectionState.message}</p>}{error&&<p className="campaign-selection-status" role="alert">{error}</p>}{(error||selectionBlocked||selectionInvalid)&&<footer className="campaign-selection-actions">{(error||selectionBlocked)&&<button autoFocus disabled={busy} onClick={retrySelectedScene}>Reintentar</button>}<button type="button" onClick={onExit}>Volver al arco</button></footer>}</main>;
  const legacyFallback=<main className="service-page"><h1>{title}</h1>{terminal&&<p role="alert">{terminal==="replaced"?"Esta partida está abierta en otra pestaña.":terminal==="unavailable"?"Servicio no disponible. Reintenta explícitamente.":"Tu acceso a esta partida ya no está disponible."}</p>}<p>Iniciar abre la partida. Continuar conserva su generación. Publicar la escena es una acción posterior.</p>{opening&&<p>Estado del anfitrión: {opening.status==="fresh"?"Conectado":opening.status==="reconnecting"?"Reconectando":opening.status==="expired"?"Acceso caducado":"Sin apertura"}</p>}{loaded?.game.state==="ready"&&opening&&(opening.status==="fresh"||opening.status==="reconnecting"?<button disabled={busy} onClick={()=>void continueGame()}>Continuar partida</button>:<button disabled={busy} onClick={()=>void start()}>Iniciar partida</button>)}</main>;
  return <div className="game-shell">{headerSlot?createPortal(gameMenu,headerSlot):<header className="game-bar">{gameMenu}</header>}{running&&loaded&&opening?.opening&&canRenderLiveEditor?<LiveEditor key={`${opening.opening.id}:${opening.opening.generation}:${selection?.campaignId??"default"}:${selection?.arcId??"default"}:${selection?.sceneId??"default"}`} {...{http,gameId,active,expired,onLogout,opening,loaded,registerLeave:localRegister,url,editorHeaderSlot,selection}} selectionName={selectionValidated?selectionState.name:undefined} frozen={!!terminal} onExit={onExit} onDiscard={discardAndReload} onInvitation={setUrl} onRotate={()=>void requestAction("rotate")} onTerminal={reason=>terminalReceived(reason,openingContext)} handoff={recoveryHandoff?.selectionKey===selectionKey?recoveryHandoff.checkpoint:null} onHandoffConsumed={()=>setRecoveryHandoff(null)} onRejectedOpening={resolveRejectedOpening}/>:selectedFlow?selectedFallback:legacyFallback}{active&&terminal&&running&&<ServiceDialog title="Borrador conservado" onCancel={()=>{}}><p>{terminal==="replaced"?"Esta partida está abierta en otra pestaña.":terminal==="unavailable"?"El servicio no está disponible.":"El acceso a esta apertura terminó."} La mesa se ha detenido. Tu borrador permanece en memoria hasta que decidas descartarlo.</p><button onClick={()=>{openingAttempt.current=null;closedForExit.current=true;setRunning(false);setTerminal("");onExitAfterLeave();}}>Descartar borrador y volver a la partida</button></ServiceDialog>}{error&&!selectedFlow&&<p className="service-floating-error" role="alert">{error}</p>}{active&&!terminal&&confirmation&&<ServiceDialog title={{close:"Cerrar partida",reopen:"Reabrir partida",rotate:"Crear enlace nuevo"}[confirmation]} onCancel={()=>{if(!busy)setConfirmation(null);}}><p>{title}</p><p>{confirmation==="rotate"?"El enlace anterior dejará de admitir. Los participantes actuales continúan.":"Termina el acceso de los participantes actuales. Reabrir crea otra apertura e invitación."}</p><p role="alert">{error}</p><footer><button autoFocus disabled={busy} onClick={()=>setConfirmation(null)}>Cancelar</button><button disabled={busy} onClick={()=>void apply()}>Confirmar</button></footer></ServiceDialog>}</div>;
}
type RevalidationFailure={phase:"context"|"document"|"opening";message:string;retryable:boolean;retryAt:number;status:number};
type OpeningResolution={state:"checking"|"continue"|"start"|"foreign"|"failed";latest?:OpeningReply;message?:string};
export function LiveEditor({http,gameId,active,frozen,expired,onLogout,opening,loaded,registerLeave,url,onInvitation,onRotate,onTerminal,onDiscard,onExit,editorHeaderSlot,selection,selectionName,handoff,onHandoffConsumed,onRejectedOpening}:{http:HttpTransport;gameId:string;active:boolean;frozen:boolean;expired:()=>void;onLogout:()=>Promise<void>;opening:OpeningReply;loaded:{game:GameMetadata;configuration:ResolvedSystem;version:SystemVersion};registerLeave:LeaveRegistration;url:string;onInvitation:(url:string)=>void;onRotate:()=>void;onTerminal:(reason:string)=>void;onDiscard:()=>void;onExit:()=>void;editorHeaderSlot?:HTMLElement|null;selection?:CampaignSelection;selectionName?:string;handoff?:DraftCheckpoint|null;onHandoffConsumed?:()=>void;onRejectedOpening?:(action:"continue"|"start",latest:OpeningReply,checkpoint:DraftCheckpoint,isCurrent:()=>boolean)=>Promise<boolean>}){
  const[selectedSceneReady,setSelectedSceneReady]=useState(!selection),[validating,setValidating]=useState(true),[resumeError,setResumeError]=useState<RevalidationFailure|null>(null),[attempt,setAttempt]=useState(0),[clock,setClock]=useState(Date.now()),[signal,setSignal]=useState(0),[feedback,setFeedback]=useState(""),[portal,setPortal]=useState<HTMLDivElement|null>(null),[openingResolution,setOpeningResolution]=useState<OpeningResolution|null>(null),[openingCheck,setOpeningCheck]=useState(0);
  const callbacks=useRef({expired,onTerminal});callbacks.current={expired,onTerminal};
  const broker=useMemo(()=>new DialogBroker(),[]);
  const waitingForSelectedScene=!!selection&&!selectedSceneReady;
  useLayoutEffect(()=>{broker.setActive(active&&!frozen&&!validating&&!resumeError&&!waitingForSelectedScene);return()=>broker.setActive(false);},[broker,active,frozen,validating,resumeError,waitingForSelectedScene]);
  const resources=useMemo(()=>{const value=new HttpTransport(fetch,()=>callbacks.current.expired(),"/api/v1/dm");if(http.accountId)value.bindAccount(http.accountId);return value;},[http]);
  const table=useMemo(()=>contextualTableClient({gameId,openingId:opening.opening!.id,generation:opening.opening!.generation,audience:"dm",accountId:resources.accountId},reason=>callbacks.current.onTerminal(reason),fetch,()=>setSignal(n=>n+1)),[gameId,opening.opening!.id,opening.opening!.generation,resources]);
  const browser=useMemo(()=>createBrowserClient(resources,broker,undefined,{gameId,arcId:selection?.arcId,configuration:loaded.configuration,version:loaded.version,table}),[resources,broker,gameId,loaded,selection?.arcId,table]);
  const headerEnabled=active&&!frozen&&!validating&&!resumeError&&!waitingForSelectedScene;
  useEffect(()=>{browser.drafts?.setActive(active&&!frozen&&!resumeError&&!waitingForSelectedScene);return()=>browser.drafts?.setActive(false);},[browser,active,frozen,resumeError,waitingForSelectedScene]);
  useEffect(()=>{setSelectedSceneReady(!selection);},[selection?.sceneId]);
  const workspace=useMemo<ServiceWorkspace>(()=>({headerTarget:editorHeaderSlot,headerEnabled,browser,confirmLeave:broker.leave,logout:onLogout,registerLeave,defaultDiagonalMode:loaded.configuration.definition.rules.defaultDiagonalMode,campaignSelection:selection,sceneLoading:waitingForSelectedScene}),[browser,broker,onLogout,registerLeave,loaded,editorHeaderSlot,headerEnabled,waitingForSelectedScene]);
  const status=useSyncExternalStore(table.subscribeStatus,table.getStatus);
  useEffect(()=>{
    if (!active || frozen || !resumeError?.retryable || resumeError.retryAt <= Date.now()) return;
    const timer = setInterval(() => { const now = Date.now(); setClock(now); if (now >= resumeError.retryAt) clearInterval(timer); }, 250);
    return () => clearInterval(timer);
  },[active,frozen,resumeError]);
  useEffect(()=>{
    if(!active||frozen){setValidating(true);setResumeError(null);resources.invalidate();table.clear();broker.finish(null);return;}
    resources.resume();setValidating(true);setResumeError(null);let stop=()=>{};let live=true;let timer:ReturnType<typeof setInterval>|undefined;
    const contact=()=>http.json(`/dm/games/${gameId}/opening/heartbeat`,openingReply,"POST",{openingId:opening.opening!.id,generation:opening.opening!.generation});
    void (async()=>{
      let g,c;try{[g,c]=await Promise.all([http.request(`/dm/games/${gameId}`,gameReply),http.request(`/dm/games/${gameId}/configuration`,configurationReply)]);}catch(cause){throw {phase:"context" as const,cause};}
      if(g.game.state!=="ready"||c.configuration.hash!==loaded.configuration.hash)throw {phase:"context" as const,cause:new ServiceError("REVISION_CONFLICT","La partida cambió mientras la sesión estaba cerrada. Conserva tu borrador y revisa el contexto antes de continuar.",409)};
      if (!live) return;
      try{await browser.revalidate();}catch(cause){throw {phase:"document" as const,cause};} if (!live) return;
      try{await contact();}catch(cause){throw {phase:"opening" as const,cause};}
      if(live){setValidating(false);stop=table.start("dm");timer=setInterval(()=>{void contact().catch(e=>{if(live)setFeedback(failureMessage(e));});},10000);}
    })().catch(value=>{if(live){const now=Date.now(),phase=value?.phase??"context",cause=value?.cause??value,error=cause instanceof ServiceError?cause:null;setClock(now);setResumeError({phase,message:failureMessage(cause),status:error?.status??0,retryable:!error||error.status===0||error.status===429||error.status>=500,retryAt:now+(error?.retryAfter??0)*1000});}});
    return()=>{live=false;clearInterval(timer);stop();};
  },[active,frozen,resources,table,http,gameId,opening.opening!.id,opening.opening!.generation,broker,browser,loaded.configuration.hash,attempt]);
  useEffect(()=>{
    if(!active||frozen||resumeError?.phase!=="opening"||resumeError.status!==409){setOpeningResolution(null);return;}
    let live=true;setOpeningResolution({state:"checking"});
    void http.request(`/dm/games/${gameId}/opening`,openingReply).then(latest=>{
      if(!live)return;
      const current=latest.opening;
      if(current?.id===opening.opening!.id&&current.generation===opening.opening!.generation&&(latest.status==="fresh"||latest.status==="reconnecting"))setOpeningResolution({state:"continue",latest});
      else if(!current||latest.status==="expired"||latest.status==="absent"||current.state==="closed")setOpeningResolution({state:"start",latest});
      else setOpeningResolution({state:"foreign",message:"La apertura vigente pertenece a otra sesión. No se adoptará automáticamente."});
    }).catch(cause=>{if(live)setOpeningResolution({state:"failed",message:failureMessage(cause)});});
    return()=>{live=false;};
  },[active,frozen,http,gameId,opening.opening,openingCheck,resumeError?.phase,resumeError?.status]);
  useEffect(()=>()=>{browser.clear();broker.finish(null);},[browser,broker]);
  const openingRecovery=resumeError?.phase==="opening"&&resumeError.status===409?{
    state:openingResolution?.state??"checking" as const,
    message:openingResolution?.state==="failed"?openingResolution.message??resumeError.message:resumeError.message,
    onRetry:()=>setOpeningCheck(value=>value+1),
    onAction:async(action:"continue"|"start",checkpoint:DraftCheckpoint,isCurrent:()=>boolean)=>openingResolution?.latest&&onRejectedOpening?onRejectedOpening(action,openingResolution.latest,checkpoint,isCurrent):false
  }:undefined;
  const tablePanel = <aside hidden={validating||frozen} className="service-table-status service-table-status--sidebar" onKeyDown={e=>e.stopPropagation()}><span className="service-live-message" role="status">{status.phase==="connected"?(status.published?"Escena publicada":"Vuelve a publicar la escena"):"Mesa desconectada. Reconectando…"}</span><span className="service-live-message" role="alert">{status.error}</span><details><summary>Mesa · {status.presence?.count??0} jugadores · {status.phase==="connected"?"Conectada":"Reconectando"}</summary><p role="status">{status.published?"Escena publicada":"Vuelve a publicar la escena. El estado visual no persiste en el servidor."}</p><button onClick={()=>void browser.associateCurrent().then(()=>setFeedback("Escena guardada asociada. Ya puedes publicarla.")).catch(e=>setFeedback(failureMessage(e)))}>Asociar escena guardada a la partida</button><label>Enlace vigente<input readOnly value={url} placeholder="Crea un enlace nuevo para compartir" onFocus={e=>e.target.select()}/></label><button disabled={!url} onClick={()=>void navigator.clipboard.writeText(url).then(()=>setFeedback("Enlace copiado.")).catch(()=>setFeedback("Selecciona el enlace y cópialo manualmente."))}>Copiar enlace</button><button onClick={onRotate}>Crear enlace nuevo</button><p role="status">{feedback}</p><p role="alert">{status.error}</p>{active&&!validating&&!frozen&&!resumeError&&<Participants {...{http,gameId,opening,signal,onInvitation}} gameName={loaded.game.name}/>}</details></aside>;
  return <>{browser.drafts&&<DraftRecovery browser={browser} gameId={gameId} active={active&&!frozen} conflict={!!resumeError&&!resumeError.retryable&&!openingRecovery} openingRecovery={openingRecovery} handoff={handoff} onHandoffConsumed={onHandoffConsumed} selectedSceneId={selection?.sceneId} selectedSceneName={selectionName} onExit={onExit} onRecovered={()=>{setSelectedSceneReady(true);if(handoff||resumeError?.phase!=="opening"){setOpeningResolution(null);setResumeError(null);setAttempt(n=>n+1);}}}/>}<div className="service-workspace" hidden={validating||frozen||waitingForSelectedScene} inert={validating||frozen||!!resumeError||waitingForSelectedScene}><div ref={setPortal}/>{portal&&<PortalTargetProvider target={portal}><ClientProvider client={browser.client}><App service={workspace} tablePanel={tablePanel}/></ClientProvider><DialogHost broker={broker} browser={browser} active={active&&!frozen&&!validating&&!resumeError&&!waitingForSelectedScene}/></PortalTargetProvider>}</div>{waitingForSelectedScene&&!frozen&&<p role="status">Cargando la escena seleccionada…</p>}{validating&&!frozen&&!resumeError&&<p role="status">Comprobando la partida y sus revisiones…</p>}{active&&resumeError&&!frozen&&(!browser.drafts||resumeError.retryable)&&<ServiceDialog title={resumeError.retryable?"No se pudo comprobar la partida":"Borrador retenido en conflicto"} onCancel={onExit}><p>{resumeError.message}</p><p>El borrador permanece en memoria. Recupera una copia o vuelve al arco.</p>{resumeError.retryable&&<button autoFocus disabled={clock<resumeError.retryAt} onClick={()=>{if(Date.now()>=resumeError.retryAt)setAttempt(n=>n+1);}}>{clock<resumeError.retryAt?`Reintentar en ${Math.ceil((resumeError.retryAt-clock)/1000)} segundos`:"Reintentar comprobación"}</button>}<button onClick={onDiscard}>Descartar borrador y recargar</button><button onClick={onExit}>Volver al arco</button></ServiceDialog>}</>;
}
