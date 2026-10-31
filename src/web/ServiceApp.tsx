import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServiceNavigation } from "./use-service-navigation";
import { z } from "zod";
import type { AccountDto } from "../shared/contracts/identity";
import { HttpTransport, ServiceError } from "../infrastructure/browser/http";
import { AccountAccess, ChangePassword } from "./AccountAccess";
import { AdminAccounts } from "./AdminAccounts";
import { AdminSystems } from "./AdminSystems";
import { GameCatalog } from "./GameCatalog";
import { GameEditor, type LeaveRegistration } from "./GameEditor";
import { GuestEntry, type CapturedInvitation } from "./GuestEntry";
import { captureInvitation } from "./invitation-fragment";
import { ServiceDialog } from "./dialogs";
import { identitySchema, failureMessage } from "./service-model";
export function ServiceApp({invitation:provided}:{invitation?:CapturedInvitation}){
  const [invitation,setInvitation]=useState(()=>provided??captureInvitation(location,history));
  const[account,setAccount]=useState<AccountDto|null>(null),[retained,setRetained]=useState<AccountDto|null>(null),[checking,setChecking]=useState(true),[error,setError]=useState(""),[incoming,setIncoming]=useState<AccountDto|null>(null),[password,setPassword]=useState(false);
  const transport=useRef<HttpTransport|null>(null);
  const guard=useRef<()=>Promise<boolean>>(async()=>true);const principal=useRef<AccountDto|null>(null);principal.current=account??retained;
  const expired=useCallback(()=>{transport.current?.invalidate();setRetained(principal.current);setAccount(null);setChecking(false);},[]);
  const http=useMemo(()=>new HttpTransport(fetch,expired),[expired]);transport.current=http;
  const [discard,setDiscard]=useState<null|((accept:boolean)=>void)>(null);
  const allowLeave=useCallback(async()=>{
    if(retained&&!account){const accepted=await new Promise<boolean>(resolve=>setDiscard(()=>resolve));if(!accepted)return false;setRetained(null);http.clearAccount();return true;}
    return guard.current();
  },[retained,account,http]);
  const {path,navigate:move,replace}=useServiceNavigation(allowLeave);
  const channel=useRef<BroadcastChannel|null>(null);
  useEffect(()=>{if(typeof BroadcastChannel==="undefined")return;const bus=new BroadcastChannel("ttrpg-account-change");channel.current=bus;bus.onmessage=event=>{if(principal.current&&event.data?.accountId!==principal.current.id)expired();};return()=>{channel.current=null;bus.close();};},[expired]);
  useEffect(()=>{const check=()=>{if(principal.current&&document.visibilityState!=="hidden")void http.request("/identity/session",identitySchema).catch(()=>{});};window.addEventListener("focus",check);document.addEventListener("visibilitychange",check);return()=>{window.removeEventListener("focus",check);document.removeEventListener("visibilitychange",check);};},[http]);
  const guestMatch=/^\/jugar\/([0-9a-f-]+)$/.exec(path);
  const registerLeave=useCallback<LeaveRegistration>(fn=>{guard.current=fn;return()=>{if(guard.current===fn)guard.current=async()=>true;};},[]);
  const navigate=useCallback(async(next:string)=>{if(await move(next)){setError("");setPassword(false);}},[move]);
  useEffect(()=>{if(guestMatch){setChecking(false);return;}let live=true;void http.request("/identity/session",identitySchema).then(r=>{if(live){setAccount(r.account);http.bindAccount(r.account.id);}}).catch(e=>{if(live&&!(e instanceof ServiceError&&e.status===401))setError(failureMessage(e));}).finally(()=>{if(live)setChecking(false);});return()=>{live=false;};},[http,!!guestMatch]);
  const logout=useCallback(async()=>{await http.json("/identity/logout",z.undefined(),"POST",{});http.clearAccount();channel.current?.postMessage({accountId:null});setAccount(null);setRetained(null);setPassword(false);replace("/");},[http,replace]);
  const leavePassword=useCallback(async()=>{if(!retained){await logout();return;}await http.json("/identity/logout",z.undefined(),"POST",{});http.invalidate();setAccount(null);setPassword(false);},[http,retained,logout]);
  function authenticated(next:AccountDto){channel.current?.postMessage({accountId:next.id});if(retained&&retained.id!==next.id){http.invalidate();setIncoming(next);return;}http.bindAccount(next.id);setAccount(next);if(!next.mustChangePassword)setRetained(null);setError("");if(!/^\/partidas(?:\/|$)/.test(path)&&next.role==="dm"){replace("/partidas");}}
  if(guestMatch)return <GuestEntry gameId={guestMatch[1]} invitation={invitation}/>;
  const editor=/^\/partidas\/([0-9a-f-]+)$/.exec(path);
  const identity=account??retained;
  const authorized=!!account&&!account.mustChangePassword&&!password;
  return <><div hidden={!authorized} inert={!authorized} className="account-guard">{identity&&<><header className="account-bar"><span>{identity.name} · {identity.role==="admin"?"Administrador":"DM"}</span><nav>{identity.role==="admin"?<><button onClick={()=>void navigate("/admin/cuentas")}>Cuentas DM</button><button onClick={()=>void navigate("/admin/sistemas")}>Sistemas</button></>:<button onClick={()=>void navigate("/partidas")}>Partidas</button>}<button onClick={()=>void guard.current().then(ok=>{if(ok)setPassword(true);})}>Cambiar contraseña</button><button onClick={()=>void guard.current().then(async ok=>{if(ok)await logout();}).catch(e=>setError(failureMessage(e)))}>Cerrar sesión</button></nav></header>{identity.role==="dm"?editor&&(!identity.mustChangePassword||retained?.id===identity.id)?<GameEditor key={`${identity.id}:${editor[1]}`} http={http} gameId={editor[1]} active={authorized} expired={expired} onExit={()=>void navigate("/partidas")} onLogout={logout} registerLeave={registerLeave}/>:authorized&&<main className="service-page"><GameCatalog http={http} onOpen={id=>void navigate(`/partidas/${id}`)}/></main>:authorized&&<main className="service-page">{path==="/admin/sistemas"?<AdminSystems http={http}/>:<AdminAccounts http={http}/>}</main>}</>}{error&&<p role="alert">{error}</p>}</div>{checking?<main className="service-access"><p role="status">Comprobando sesión…</p></main>:!account?<AccountAccess http={http} onAccount={authenticated} retained={!!retained} onInvitation={url=>{void move(url.pathname,()=>setInvitation(captureInvitation({pathname:url.pathname,search:"",hash:url.hash},{state:null,replaceState:()=>{}})));}}/>:account.mustChangePassword||password?<ChangePassword http={http} account={account} onExit={leavePassword}/>:null}{discard&&<ServiceDialog title="Conservar el borrador" onCancel={()=>{discard(false);setDiscard(null);}}><p>Recupera la cuenta original para guardar. Salir ahora requiere descartar explícitamente el borrador protegido.</p><footer><button autoFocus onClick={()=>{discard(false);setDiscard(null);}}>Cancelar y recuperar sesión</button><button onClick={()=>{discard(true);setDiscard(null);}}>Descartar borrador y continuar</button></footer></ServiceDialog>}{incoming&&<ServiceDialog title="Cambiar de cuenta" onCancel={()=>{void http.json("/identity/logout",z.undefined(),"POST",{}).finally(()=>setIncoming(null));}}><p>Hay un borrador de otra cuenta. Debes descartarlo antes de abrir el espacio de {incoming.name}. No se guardará con esta cuenta.</p><footer><button autoFocus onClick={()=>{void http.json("/identity/logout",z.undefined(),"POST",{}).finally(()=>setIncoming(null));}}>Cancelar</button><button onClick={()=>{http.bindAccount(incoming.id);setRetained(null);setAccount(incoming);setIncoming(null);replace(incoming.role==="admin"?"/admin/cuentas":"/partidas");}}>Descartar borrador y cambiar cuenta</button></footer></ServiceDialog>}</>;
}
