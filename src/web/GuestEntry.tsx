import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { guestSchema, type GuestDto } from "../shared/contracts/invitations";
import { HttpTransport, ServiceError } from "../infrastructure/browser/http";
import { contextualTableClient } from "../infrastructure/browser/contextual-table-client";
import { createClient } from "../shared/api/client";
import { ClientProvider } from "../renderer/src/client/ClientProvider";
import { PlayerApp } from "../renderer/src/PlayerApp";
import { createBrowserClient } from "../infrastructure/browser/browser-client";
import { DialogBroker } from "./dialogs";
import { Mutations, ok, failureMessage } from "./service-model";
import { captureInvitation } from "./invitation-fragment";
export type CapturedInvitation=ReturnType<typeof captureInvitation>;
const reply=guestSchema.extend({ok,replayed:z.boolean().optional()});
export function GuestEntry({gameId,invitation}:{gameId:string;invitation:CapturedInvitation}){
  const[guest,setGuest]=useState<GuestDto|null>(null),[alias,setAlias]=useState(""),[link,setLink]=useState(""),[checking,setChecking]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState(false),[terminal,setTerminal]=useState("");
  const secret=useRef<string|undefined>(undefined);const captured=useRef(false);
  if(!captured.current){captured.current=true;secret.current=invitation.consume();}
  const http=useMemo(()=>new HttpTransport(fetch,()=>{},`/api/v1/games/${gameId}`),[gameId]);
  const operations=useMemo(()=>new Mutations(http),[http]);
  async function session(){http.resume();try{const r=await http.request("/guest/session",reply);secret.current=undefined;setGuest(r);setTerminal("");setError("");}catch{setError("El acceso no está disponible. Usa una invitación vigente del DM.");}finally{http.resume();setChecking(false);}}
  useEffect(()=>{let live=true;http.resume();void http.request("/guest/session",reply).then(r=>{if(live){secret.current=undefined;setGuest(r);}}).catch(()=>{}).finally(()=>{if(live){http.resume();setChecking(false);}});return()=>{live=false;http.invalidate();};},[http]);
  async function admit(){if(busy)return;setBusy(true);setError("");http.resume();try{let value=secret.current;if(link){const parsed=new URL(link);if(parsed.origin!==location.origin||parsed.pathname!==`/jugar/${gameId}`||parsed.search)throw new Error("Pega una invitación de esta partida y del mismo servicio.");value=captureInvitation({pathname:parsed.pathname,search:"",hash:parsed.hash},{state:null,replaceState:()=>{}}).consume();setLink("");secret.current=value;}if(!value)throw new Error("Solicita un enlace vigente al DM y pégalo aquí.");const r=await operations.send("/admission",reply,"POST",{secret:value,alias});secret.current=undefined;setGuest(r);setTerminal("");}catch(e){if(e instanceof ServiceError&&(e.status===401||e.code==="ADMISSION_ALREADY_PROCESSED")){secret.current=undefined;setLink("");setError(e.code==="ADMISSION_ALREADY_PROCESSED"?"La entrada anterior fue procesada pero no se recuperó su acceso. Pega una invitación vigente para iniciar una entrada nueva, con otra identidad.":"El enlace no está disponible. Solicita uno vigente al DM y pégalo aquí.");}else setError(failureMessage(e));}finally{http.resume();setBusy(false);}}
  async function leave(){setBusy(true);try{http.resume();await http.json("/guest/leave",z.undefined(),"POST",{});setGuest(null);secret.current=undefined;setError("Has salido. Necesitas una invitación vigente para volver a entrar.");}catch(e){setError(failureMessage(e));}finally{setBusy(false);}}
  if(guest)return <GuestWorkspace key={`${guest.openingId}:${guest.generation}:${guest.participantId}`} guest={guest} onTerminal={reason=>{secret.current=undefined;setGuest(null);setTerminal(reason);}} onLeave={()=>void leave()} error={error}/>;
  return <main className="service-access"><section><h1>Entrar a la partida</h1>{checking?<p role="status">Comprobando acceso…</p>:<><p>{terminal==="replaced"?"Esta partida está abierta en otra pestaña.":terminal==="unavailable"?"Servicio no disponible. Reintenta explícitamente.":terminal==="access-ended"?"Tu acceso a esta partida ya no está disponible.":"Elige un alias. El DM verá tu nombre y un número que distingue alias repetidos."}</p>{terminal&&<button onClick={()=>void session()}>Comprobar acceso y retomar</button>}<form onKeyDown={e=>{if(e.key==="Escape"){e.preventDefault();secret.current=undefined;setLink("");setError("Entrada cancelada. Pega una invitación vigente para continuar.");}}} onSubmit={e=>{e.preventDefault();void admit();}}><label>Alias<input autoComplete="nickname" required value={alias} onChange={e=>setAlias(e.target.value)} /></label>{!secret.current&&<label>Invitación del mismo servicio<input type="password" autoComplete="off" value={link} onChange={e=>setLink(e.target.value)}/></label>}<button disabled={busy}>{busy?"Entrando…":"Entrar"}</button><button type="button" disabled={busy} onClick={()=>{secret.current=undefined;setLink("");setError("Entrada cancelada. Solicita una invitación para volver a intentarlo.");}}>Cancelar entrada</button><p role="alert">{error}</p></form></>}</section></main>;
}
function GuestWorkspace({guest,onTerminal,onLeave,error}:{guest:GuestDto;onTerminal:(reason:string)=>void;onLeave:()=>void;error:string}){
  const callback=useRef(onTerminal);callback.current=onTerminal;
  const table=useMemo(()=>contextualTableClient({gameId:guest.gameId,openingId:guest.openingId,generation:guest.generation,audience:"player"},reason=>callback.current(reason)),[guest.gameId,guest.openingId,guest.generation]);
  const client=useMemo(()=>{const base=createBrowserClient(new HttpTransport(fetch,()=>{}),new DialogBroker());return createClient({...base.client.api,...table.api},{scenes:false,images:true,libraries:false,templateAdministration:false,player:true,dice:true,nativeMenus:false},"service");},[table]);
  const status=useSyncExternalStore(table.subscribeStatus,table.getStatus);
  useEffect(()=>{const stop=table.start("player");return()=>{stop();table.clear();};},[table]);
  return <div className="service-player-workspace"><ClientProvider client={client}><PlayerApp unavailableMessage={status.phase!=="connected"?"Mesa desconectada. Reconectando…":"Esperando publicación del DM"}/></ClientProvider><button className="service-player-logout" onClick={onLeave}>Salir de la partida</button><aside className="service-table-status service-table-status--player"><p role="status">{guest.alias} #{guest.discriminator} · {status.phase!=="connected"?"Reconectando":status.published?"Conectado":"Esperando publicación"}</p><p role="alert">{error||status.error}</p></aside></div>;
}
