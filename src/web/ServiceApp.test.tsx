// @vitest-environment jsdom
import { TableSession } from "../application/services/table-session";
import { privateFixture } from "../application/services/public-table-projection.fixture";
import { randomUUID } from "node:crypto";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ModalBackdrop } from "../renderer/src/components/aside/ModalBackdrop";
import { ServiceApp } from "./ServiceApp";
import { DialogBroker, DialogHost } from "./dialogs";
import { createBrowserClient } from "../infrastructure/browser/browser-client";
import { HttpTransport } from "../infrastructure/browser/http";
import { useTtrpgApi } from "../renderer/src/client/ClientProvider";
vi.mock("../renderer/src/App",()=>({App:({service}:{service:{logout:()=>Promise<void>}})=>{const api=useTtrpgApi("scenes");return <div><span>VTT privado DM</span><ModalBackdrop onClose={()=>{}}><input aria-label="Borrador portal" defaultValue="Secreto conservado"/></ModalBackdrop><input aria-label="Cambio privado"/><button onClick={()=>void api?.loadScene()}>Cargar escena</button><button onClick={()=>void service.logout()}>Cerrar sesión</button></div>;}}));
vi.mock("../renderer/src/PlayerApp",()=>({PlayerApp:({unavailableMessage}:{unavailableMessage:string})=><div>Jugador: {unavailableMessage}</div>}));
let host:HTMLDivElement,root:Root;
const session=(role="dm")=>({ok:true,role,expiresAt:"2026-10-29T12:00:00.000Z"});
const response=(value:unknown,status=200)=>new Response(status===204?null:JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
const fail=()=>response({ok:false,error:{code:"UNAUTHORIZED",message:"Clave inválida"}},401);
beforeEach(()=>{vi.spyOn(HttpTransport.prototype,"stream").mockImplementation((_path,signal)=>new Promise((_resolve,reject)=>{signal.addEventListener("abort",()=>reject(new Error("cerrado")),{once:true});}));Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement("div");document.body.append(host);root=createRoot(host);HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();vi.restoreAllMocks();});
async function render(){await act(async()=>root.render(<ServiceApp/>));}
async function click(text:string){const element=[...host.querySelectorAll("button")].find(b=>b.textContent===text);expect(element).toBeTruthy();await act(async()=>element!.click());}
async function fill(selector:string,value:string){const element=host.querySelector<HTMLInputElement>(selector)!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(element,value);element.dispatchEvent(new Event("input",{bubbles:true}));});}
async function submit(){await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));}
it("consulta inicial sin destello privado, acceso fallido y válido; limpia clave y logout",async()=>{
 let resolve!:(response:Response)=>void;const fetcher=vi.fn().mockImplementationOnce(()=>new Promise<Response>(r=>{resolve=r;})).mockResolvedValueOnce(fail()).mockResolvedValueOnce(response(session())).mockResolvedValueOnce(response(null,204));vi.stubGlobal("fetch",fetcher);
 await render();expect(host.textContent).toContain("Comprobando sesión");expect(host.textContent).not.toContain("VTT privado");await act(async()=>resolve(fail()));
 await fill('input[type="password"]',"incorrecta");await submit();expect(host.textContent).toContain("Clave inválida");expect(host.querySelector<HTMLInputElement>('input[type="password"]')!.value).toBe("");
 await fill('input[type="password"]',"d".repeat(32));await submit();expect(host.textContent).toContain("VTT privado DM");expect(fetcher.mock.calls[2][1].credentials).toBe("same-origin");
 await click("Cerrar sesión");expect(host.textContent).not.toContain("VTT privado DM");expect(host.textContent).toContain("Acceso a tu mesa");
});
it("rol jugador del servidor nunca monta App ni consulta recursos privados",async()=>{
 const fetcher=vi.fn(async()=>response(session("player")));vi.stubGlobal("fetch",fetcher);window.history.replaceState({},"","/?view=dm");await render();expect(host.textContent).toContain("Jugador:");expect(host.textContent).not.toContain("VTT privado");expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0]).toBeDefined();
});
it("selector vacío, error/reintento, confirmación y cancelación",async()=>{
 const broker=new DialogBroker();const fetcher=vi.fn().mockResolvedValueOnce(response({ok:true,scenes:[],total:0})).mockResolvedValueOnce(response({ok:false,error:{code:"INTERNAL_ERROR",message:"Reintenta carga"}},500)).mockResolvedValueOnce(response({ok:true,scenes:[{id:"01010101-0101-4101-8101-010101010101",name:"Escena muy larga",createdAt:"2026-10-29T12:00:00.000Z",updatedAt:"2026-10-29T12:00:00.000Z"}],total:1}));
 const browser=createBrowserClient(new HttpTransport(fetcher),broker);await act(async()=>root.render(<DialogHost broker={broker} browser={browser}/>));
 let picked!:Promise<string|null>;await act(async()=>{picked=broker.selectScene();});expect(host.textContent).toContain("No hay escenas guardadas");await click("Cancelar");expect(await picked).toBeNull();
 await act(async()=>{picked=broker.selectScene();});expect(host.textContent).toContain("Reintenta carga");await click("Reintentar");const select=host.querySelector("select")!;await act(async()=>{select.value="01010101-0101-4101-8101-010101010101";select.dispatchEvent(new Event("change",{bubbles:true}));});await click("Abrir escena");expect(await picked).toBe("scene:01010101-0101-4101-8101-010101010101");
});
it("diálogo cambios pendientes: guardar, descartar, cancelar y Escape",async()=>{
 const broker=new DialogBroker();const browser=createBrowserClient(new HttpTransport(vi.fn()),broker);await act(async()=>root.render(<DialogHost broker={broker} browser={browser}/>));
 for(const [label,value]of [["Guardar y continuar","save"],["Descartar","discard"],["Cancelar",null]] as const){let choice!:Promise<string|null>;await act(async()=>{choice=broker.leave();});await click(label);expect(await choice).toBe(value);}
 let choice!:Promise<string|null>;await act(async()=>{choice=broker.leave();});await act(async()=>host.querySelector("dialog")!.dispatchEvent(new Event("cancel",{cancelable:true})));expect(await choice).toBeNull();
});
it("expiración oculta DM, conserva cambios en memoria y solo recupera con el mismo rol",async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(response(session())).mockResolvedValueOnce(fail()).mockResolvedValueOnce(response(session("player"))).mockResolvedValueOnce(response(null,204)).mockResolvedValueOnce(response(session()));vi.stubGlobal("fetch",fetcher);await render();await fill('[aria-label="Cambio privado"]',"Pendiente privado");
 await click("Cargar escena");expect(host.textContent).toContain("Recuperar sesión");expect(host.querySelector('.service-workspace')?.hasAttribute("hidden")).toBe(true);expect(document.querySelector('[aria-label="Borrador portal"]')?.closest("[hidden][inert]")).not.toBeNull();expect(host.querySelector('select')?.disabled).toBe(true);
 await fill('input[type="password"]',"p".repeat(32));await submit();expect(host.textContent).toContain("La clave no corresponde");expect(host.querySelector('.service-workspace')?.hasAttribute("hidden")).toBe(true);
 await fill('input[type="password"]',"d".repeat(32));await submit();expect(host.querySelector('.service-workspace')?.hasAttribute("hidden")).toBe(false);expect(host.querySelector<HTMLInputElement>('[aria-label="Cambio privado"]')!.value).toBe("Pendiente privado");expect(document.querySelector<HTMLInputElement>('[aria-label="Borrador portal"]')!.value).toBe("Secreto conservado");expect(document.querySelector('[aria-label="Borrador portal"]')?.closest("[hidden], [inert]")).toBeNull();
});
it("descartar durante expiración ofrece cancelar sin prometer guardado; restaura foco",async()=>{
 const broker=new DialogBroker();const browser=createBrowserClient(new HttpTransport(vi.fn()),broker);await act(async()=>root.render(<><button>Disparador</button><DialogHost broker={broker} browser={browser}/></>));const trigger=host.querySelector('button')!;trigger.focus();let choice!:Promise<string|null>;await act(async()=>{choice=broker.discard();});expect(host.textContent).toContain("vuelve a acceder como DM");expect(host.textContent).not.toContain("Guardar y continuar");await click("Cancelar");expect(await choice).toBeNull();expect(document.activeElement).toBe(trigger);
});

it("anuncia estados y errores con Mesa cerrado sin anunciar reportes de cámara",async()=>{
  let controller!:ReadableStreamDefaultController<Uint8Array>;
  vi.mocked(HttpTransport.prototype.stream).mockResolvedValue(new Response(new ReadableStream<Uint8Array>({start(c){controller=c;}}),{headers:{"content-type":"text/event-stream"}}));
  vi.stubGlobal("fetch",vi.fn(async()=>response(session())));await render();
  const table=new TableSession(Date.now,randomUUID);
  const flush=async()=>act(async()=>{for(let i=0;i<20;i++)await Promise.resolve();});
  const dm=table.connect("dm","dm",e=>controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(e)}\n\n`)));
  const player=table.connect("p","player",()=>{});table.publish(privateFixture());await flush();
  const live=host.querySelector('.service-table-status > [role="status"]')!;
  expect(live.closest("details")).toBeNull();expect(host.querySelector('details')?.open).toBe(false);expect(live.textContent).toContain("cargando");
  table.imageStatus("p",player.id,table.revision,{imageUrl:table.state("player").snapshot!.mapImageUrl!,ok:false});await flush();expect(live.textContent).toContain("Error de imagen");
  table.imageStatus("p",player.id,table.revision,{imageUrl:table.state("player").snapshot!.mapImageUrl!,ok:true});table.ready("p",player.id,table.revision);await flush();expect(live.textContent).toContain("Jugador listo");
  const stable=live.textContent;table.report("p",player.id,{reportRevision:1,acknowledgedCommandRevision:null,camera:{center:{x:99,y:99},zoom:2},origin:"local-navigation",final:true});await flush();expect(live.textContent).toBe(stable);
  table.emit("render-error","Error de prueba seguro","dm");await flush();expect(host.querySelector('.service-table-status > [role="alert"]')?.textContent).toBe("Error de prueba seguro");
  controller.close();await flush();expect(live.textContent).toContain("desconectada");dm.close();player.close();
});

it("el fallo de logout jugador permanece visible en el flujo de Mesa cerrada",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(response(session("player"))).mockResolvedValueOnce(response({ok:false,error:{code:"INTERNAL_ERROR",message:"No se pudo cerrar sesión. Reintenta."}},503)));
  await render();await click("Cerrar sesión");
  const error=host.querySelector('.service-table-status > .service-player-error');
  expect(error?.getAttribute("role")).toBe("alert");expect(error?.textContent).toContain("No se pudo cerrar sesión");
  expect(error?.closest("details")).toBeNull();expect(host.querySelector('details')?.open).toBe(false);
  expect(host.textContent).toContain("Jugador:");
});
