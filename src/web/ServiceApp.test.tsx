// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ServiceApp } from "./ServiceApp";
import { DialogBroker, DialogHost } from "./dialogs";
import { createBrowserClient } from "../infrastructure/browser/browser-client";
import { HttpTransport } from "../infrastructure/browser/http";
import type { CampaignSelection } from "../shared/contracts/campaigns";
const leave=vi.hoisted(()=>({allow:true,calls:0,wait:undefined as undefined|(()=>Promise<boolean>)}));
vi.mock("./GameEditor",()=>({GameEditor:({expired,registerLeave,onExit,onExitAfterLeave,onSelectScene,gameId}:{expired:()=>void;registerLeave:(fn:()=>Promise<boolean>)=>()=>void;onExit:()=>void;onExitAfterLeave?:()=>void;onSelectScene?: (selection: CampaignSelection)=>Promise<boolean>;gameId:string})=>{useEffect(()=>registerLeave(async()=>{leave.calls++;return leave.wait?leave.wait():leave.allow;}),[registerLeave]);return <div>VTT privado<input aria-label="Borrador" defaultValue="secreto"/><button onClick={expired}>Simular expiración</button><button onClick={onExit}>Salida normal</button><button onClick={onExitAfterLeave}>Salida confirmada</button><button onClick={()=>void onSelectScene?.({campaignId:gameId,arcId:"22222222-2222-4222-8222-222222222222",sceneId:"33333333-3333-4333-8333-333333333333"})}>Cambiar escena fixture</button><div data-portal>Portal protegido</div></div>;}}));
vi.mock("./campaigns/CampaignCatalog",()=>({CampaignCatalog:({onLegacyOpen,onSelectScene}:{onLegacyOpen:(id:string)=>void;onSelectScene:(selection:CampaignSelection)=>void})=> <div>Catálogo privado<button onClick={()=>onLegacyOpen("01010101-0101-4101-8101-010101010101")}>Abrir fixture</button><button onClick={()=>onSelectScene({campaignId:"01010101-0101-4101-8101-010101010101",arcId:"22222222-2222-4222-8222-222222222222",sceneId:"33333333-3333-4333-8333-333333333333"})}>Abrir selección de catálogo</button></div>}));

vi.mock("./AdminSystems",()=>({AdminSystems:()=> <div>Sistemas administrados</div>}));
vi.mock("./GuestEntry",()=>({GuestEntry:()=> <div>Entrada invitada separada</div>}));
let host:HTMLDivElement,root:Root;
const account={id:"account-a",email:"a@example.test",name:"DM A",role:"dm",enabled:true,mustChangePassword:false,emailVerified:false,createdAt:"2026-10-31T00:00:00.000Z",updatedAt:"2026-10-31T00:00:00.000Z"};
const session=(changes:object={})=>({ok:true,account:{...account,...changes},sessionId:"session",expiresAt:"2026-10-31T20:00:00.000Z"});
const response=(value:unknown,status=200)=>new Response(status===204?null:JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
const fail=()=>response({ok:false,error:{code:"UNAUTHORIZED",message:"Acceso inválido"}},401);
beforeEach(()=>{leave.allow=true;leave.calls=0;leave.wait=undefined;Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});history.replaceState(null,"","/");host=document.createElement("div");document.body.append(host);root=createRoot(host);HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function render(){await act(async()=>root.render(<ServiceApp/>));}
async function click(text:string){const element=[...host.querySelectorAll("button")].find(b=>b.textContent===text);expect(element).toBeTruthy();await act(async()=>element!.click());}
async function fill(selector:string,value:string){const element=host.querySelector<HTMLInputElement>(selector)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(element,value);element.dispatchEvent(new Event("input",{bubbles:true}));});}
async function submit(){await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));}
it("login sin selector conserva email y limpia contraseña al fallar; autoriza por cuenta",async()=>{
 let resolve!:(r:Response)=>void;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(r=>{resolve=r;})).mockResolvedValueOnce(fail()).mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(null,204));vi.stubGlobal("fetch",fetcher);
 await render();expect(host.textContent).toContain("Comprobando sesión");expect(host.textContent).not.toContain("Catálogo privado");await act(async()=>resolve(fail()));expect(host.querySelector("select")).toBeNull();
 await fill('input[type="email"]',account.email);await fill('input[type="password"]',"incorrecta");await submit();expect(host.textContent).toContain("Acceso inválido");expect(host.querySelector<HTMLInputElement>('input[type="password"]')!.value).toBe("");expect(host.querySelector<HTMLInputElement>('input[type="email"]')!.value).toBe(account.email);
 await fill('input[type="password"]',"passphrase de fixture");await submit();expect(host.textContent).toContain("Catálogo privado");expect(fetcher.mock.calls[2][0]).toBe("/api/v1/identity/login");await click("Cerrar sesión");expect(host.textContent).not.toContain("Catálogo privado");
});
it("cambio obligatorio no carga catálogo ni editor aun con URL directa",async()=>{history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");const f=vi.fn(async()=>response(session({mustChangePassword:true})));vi.stubGlobal("fetch",f);await render();expect(host.textContent).toContain("Cambiar contraseña");expect(host.textContent).not.toContain("VTT privado");expect(f).toHaveBeenCalledTimes(1);});
it("expiración oculta canvas y portales; mismo ID recupera; email igual con otro ID exige descarte",async()=>{
 history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");const f=vi.fn().mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(session({id:"other"})));vi.stubGlobal("fetch",f);await render();await fill('[aria-label="Borrador"]',"Pendiente");await click("Simular expiración");expect(host.querySelector('[data-portal]')?.closest('[hidden][inert]')).not.toBeNull();await fill('input[type="password"]',"passphrase de fixture");await submit();expect(host.querySelector<HTMLInputElement>('[aria-label="Borrador"]')?.value).toBe("Pendiente");expect(host.querySelector('[data-portal]')?.closest('[hidden]')).toBeNull();await click("Simular expiración");await fill('input[type="password"]',"passphrase de fixture");await submit();expect(host.textContent).toContain("Cambiar de cuenta");expect(host.querySelector('[data-portal]')?.closest('[hidden][inert]')).not.toBeNull();await click("Descartar borrador y cambiar cuenta");expect(host.querySelector('[aria-label="Borrador"]')).toBeNull();expect(host.textContent).toContain("Catálogo privado");
});
it("invitado usa ruta reservada y no consulta identidad; view=player no autoriza",async()=>{history.replaceState(null,"","/jugar/01010101-0101-4101-8101-010101010101");const f=vi.fn();vi.stubGlobal("fetch",f);await render();expect(host.textContent).toContain("Entrada invitada separada");expect(f).not.toHaveBeenCalled();});
it("administrador tiene pantalla separada sin capacidades de mapa",async()=>{vi.stubGlobal("fetch",vi.fn(async()=>response(session({role:"admin"}))));await render();expect(host.textContent).toContain("Cuentas DM");expect(host.textContent).not.toContain("VTT privado");await click("Sistemas");expect(host.textContent).toContain("Sistemas administrados");});
it("una URL de editor no entrega el editor a un administrador",async()=>{history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");vi.stubGlobal("fetch",vi.fn(async()=>response(session({role:"admin"}))));await render();expect(host.textContent).toContain("Cuentas DM");expect(host.textContent).not.toContain("VTT privado");expect(host.querySelector(".admin-shell")).toBeTruthy();});
it("una expiración con drawer abierto desmonta la navegación privada",async()=>{
 let expireAccounts!:(value:Response)=>void;
 vi.stubGlobal("matchMedia",vi.fn(() => ({ matches:false,media:"(min-width: 960px)",onchange:null,addEventListener:()=>{},removeEventListener:()=>{},addListener:()=>{},removeListener:()=>{},dispatchEvent:()=>true }) as MediaQueryList));
 vi.stubGlobal("fetch",vi.fn((url:string)=>url.endsWith("/identity/session")?Promise.resolve(response(session({role:"admin"}))):url.includes("offset=0")?new Promise<Response>(resolve=>{expireAccounts=resolve;}):Promise.resolve(response({ok:true,accounts:[],total:0}))));
 await render(); await act(async()=>{for(let index=0;index<6;index++)await Promise.resolve();});
 const trigger=host.querySelector<HTMLButtonElement>('[aria-label="Mostrar navegación"]');expect(trigger).toBeTruthy();await act(async()=>trigger!.click());
 expect(host.querySelector('[role="dialog"]')).toBeTruthy(); expireAccounts(fail()); await act(async()=>{for(let index=0;index<8;index++)await Promise.resolve();});
 expect(host.querySelector('[role="dialog"]')).toBeNull();expect(host.querySelector('.account-guard')?.hasAttribute("hidden")).toBe(true);expect(document.activeElement?.closest(".admin-sidebar")).toBeNull();
});
it("diálogo pendiente guarda/descarta/cancela y Escape devuelve foco",async()=>{const broker=new DialogBroker(),browser=createBrowserClient(new HttpTransport(vi.fn()),broker);await act(async()=>root.render(<><button>Disparador</button><DialogHost broker={broker} browser={browser}/></>));const trigger=host.querySelector("button")!;trigger.focus();for(const [label,value] of [["Guardar y continuar","save"],["Descartar","discard"],["Cancelar",null]] as const){let choice!:Promise<string|null>;await act(async()=>{choice=broker.leave();});await click(label);expect(await choice).toBe(value);}let choice!:Promise<string|null>;await act(async()=>{choice=broker.leave();});await act(async()=>host.querySelector("dialog")!.dispatchEvent(new Event("cancel",{cancelable:true})));expect(await choice).toBeNull();expect(document.activeElement).toBe(trigger);});

it("reset obligatorio del mismo ID conserva borrador oculto hasta nueva autenticación",async()=>{
 history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");const f=vi.fn().mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(session({mustChangePassword:true}))).mockResolvedValueOnce(response(null,204)).mockResolvedValueOnce(response(null,204)).mockResolvedValueOnce(response(session()));vi.stubGlobal("fetch",f);await render();await fill('[aria-label="Borrador"]',"Retener durante reset");const draft=host.querySelector('[aria-label="Borrador"]');await click("Simular expiración");await fill('input[type="password"]',"temporal de fixture");await submit();expect(host.textContent).toContain("debes cambiar la contraseña temporal");expect(host.querySelector('[aria-label="Borrador"]')).toBe(draft);expect(draft?.closest('[hidden][inert]')).not.toBeNull();expect(f).toHaveBeenCalledTimes(2);const passwords=host.querySelectorAll<HTMLInputElement>('input[type="password"]');for(const [index,value] of ["temporal de fixture","nueva passphrase de fixture","nueva passphrase de fixture"].entries()){await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(passwords[index],value);passwords[index].dispatchEvent(new Event("input",{bubbles:true}));});}await submit();expect(host.textContent).toContain("Recuperar sesión");expect(host.querySelector('[aria-label="Borrador"]')).toBe(draft);await fill('input[type="password"]',"nueva passphrase de fixture");await submit();expect(host.querySelector<HTMLInputElement>('[aria-label="Borrador"]')?.value).toBe("Retener durante reset");expect(draft?.closest('[hidden]')).toBeNull();});

it("invitación desde recuperación conserva nodo al cancelar, valida URL y descarta explícitamente",async()=>{
 history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");vi.stubGlobal("fetch",vi.fn(async()=>response(session())));await render();
 const node=host.querySelector<HTMLInputElement>('[aria-label="Borrador"]')!;await fill('[aria-label="Borrador"]',"Borrador protegido");await click("Simular expiración");
 await fill('details input',"http://ajeno.invalid/jugar/01010101-0101-4101-8101-010101010101");await click("Abrir invitación");expect(host.querySelector("dialog")).toBeNull();expect(host.querySelector('[aria-label="Borrador"]')).toBe(node);
 const url=location.origin+"/jugar/01010101-0101-4101-8101-010101010101";
 await fill('details input',url);await click("Abrir invitación");expect(host.textContent).toContain("Conservar el borrador");await click("Cancelar y recuperar sesión");expect(host.querySelector('[aria-label="Borrador"]')).toBe(node);expect(node.value).toBe("Borrador protegido");expect(location.pathname).toMatch(/^\/partidas\//);
 await fill('details input',url+"#invitacion="+"a".repeat(42)+"A");await click("Abrir invitación");await click("Descartar borrador y continuar");expect(host.querySelector('[aria-label="Borrador"]')).toBeNull();expect(host.textContent).toContain("Entrada invitada separada");expect(location.hash).toBe("");
 await act(async()=>{history.back();await new Promise(r=>setTimeout(r,50));});expect(host.textContent).not.toContain("Recuperar sesión");expect(host.querySelector<HTMLInputElement>('[aria-label="Borrador"]')?.value).toBe("secreto");
});
it("Atrás/Adelante conserva entradas y restaura posición al cancelar",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>response(session())));await render();await click("Abrir fixture");await click("Campañas");const length=history.length;
 await act(async()=>{history.back();await new Promise(r=>setTimeout(r,50));});expect(location.pathname).toMatch(/^\/partidas\//);expect(host.textContent).toContain("VTT privado");
 leave.allow=false;const node=host.querySelector('[aria-label="Borrador"]');await act(async()=>{history.back();await new Promise(r=>setTimeout(r,50));});expect(location.pathname).toMatch(/^\/partidas\//);expect(host.querySelector('[aria-label="Borrador"]')).toBe(node);expect(history.length).toBe(length);
 leave.allow=true;await act(async()=>{history.back();await new Promise(r=>setTimeout(r,50));});expect(location.pathname).toBe("/");await act(async()=>{history.forward();await new Promise(r=>setTimeout(r,50));});expect(location.pathname).toMatch(/^\/partidas\//);await act(async()=>{history.forward();await new Promise(r=>setTimeout(r,50));});expect(location.pathname).toBe("/partidas");expect(history.length).toBe(length);
});
it("el cierre ya confirmado no vuelve a pedir el guard del editor",async()=>{
 history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");vi.stubGlobal("fetch",vi.fn(async()=>response(session())));await render();
 leave.allow=false;await click("Salida normal");expect(location.pathname).toMatch(/^\/partidas\//);expect(leave.calls).toBe(1);
 await click("Salida confirmada");expect(location.pathname).toBe("/partidas");expect(host.textContent).toContain("Catálogo privado");expect(leave.calls).toBe(1);
});
it("la selección contextual usa una sola guarda y sólo confirma la URL si cuenta y editor siguen vigentes",async()=>{
 const gameId="01010101-0101-4101-8101-010101010101";
 history.replaceState(null,"",`/partidas/${gameId}?campaignId=${gameId}&arcId=11111111-1111-4111-8111-111111111111&sceneId=12121212-1212-4212-8212-121212121212`);
 vi.stubGlobal("fetch",vi.fn(async()=>response(session())));await render();
 leave.allow=false;await click("Cambiar escena fixture");expect(location.search).toContain("arcId=11111111-1111-4111-8111-111111111111");
 leave.allow=true;await click("Cambiar escena fixture");await vi.waitFor(()=>expect(location.search).toContain("arcId=22222222-2222-4222-8222-222222222222"));
 expect(leave.calls).toBe(2);
});
it("una expiración durante la guarda pendiente no confirma el cambio de escena",async()=>{
 const gameId="01010101-0101-4101-8101-010101010101";
 history.replaceState(null,"",`/partidas/${gameId}?campaignId=${gameId}&arcId=11111111-1111-4111-8111-111111111111&sceneId=12121212-1212-4212-8212-121212121212`);
 vi.stubGlobal("fetch",vi.fn(async()=>response(session())));await render();
 let resolve!: (accepted:boolean)=>void;leave.wait=()=>new Promise(done=>{resolve=done;});
 await click("Cambiar escena fixture");await click("Simular expiración");await act(async()=>resolve(true));
 await act(async()=>{for(let index=0;index<4;index++)await Promise.resolve();});
 expect(location.search).toContain("arcId=11111111-1111-4111-8111-111111111111");
 expect(host.querySelector("[data-portal]")?.closest("[hidden][inert]")).not.toBeNull();
});
it("el catálogo puede reabrir la selección conservada al volver del editor",async()=>{
 const gameId="01010101-0101-4101-8101-010101010101",arcId="22222222-2222-4222-8222-222222222222",sceneId="33333333-3333-4333-8333-333333333333";
 history.replaceState(null,"",`/partidas?campaignId=${gameId}&arcId=${arcId}&sceneId=${sceneId}`);
 vi.stubGlobal("fetch",vi.fn(async()=>response(session())));await render();await click("Abrir selección de catálogo");
 await vi.waitFor(()=>expect(location.pathname).toBe(`/partidas/${gameId}`));
 expect(location.search).toContain(`sceneId=${sceneId}`);
});
it("401 en listado administrativo desmonta datos y contraseña temporal",async()=>{
 const f=vi.fn(async(url:string)=>url.endsWith("/identity/session")?response(session({role:"admin"})):url.includes("offset=0")?response({ok:true,accounts:[account],total:21}):fail());vi.stubGlobal("fetch",f);await render();expect(host.textContent).toContain(account.email);await fill('input[type="password"]',"temporal sintética");await click("Siguiente");expect(host.textContent).toContain("Recuperar sesión");expect(host.textContent).not.toContain(account.email);expect(host.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe("");expect(host.querySelector('.account-guard')?.hasAttribute("hidden")).toBe(true);
});
it("cambio de cookie comunicado desde otra pestaña oculta borrador y exige identidad original",async()=>{
 let notify!:(id?:string)=>void;class Channel{onmessage:((event:{data:{accountId:string}})=>void)|null=null;constructor(){notify=(id="account-b")=>this.onmessage?.({data:{accountId:id}});}postMessage(){}close(){}}vi.stubGlobal("BroadcastChannel",Channel);
 history.replaceState(null,"","/partidas/01010101-0101-4101-8101-010101010101");const f=vi.fn().mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(session({id:"account-b"})));vi.stubGlobal("fetch",f);await render();const node=host.querySelector('[aria-label="Borrador"]');await act(async()=>notify(account.id));expect(node?.closest('[hidden]')).toBeNull();await act(async()=>notify());expect(node?.closest('[hidden][inert]')).not.toBeNull();await fill('input[type="password"]',"passphrase de fixture");await submit();expect(host.textContent).toContain("Cambiar de cuenta");expect(host.querySelector('[aria-label="Borrador"]')).toBe(node);expect(node?.closest('[hidden][inert]')).not.toBeNull();
});

it("dos Atrás durante decisión pendiente conservan URL, borrador y Adelante al cancelar",async()=>{
 vi.stubGlobal("fetch",vi.fn(async()=>response(session())));await render();await click("Abrir fixture");await click("Campañas");await act(async()=>{history.back();await new Promise(r=>setTimeout(r,50));});
 const retainedPath=location.pathname,node=host.querySelector('[aria-label="Borrador"]'),length=history.length;let resolve!:(accepted:boolean)=>void;leave.wait=()=>new Promise(r=>{resolve=r;});
 await act(async()=>{history.back();await new Promise(r=>setTimeout(r,50));});await act(async()=>{history.back();await new Promise(r=>setTimeout(r,50));});expect(location.pathname).toBe(retainedPath);expect(host.querySelector('[aria-label="Borrador"]')).toBe(node);
 await act(async()=>{resolve(false);});leave.wait=undefined;expect(history.length).toBe(length);await act(async()=>{history.forward();await new Promise(r=>setTimeout(r,50));});expect(location.pathname).toBe("/partidas");expect(history.length).toBe(length);
});
