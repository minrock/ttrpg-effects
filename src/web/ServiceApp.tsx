import { IndexedDbDraftStore } from "../infrastructure/browser/drafts/indexeddb-store";
import { Menu, LayoutGrid, KeyRound, LogOut } from "lucide-react";
import { HeaderDropdown } from "./HeaderDropdown";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServiceNavigation } from "./use-service-navigation";
import { z } from "zod";
import type { AccountDto } from "../shared/contracts/identity";
import { HttpTransport, ServiceError } from "../infrastructure/browser/http";
import { AccountAccess, ChangePassword } from "./AccountAccess";
import { AdminAccounts } from "./AdminAccounts";
import { AdminSystems } from "./AdminSystems";
import { CampaignCatalog } from "./campaigns/CampaignCatalog";
import { campaignSelectionSchema, type CampaignSelection } from "../shared/contracts/campaigns";
import { GameEditor, type LeaveRegistration } from "./GameEditor";
import { GuestEntry, type CapturedInvitation } from "./GuestEntry";
import { captureInvitation } from "./invitation-fragment";
import { ServiceDialog } from "./dialogs";
import { identitySchema, failureMessage } from "./service-model";
import { AdminShell } from "./AdminShell";
export function ServiceApp({invitation:provided}:{invitation?:CapturedInvitation}){
  const [invitation,setInvitation]=useState(()=>provided??captureInvitation(location,history));
  const[account,setAccount]=useState<AccountDto|null>(null),[retained,setRetained]=useState<AccountDto|null>(null),[checking,setChecking]=useState(true),[error,setError]=useState(""),[incoming,setIncoming]=useState<AccountDto|null>(null),[password,setPassword]=useState(false);
  const [headerSlot,setHeaderSlot]=useState<HTMLDivElement|null>(null);
  const [editorHeaderSlot,setEditorHeaderSlot]=useState<HTMLDivElement|null>(null);
  const transport=useRef<HttpTransport|null>(null);
  const guard=useRef<()=>Promise<boolean>>(async()=>true);const principal=useRef<AccountDto|null>(null);principal.current=account??retained;
  const activeAccount=useRef<AccountDto|null>(null);activeAccount.current=account;
  const expired=useCallback(()=>{transport.current?.invalidate();setRetained(principal.current);setAccount(null);setChecking(false);},[]);
  const http=useMemo(()=>new HttpTransport(fetch,expired),[expired]);transport.current=http;
  const [discard,setDiscard]=useState<null|((accept:boolean)=>void)>(null);
  const allowLeave=useCallback(async()=>{
    if(retained&&!account){const accepted=await new Promise<boolean>(resolve=>setDiscard(()=>resolve));if(!accepted)return false;setRetained(null);http.clearAccount();return true;}
    return guard.current();
  },[retained,account,http]);
  const {path,locationKey,navigate:move,replace}=useServiceNavigation(allowLeave);
  const currentPath=useRef(path);currentPath.current=path;
  const channel=useRef<BroadcastChannel|null>(null);
  useEffect(()=>{if(typeof BroadcastChannel==="undefined")return;const bus=new BroadcastChannel("ttrpg-account-change");channel.current=bus;bus.onmessage=event=>{if(principal.current&&event.data?.accountId!==principal.current.id)expired();};return()=>{channel.current=null;bus.close();};},[expired]);
  useEffect(()=>{const check=()=>{if(principal.current&&document.visibilityState!=="hidden")void http.request("/identity/session",identitySchema).catch(()=>{});};window.addEventListener("focus",check);document.addEventListener("visibilitychange",check);return()=>{window.removeEventListener("focus",check);document.removeEventListener("visibilitychange",check);};},[http]);
  const guestMatch=/^\/jugar\/([0-9a-f-]+)$/.exec(path);
  const campaignSelection=useMemo(()=>{
    const query=new URLSearchParams(location.search);
    const parsed=campaignSelectionSchema.safeParse({campaignId:query.get("campaignId"),arcId:query.get("arcId"),sceneId:query.get("sceneId")});
    return parsed.success?parsed.data:undefined;
  },[locationKey]);
  const registerLeave=useCallback<LeaveRegistration>(fn=>{guard.current=fn;return()=>{if(guard.current===fn)guard.current=async()=>true;};},[]);
  const navigate=useCallback(async(next:string)=>{if(await move(next)){setError("");setPassword(false);}},[move]);
  const setCampaignSelection=useCallback(async(selection:CampaignSelection)=>{
    const accountId=activeAccount.current?.id;
    const sourcePath=currentPath.current;
    const editorMatch=/^\/partidas\/([0-9a-f-]+)$/.exec(sourcePath);
    if(!accountId||(editorMatch&&editorMatch[1]!==selection.campaignId)||(!editorMatch&&sourcePath!=="/partidas"))return false;
    const current=new URLSearchParams(location.search);
    if(editorMatch&&current.get("campaignId")===selection.campaignId&&current.get("arcId")===selection.arcId&&current.get("sceneId")===selection.sceneId)return false;
    const next=`/partidas/${selection.campaignId}?campaignId=${selection.campaignId}&arcId=${selection.arcId}&sceneId=${selection.sceneId}`;
    return move(next,()=>activeAccount.current?.id===accountId&&activeAccount.current?.role==="dm"&&!activeAccount.current?.mustChangePassword&&currentPath.current===sourcePath);
  },[move]);
  const exitEditor=useCallback(()=>{ const query=new URLSearchParams(location.search); const parsed=campaignSelectionSchema.safeParse({campaignId:query.get("campaignId"),arcId:query.get("arcId"),sceneId:query.get("sceneId")}); const suffix=parsed.success?`?campaignId=${parsed.data.campaignId}&arcId=${parsed.data.arcId}&sceneId=${parsed.data.sceneId}`:""; void navigate(`/partidas${suffix}`); },[navigate]);
  // El editor ya confirmó el descarte/cierre antes de invocar esta salida. No
  // volvemos a pedir el guard, que se desmonta con el editor y cancelaría la ruta.
  const exitEditorAfterLeave=useCallback(()=>{ const query=new URLSearchParams(location.search); const parsed=campaignSelectionSchema.safeParse({campaignId:query.get("campaignId"),arcId:query.get("arcId"),sceneId:query.get("sceneId")}); const suffix=parsed.success?`?campaignId=${parsed.data.campaignId}&arcId=${parsed.data.arcId}&sceneId=${parsed.data.sceneId}`:""; replace(`/partidas${suffix}`); },[replace]);
  useEffect(()=>{if(guestMatch){setChecking(false);return;}let live=true;void http.request("/identity/session",identitySchema).then(r=>{if(live){setAccount(r.account);http.bindAccount(r.account.id);}}).catch(e=>{if(live&&!(e instanceof ServiceError&&e.status===401))setError(failureMessage(e));}).finally(()=>{if(live)setChecking(false);});return()=>{live=false;};},[http,!!guestMatch]);
  const logout=useCallback(async()=>{const owner=http.accountId;await http.json("/identity/logout",z.undefined(),"POST",{});http.clearAccount();if(owner&&globalThis.indexedDB)await new IndexedDbDraftStore().forgetAccount(owner,location.origin).catch(()=>setError("La sesión se cerró, pero no se pudo limpiar el respaldo del dispositivo. Borra los datos del sitio si es un equipo compartido."));channel.current?.postMessage({accountId:null});setAccount(null);setRetained(null);setPassword(false);replace("/");},[http,replace]);
  const leavePassword=useCallback(async()=>{if(!retained){await logout();return;}await http.json("/identity/logout",z.undefined(),"POST",{});http.invalidate();setAccount(null);setPassword(false);},[http,retained,logout]);
  function authenticated(next:AccountDto){channel.current?.postMessage({accountId:next.id});if(retained&&retained.id!==next.id){http.invalidate();setIncoming(next);return;}http.bindAccount(next.id);setAccount(next);if(!next.mustChangePassword)setRetained(null);setError("");if(!/^\/partidas(?:\/|$)/.test(path)&&next.role==="dm"){replace("/partidas");}}
  if(guestMatch)return <GuestEntry gameId={guestMatch[1]} invitation={invitation}/>;
  const editor=/^\/partidas\/([0-9a-f-]+)$/.exec(path);
  const identity=account??retained;
  const authorized=!!account&&!account.mustChangePassword&&!password;
  const isDmEditor=identity?.role==="dm"&&!!editor;
  const accountMenu=identity?<HeaderDropdown title={`Cuenta de ${identity.name}`} align="right" className="header-account" label={<>
    <span className="header-avatar" aria-hidden="true">{identity.name.trim().split(/\s+/).slice(0,2).map(part=>Array.from(part)[0]).join("").toUpperCase()}</span>
    <span className="header-account-label"><strong>{identity.name}</strong><small>{identity.role==="admin"?"Administrador":"DM"}</small></span>
  </>}><div className="header-account-info"><strong>{identity.name}</strong><small>{identity.role==="admin"?"Administrador":"Dungeon Master"}</small></div><button onClick={()=>void guard.current().then(ok=>{if(ok)setPassword(true);})}><KeyRound size={16} aria-hidden="true"/>Cambiar contraseña</button><button className="header-danger" onClick={()=>void guard.current().then(async ok=>{if(ok)await logout();}).catch(e=>setError(failureMessage(e)))}><LogOut size={16} aria-hidden="true"/>Cerrar sesión</button></HeaderDropdown>:null;
  const editorView=identity&&isDmEditor&&editor&&(!identity.mustChangePassword||retained?.id===identity.id)?<><header className="account-bar" onKeyDown={event=>event.stopPropagation()}>
    <HeaderDropdown title="Navegación" label={<Menu size={17} aria-hidden="true"/>} className="header-navigation"><p className="header-dropdown-heading">TTRPG Effects</p><button onClick={()=>void navigate("/partidas")}><LayoutGrid size={16} aria-hidden="true"/>Campañas</button></HeaderDropdown>
    <span className="header-brand">TTRPG <span>Effects</span></span><div className="header-context" ref={setHeaderSlot}/><div className="service-editor-tools" ref={setEditorHeaderSlot}/>{accountMenu}
  </header><GameEditor key={`${identity.id}:${editor[1]}`} http={http} gameId={editor[1]} headerSlot={headerSlot} editorHeaderSlot={editorHeaderSlot} active={authorized} expired={expired} onExit={exitEditor} onExitAfterLeave={exitEditorAfterLeave} onLogout={logout} registerLeave={registerLeave} selection={campaignSelection} onSelectScene={setCampaignSelection}/></>:null;
  const administration=identity&&authorized&&!isDmEditor?<AdminShell role={identity.role} activePath={path} onAdminNavigate={destination=>navigate(destination)}>{({navigationSlot,navigationOpen,toggleNavigation,navigationTriggerRef,onNavigation,navigationId})=><>
    <header className="account-bar admin-shell-header" onKeyDown={event=>event.stopPropagation()}>
      <button ref={navigationTriggerRef} type="button" className="header-navigation admin-navigation-trigger" aria-controls={navigationId} aria-expanded={navigationOpen} aria-label={navigationOpen?"Ocultar navegación":"Mostrar navegación"} title={navigationOpen?"Ocultar navegación":"Mostrar navegación"} onClick={toggleNavigation}><Menu size={17} aria-hidden="true"/></button>
      <span className="header-brand">TTRPG <span>Effects</span></span><div className="header-context"><span className="header-section">{identity.role==="admin"?(path==="/admin/sistemas"?"Sistemas de juego":"Cuentas DM"):"Campañas"}</span></div>{accountMenu}
    </header>
    <main className="service-page admin-service-page">{identity.role==="dm"?<CampaignCatalog http={http} accountId={identity.id} onLegacyOpen={id=>void navigate(`/partidas/${id}`)} onSelectScene={selection=>setCampaignSelection(selection)} returnSelection={campaignSelection} navigationSlot={navigationSlot} onNavigation={onNavigation}/>:path==="/admin/sistemas"?<AdminSystems http={http}/>:<AdminAccounts http={http}/>}</main>
  </>}</AdminShell>:null;
  return <><div hidden={!authorized} inert={!authorized} className="account-guard">{editorView??administration}{error&&<p role="alert">{error}</p>}</div>{checking?<main className="service-access"><p role="status">Comprobando sesión…</p></main>:!account?<AccountAccess http={http} onAccount={authenticated} retained={!!retained} onInvitation={url=>{void move(url.pathname,()=>setInvitation(captureInvitation({pathname:url.pathname,search:"",hash:url.hash},{state:null,replaceState:()=>{}})));}}/>:account.mustChangePassword||password?<ChangePassword http={http} account={account} onExit={leavePassword}/>:null}{discard&&<ServiceDialog title="Conservar el borrador" onCancel={()=>{discard(false);setDiscard(null);}}><p>Recupera la cuenta original para guardar. Salir ahora requiere descartar explícitamente el borrador protegido.</p><footer><button autoFocus onClick={()=>{discard(false);setDiscard(null);}}>Cancelar y recuperar sesión</button><button onClick={()=>{discard(true);setDiscard(null);}}>Descartar borrador y continuar</button></footer></ServiceDialog>}{incoming&&<ServiceDialog title="Cambiar de cuenta" onCancel={()=>{void http.json("/identity/logout",z.undefined(),"POST",{}).finally(()=>setIncoming(null));}}><p>Hay un borrador de otra cuenta. Debes descartarlo antes de abrir el espacio de {incoming.name}. No se guardará con esta cuenta.</p><footer><button autoFocus onClick={()=>{void http.json("/identity/logout",z.undefined(),"POST",{}).finally(()=>setIncoming(null));}}>Cancelar</button><button onClick={()=>{http.bindAccount(incoming.id);setRetained(null);setAccount(incoming);setIncoming(null);replace(incoming.role==="admin"?"/admin/cuentas":"/partidas");}}>Descartar borrador y cambiar cuenta</button></footer></ServiceDialog>}</>;
}
