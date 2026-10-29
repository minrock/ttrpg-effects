import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { z } from "zod";
import { App } from "../renderer/src/App";
import { PlayerApp } from "../renderer/src/PlayerApp";
import { PortalTargetProvider } from "../renderer/src/client/PortalTarget";
import { ClientProvider } from "../renderer/src/client/ClientProvider";
import { createClient } from "../shared/api/client";
import type { ServiceRole } from "../shared/contracts/http-api";
import { createBrowserClient } from "../infrastructure/browser/browser-client";
import { HttpTransport, ServiceError, sessionSchema } from "../infrastructure/browser/http";
import { DialogBroker, DialogHost } from "./dialogs";
export function ServiceApp() {
  const [linkFeedback,setLinkFeedback]=useState("");
  const [role,setRole]=useState<ServiceRole|null>(null),[checking,setChecking]=useState(true),[expired,setExpired]=useState(false),[error,setError]=useState(""),[key,setKey]=useState(""),[requestedRole,setRequestedRole]=useState<ServiceRole>(new URLSearchParams(location.search).get("view")==="player"?"player":"dm"),[pending,setPending]=useState(false),[retry,setRetry]=useState(0);
  const [portalTarget,setPortalTarget]=useState<HTMLDivElement|null>(null);
  const broker=useMemo(()=>new DialogBroker(),[]);
  const http=useMemo(()=>new HttpTransport(fetch,()=>{broker.finish(null);setExpired(true);setError("Tu sesión expiró. Los cambios permanecen en memoria. Accede como DM para recuperarlos.");}),[broker]);
  const browser=useMemo(()=>createBrowserClient(http,broker),[http,broker]);
  const playerClient=useMemo(()=>createClient(browser.client.api,{scenes:false,images:true,libraries:false,player:true,dice:true,nativeMenus:false},"service"),[browser]);
  const tableStatus = useSyncExternalStore(browser.table.subscribeStatus, browser.table.getStatus);
  useEffect(() => { if (role && !expired && !checking) return browser.table.start(role); }, [browser, role, expired, checking]);
  useEffect(()=>{let live=true;setChecking(true);void http.request("/auth/session",sessionSchema).then(session=>{if(live){setRole(session.role);http.resume();setError("");}}).catch(error=>{if(live){setRole(null);setError(error instanceof ServiceError&&error.status===401?"":error.message);}}).finally(()=>{if(live)setChecking(false);});return()=>{live=false;};},[http,retry]);
  useEffect(()=>()=>{browser.clear();broker.finish(null);},[browser,broker]);
  const workspace=useMemo(()=>({browser,confirmLeave:broker.leave,logout:async()=>{
    // Primero confirmar revocación: si la red falla no se afirma un cierre exitoso.
    await http.json("/auth/logout",z.undefined(),"POST");browser.clear();broker.finish(null);setRole(null);setExpired(false);setError("");
  }}),[browser,broker,http]);
  async function login(event:FormEvent) {
    event.preventDefault();setPending(true);setError("");const submittedKey=key;setKey("");
    try {
      const session=await http.json("/auth/login",sessionSchema,"POST",{key:submittedKey});
      if(session.role!==(expired?role:requestedRole)){await http.json("/auth/logout",z.undefined(),"POST");throw new Error("La clave no corresponde al rol seleccionado. Usa la clave adecuada.");}
      http.resume();setRole(session.role);setExpired(false);
    }catch(error){setError(error instanceof Error?error.message:"No se pudo acceder.");}finally{setPending(false);}
  }
  const access=checking||role===null||expired;
  const connectionMessage = tableStatus.phase !== "connected" ? "Mesa desconectada. Reconectando… La vista está desactualizada." : role === "dm"
    ? `Proyección ${tableStatus.published ? "publicada" : "sin publicar"}. ${tableStatus.presence?.ready ? "Jugador listo" : tableStatus.presence?.imageStatus === "error" ? "Error de imagen" : tableStatus.presence?.count ? "Jugador conectado / cargando" : "Esperando jugador"}.`
    : tableStatus.published ? "Mesa conectada." : "Esperando al DM.";
  return <>
    {role==="dm"&&<div className="service-workspace" hidden={access} inert={access}><div ref={setPortalTarget}/>{portalTarget&&<PortalTargetProvider target={portalTarget}><ClientProvider client={browser.client}><App service={workspace}/></ClientProvider></PortalTargetProvider>}</div>}
    {role==="player"&&!access&&<div className="service-player-workspace"><ClientProvider client={playerClient}><PlayerApp key={tableStatus.published?"published":"waiting"} unavailableMessage={tableStatus.phase === "disconnected" ? "Mesa desconectada. Reconectando…" : "Esperando al DM"}/></ClientProvider><button className="service-player-logout" onClick={()=>void workspace.logout().catch(error=>setError(error.message))}>Cerrar sesión</button></div>}
    {role && !access && <aside className={`service-table-status${role === "player" ? " service-table-status--player" : ""}`} onKeyDown={event=>event.stopPropagation()}>
      <span className="service-live-message" role="status" aria-live="polite" aria-atomic="true">{connectionMessage}</span>
      <span className="service-live-message" role="alert" aria-atomic="true">{tableStatus.error}</span>
      {role==="player"&&error&&<p className="service-player-error" role="alert">{error}</p>}
      <details onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();event.currentTarget.open=false;event.currentTarget.querySelector("summary")?.focus();}}}><summary>{tableStatus.phase === "connected" ? role === "dm" ? `Mesa · ${tableStatus.presence?.count ?? 0} jugadores` : tableStatus.published ? "Mesa conectada" : "Esperando al DM" : "Mesa desconectada"}</summary>
        <p>{connectionMessage}{role === "player" && tableStatus.phase === "connected" ? " Puedes navegar localmente; las órdenes explícitas del DM recentran la vista." : ""}</p>
        {role === "dm" && <><p>Preview principal: {tableStatus.presence?.primaryId?.slice(0,8) ?? "sin conexión"}</p><p>En otro navegador o perfil independiente, entra con la clave Jugador. Una pestaña con la cookie DM conserva su rol.</p>
          <label>Enlace jugador<input readOnly value={tableStatus.playerUrl || `${location.origin}/?view=player`} onFocus={event=>event.target.select()}/></label>
          <button onClick={()=>void navigator.clipboard.writeText(tableStatus.playerUrl || `${location.origin}/?view=player`).then(()=>setLinkFeedback("Enlace copiado.")).catch(()=>setLinkFeedback("Selecciona el enlace y cópialo manualmente."))}>Copiar enlace</button>
          <a href={tableStatus.playerUrl || `${location.origin}/?view=player`} target="_blank" rel="noreferrer">Abrir enlace</a>
          {linkFeedback && <p role="status">{linkFeedback}</p>}
          <p>La niebla no oculta los píxeles descargados del mapa. Ocultar un objeto revoca futuras lecturas; no retira bytes ya descargados.</p></>}
        {tableStatus.error && <p>{tableStatus.error}</p>}
      </details>
    </aside>}
    {access&&<main className="service-access" onKeyDown={event=>event.stopPropagation()}><section><p className="service-eyebrow">TTRPG Effects · Servicio privado</p><h1>{expired?"Recuperar sesión":"Acceso a tu mesa"}</h1>
      {checking?<p role="status">Comprobando sesión…</p>:<form onSubmit={login}>
        <label>Rol<select aria-label="Rol" value={expired?role??"dm":requestedRole} disabled={pending||expired} onChange={e=>setRequestedRole(e.target.value as ServiceRole)}><option value="dm">DM</option><option value="player">Jugador</option></select></label>
        <label>Clave de acceso<input type="password" autoComplete="off" required maxLength={1024} value={key} disabled={pending} onChange={e=>setKey(e.target.value)}/></label>
        <button disabled={pending||!key}>{pending?"Accediendo…":"Acceder"}</button>
        {error&&<p role="alert">{error}</p>}
        {!expired&&error&&<button type="button" disabled={pending} onClick={()=>setRetry(n=>n+1)}>Reintentar sesión</button>}
        {expired&&<button type="button" disabled={pending} onClick={()=>{void broker.discard().then(async choice=>{if(choice!=="discard")return;try{await workspace.logout();}catch(error){setError(error instanceof Error?error.message:"No se pudo cerrar sesión.");}});}}>Descartar cambios y cerrar sesión</button>}
        <p>La clave se valida en el servicio. El jugador recibe únicamente la proyección publicada por el DM.</p>
      </form>}
    </section></main>}
    <DialogHost broker={broker} browser={browser}/>
  </>;
}
