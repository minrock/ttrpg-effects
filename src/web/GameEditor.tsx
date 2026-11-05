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
export type LeaveRegistration=(guard:()=>Promise<boolean>)=>()=>void;
export function GameEditor({http,gameId,active,expired,onExit,onLogout,registerLeave,headerSlot,editorHeaderSlot}:{http:HttpTransport;gameId:string;active:boolean;expired:()=>void;onExit:()=>void;onLogout:()=>Promise<void>;registerLeave:LeaveRegistration;headerSlot?:HTMLElement|null;editorHeaderSlot?:HTMLElement|null}){
  const[loaded,setLoaded]=useState<{game:GameMetadata;configuration:ResolvedSystem;version:SystemVersion}|null>(null),[opening,setOpening]=useState<OpeningReply|null>(null),[running,setRunning]=useState(false),[url,setUrl]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[confirmation,setConfirmation]=useState<"reopen"|"close"|"rotate"|null>(null),[terminal,setTerminal]=useState("");
  const captureOperation=useActiveOperation(active&&!terminal);
  const captureAuthority=useActiveOperation(active);
  const openingContext=opening?.opening?`${opening.opening.id}:${opening.opening.generation}`:null;
  const liveContext=useRef<string|null>(null);
  const retiring=useRef<{context:string;terminal?:string}|null>(null);
  useLayoutEffect(()=>{liveContext.current=active&&running?openingContext:null;if(!active)retiring.current=null;},[active,running,openingContext]);
  function beginRetirement(){const context=liveContext.current;if(context)retiring.current={context};}
  function finishRetirement(next:string|null){liveContext.current=next;retiring.current=null;}
  function failRetirement(){const pending=retiring.current;retiring.current=null;if(pending?.terminal&&liveContext.current===pending.context)setTerminal(pending.terminal);}

  useEffect(()=>{if(!active||terminal){setUrl("");setConfirmation(null);setBusy(false);setError("");}},[active,terminal]);
  const mutations=useMemo(()=>new Mutations(http),[http]);const guard=useRef<()=>Promise<boolean>>(async()=>true);
  const localRegister=useMemo<LeaveRegistration>(()=>fn=>{guard.current=fn;const unregister=registerLeave(fn);return()=>{guard.current=async()=>true;unregister();};},[registerLeave]);
  useEffect(()=>{let live=true;void Promise.all([http.request(`/dm/games/${gameId}`,gameReply),http.request(`/dm/games/${gameId}/configuration`,configurationReply),http.request(`/dm/games/${gameId}/opening`,openingReply)]).then(async([g,c,o])=>{resolveCompiledModules(c.configuration.definition.manifest);const v=await http.request(`/dm/systems/${c.configuration.ref.systemId}/versions/${c.configuration.ref.version}`,z.object({ok,version:versionSchema}));if(live){setLoaded({game:g.game,configuration:c.configuration,version:v.version});setOpening(o);}}).catch(e=>{if(live)setError(failureMessage(e));});return()=>{live=false;};},[http,gameId]);
  async function start(reopen=false){
    const current=captureOperation();if(!current()||!loaded||!opening||busy)return;setBusy(true);setError("");if(reopen)beginRetirement();
    try{const o=opening.opening;const r=await mutations.send(`/dm/games/${gameId}/opening/${reopen?"reopen":"start"}`,openingReply,"POST",{expectedOpening:o?{id:o.id,generation:o.generation,revision:o.revision}:null},loaded.game.revision);if(!current())return;const actual=await http.request(`/dm/games/${gameId}/opening`,openingReply);if(!current())return;if(actual.opening?.id!==r.opening?.id||actual.opening?.generation!==r.opening?.generation)throw new Error("El resultado corresponde a una apertura anterior. Revisa el estado actual.");finishRetirement(actual.opening?`${actual.opening.id}:${actual.opening.generation}`:null);setOpening(actual);setUrl(r.invitationUrl??"");setRunning(true);setTerminal("");setConfirmation(null);}catch(e){if(current()){failRetirement();setError(failureMessage(e));}}finally{if(current())setBusy(false);}
  }
  async function continueGame(){
    const current=captureOperation();if(!current()||!opening?.opening||busy)return;setBusy(true);
    try{const r=await http.json(`/dm/games/${gameId}/opening/heartbeat`,openingReply,"POST",{openingId:opening.opening.id,generation:opening.opening.generation});if(current()){setOpening(r);setRunning(true);setTerminal("");}}catch(e){if(current())setError(failureMessage(e));}finally{if(current())setBusy(false);}
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
      if(current()){if(closing){finishRetirement(null);setRunning(false);setUrl("");setTerminal("");}setOpening(latest);setConfirmation(null);}
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
  const gameMenu = <div className="game-heading" onKeyDown={event=>event.stopPropagation()}>
    <HeaderDropdown title="Opciones de partida" label={<><span className="game-heading-title" title={title}>{title}</span></>} className="header-game">
      <p className="header-dropdown-heading">Partida</p>
      <button onClick={()=>void guard.current().then(ok=>{if(ok)onExit();})}><LayoutGrid size={16} aria-hidden="true"/>Partidas</button>
      {running&&<><div className="header-dropdown-divider"/>
        <button disabled={busy} onClick={()=>void requestAction("reopen")}><RotateCcw size={16} aria-hidden="true"/>Reabrir partida</button>
        <button className="header-danger" disabled={busy} onClick={()=>void requestAction("close")}><Square size={16} aria-hidden="true"/>Cerrar partida</button>
      </>}
    </HeaderDropdown>
    {running&&<span className="header-live" title="Partida en curso"><i aria-hidden="true"/><span>En curso</span></span>}
    {loaded?.configuration.availability==="disabled"&&<span className="header-disabled" title="Deshabilitada para usos nuevos">Sistema deshabilitado</span>}
  </div>;
  return <div className="game-shell">{headerSlot?createPortal(gameMenu,headerSlot):<header className="game-bar">{gameMenu}</header>}{running&&loaded&&opening?.opening?<LiveEditor key={`${opening.opening.id}:${opening.opening.generation}`} {...{http,gameId,active,expired,onLogout,opening,loaded,registerLeave:localRegister,url,editorHeaderSlot}} frozen={!!terminal} onInvitation={setUrl} onRotate={()=>void requestAction("rotate")} onTerminal={reason=>terminalReceived(reason,openingContext)}/>:<main className="service-page"><h1>{title}</h1>{terminal&&<p role="alert">{terminal==="replaced"?"Esta partida está abierta en otra pestaña.":terminal==="unavailable"?"Servicio no disponible. Reintenta explícitamente.":"Tu acceso a esta partida ya no está disponible."}</p>}<p>Iniciar abre la partida. Continuar conserva su generación. Publicar la escena es una acción posterior.</p>{opening&&<p>Estado del anfitrión: {opening.status==="fresh"?"Conectado":opening.status==="reconnecting"?"Reconectando":opening.status==="expired"?"Acceso caducado":"Sin apertura"}</p>}{loaded?.game.state==="ready"&&opening&&(opening.status==="fresh"||opening.status==="reconnecting"?<button disabled={busy} onClick={()=>void continueGame()}>Continuar partida</button>:<button disabled={busy} onClick={()=>void start()}>Iniciar partida</button>)}</main>}{active&&terminal&&running&&<ServiceDialog title="Borrador conservado" onCancel={()=>{}}><p>{terminal==="replaced"?"Esta partida está abierta en otra pestaña.":terminal==="unavailable"?"El servicio no está disponible.":"El acceso a esta apertura terminó."} La mesa se ha detenido. Tu borrador permanece en memoria hasta que decidas descartarlo.</p><button onClick={()=>{setRunning(false);setTerminal("");}}>Descartar borrador y volver a la partida</button></ServiceDialog>}{error&&<p className="service-floating-error" role="alert">{error}</p>}{active&&!terminal&&confirmation&&<ServiceDialog title={{close:"Cerrar partida",reopen:"Reabrir partida",rotate:"Crear enlace nuevo"}[confirmation]} onCancel={()=>{if(!busy)setConfirmation(null);}}><p>{title}</p><p>{confirmation==="rotate"?"El enlace anterior dejará de admitir. Los participantes actuales continúan.":"Termina el acceso de los participantes actuales. Reabrir crea otra apertura e invitación."}</p><p role="alert">{error}</p><footer><button autoFocus disabled={busy} onClick={()=>setConfirmation(null)}>Cancelar</button><button disabled={busy} onClick={()=>void apply()}>Confirmar</button></footer></ServiceDialog>}</div>;
}
export function LiveEditor({http,gameId,active,frozen,expired,onLogout,opening,loaded,registerLeave,url,onInvitation,onRotate,onTerminal,editorHeaderSlot}:{http:HttpTransport;gameId:string;active:boolean;frozen:boolean;expired:()=>void;onLogout:()=>Promise<void>;opening:OpeningReply;loaded:{game:GameMetadata;configuration:ResolvedSystem;version:SystemVersion};registerLeave:LeaveRegistration;url:string;onInvitation:(url:string)=>void;onRotate:()=>void;onTerminal:(reason:string)=>void;editorHeaderSlot?:HTMLElement|null}){
  const[validating,setValidating]=useState(true),[resumeError,setResumeError]=useState<{message:string;retryable:boolean;retryAt:number}|null>(null),[attempt,setAttempt]=useState(0),[clock,setClock]=useState(Date.now()),[signal,setSignal]=useState(0),[feedback,setFeedback]=useState(""),[portal,setPortal]=useState<HTMLDivElement|null>(null);
  const callbacks=useRef({expired,onTerminal});callbacks.current={expired,onTerminal};
  const broker=useMemo(()=>new DialogBroker(),[]);
  useLayoutEffect(()=>{broker.setActive(active&&!frozen&&!validating&&!resumeError);return()=>broker.setActive(false);},[broker,active,frozen,validating,resumeError]);
  const resources=useMemo(()=>{const value=new HttpTransport(fetch,()=>callbacks.current.expired(),"/api/v1/dm");if(http.accountId)value.bindAccount(http.accountId);return value;},[http]);
  const table=useMemo(()=>contextualTableClient({gameId,openingId:opening.opening!.id,generation:opening.opening!.generation,audience:"dm",accountId:resources.accountId},reason=>callbacks.current.onTerminal(reason),fetch,()=>setSignal(n=>n+1)),[gameId,opening.opening!.id,opening.opening!.generation,resources]);
  const browser=useMemo(()=>createBrowserClient(resources,broker,undefined,{gameId,configuration:loaded.configuration,version:loaded.version,table}),[resources,broker,gameId,loaded,table]);
  const headerEnabled=active&&!frozen&&!validating&&!resumeError;
  const workspace=useMemo<ServiceWorkspace>(()=>({headerTarget:editorHeaderSlot,headerEnabled,browser,confirmLeave:broker.leave,logout:onLogout,registerLeave,defaultDiagonalMode:loaded.configuration.definition.rules.defaultDiagonalMode}),[browser,broker,onLogout,registerLeave,loaded,editorHeaderSlot,headerEnabled]);
  const status=useSyncExternalStore(table.subscribeStatus,table.getStatus);
  useEffect(()=>{if(!resumeError?.retryAt)return;const timer=setInterval(()=>setClock(Date.now()),250);return()=>clearInterval(timer);},[resumeError]);
  useEffect(()=>{
    if(!active||frozen){setValidating(true);setResumeError(null);resources.invalidate();table.clear();broker.finish(null);return;}
    resources.resume();setValidating(true);setResumeError(null);let stop=()=>{};let live=true;let timer:ReturnType<typeof setInterval>|undefined;
    const contact=()=>http.json(`/dm/games/${gameId}/opening/heartbeat`,openingReply,"POST",{openingId:opening.opening!.id,generation:opening.opening!.generation});
    void (async()=>{
      const [g,c]=await Promise.all([http.request(`/dm/games/${gameId}`,gameReply),http.request(`/dm/games/${gameId}/configuration`,configurationReply)]);
      if(g.game.state!=="ready"||c.configuration.hash!==loaded.configuration.hash)throw new ServiceError("REVISION_CONFLICT","La partida cambió mientras la sesión estaba cerrada. Conserva tu borrador y revisa el contexto antes de continuar.",409);
      await browser.revalidate();await contact();
      if(live){setValidating(false);stop=table.start("dm");timer=setInterval(()=>{void contact().catch(e=>{if(live)setFeedback(failureMessage(e));});},10000);}
    })().catch(e=>{if(live)setResumeError({message:failureMessage(e),retryable:!(e instanceof ServiceError)||e.status===0||e.status===429||e.status>=500,retryAt:Date.now()+(e instanceof ServiceError?e.retryAfter:0)*1000});});
    return()=>{live=false;clearInterval(timer);stop();};
  },[active,frozen,resources,table,http,gameId,opening.opening!.id,opening.opening!.generation,broker,browser,loaded.configuration.hash,attempt]);
  useEffect(()=>()=>{browser.clear();broker.finish(null);},[browser,broker]);
  const tablePanel = <aside hidden={validating||frozen} className="service-table-status service-table-status--sidebar" onKeyDown={e=>e.stopPropagation()}><span className="service-live-message" role="status">{status.phase==="connected"?(status.published?"Escena publicada":"Vuelve a publicar la escena"):"Mesa desconectada. Reconectando…"}</span><span className="service-live-message" role="alert">{status.error}</span><details><summary>Mesa · {status.presence?.count??0} jugadores · {status.phase==="connected"?"Conectada":"Reconectando"}</summary><p role="status">{status.published?"Escena publicada":"Vuelve a publicar la escena. El estado visual no persiste en el servidor."}</p><button onClick={()=>void browser.associateCurrent().then(()=>setFeedback("Escena guardada asociada. Ya puedes publicarla.")).catch(e=>setFeedback(failureMessage(e)))}>Asociar escena guardada a la partida</button><label>Enlace vigente<input readOnly value={url} placeholder="Crea un enlace nuevo para compartir" onFocus={e=>e.target.select()}/></label><button disabled={!url} onClick={()=>void navigator.clipboard.writeText(url).then(()=>setFeedback("Enlace copiado.")).catch(()=>setFeedback("Selecciona el enlace y cópialo manualmente."))}>Copiar enlace</button><button onClick={onRotate}>Crear enlace nuevo</button><p role="status">{feedback}</p><p role="alert">{status.error}</p>{active&&!validating&&!frozen&&!resumeError&&<Participants {...{http,gameId,opening,signal,onInvitation}} gameName={loaded.game.name}/>}</details></aside>;
  return <><div className="service-workspace" hidden={validating||frozen} inert={validating||frozen||!!resumeError}><div ref={setPortal}/>{portal&&<PortalTargetProvider target={portal}><ClientProvider client={browser.client}><App service={workspace} tablePanel={tablePanel}/></ClientProvider><DialogHost broker={broker} browser={browser} active={active&&!frozen&&!validating&&!resumeError}/></PortalTargetProvider>}</div>{validating&&!frozen&&!resumeError&&<p role="status">Comprobando la partida y sus revisiones…</p>}{active&&resumeError&&!frozen&&<ServiceDialog title={resumeError.retryable?"No se pudo comprobar la partida":"Borrador retenido en conflicto"} onCancel={()=>{}}><p>{resumeError.message}</p><p>El borrador permanece protegido en memoria.</p>{resumeError.retryable&&<button autoFocus disabled={clock<resumeError.retryAt} onClick={()=>{if(Date.now()>=resumeError.retryAt)setAttempt(n=>n+1);}}>{clock<resumeError.retryAt?`Reintentar en ${Math.ceil((resumeError.retryAt-clock)/1000)} segundos`:"Reintentar comprobación"}</button>}<button onClick={()=>location.reload()}>Descartar borrador y recargar</button></ServiceDialog>}</>;
}
