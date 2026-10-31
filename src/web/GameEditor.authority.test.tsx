// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GameEditor } from "./GameEditor";
import { AccountAccess } from "./AccountAccess";
import type { ServiceWorkspace } from "./workspace";
import { DialogBroker } from "./dialogs";
import { HttpTransport, ServiceError } from "../infrastructure/browser/http";
import { systemSeeds } from "../domain/systems/system-catalog";

const state=vi.hoisted(()=>({revalidate:vi.fn(),expired:vi.fn(),guard:undefined as undefined|(()=>Promise<boolean>),broker:undefined as undefined|DialogBroker,terminals:[] as Array<(reason:string)=>void>,status:{phase:"connected",published:false,presence:null,error:null}}));
vi.mock("../renderer/src/App",()=>({App:({service}:{service:ServiceWorkspace})=>{
  useEffect(()=>service.registerLeave?.(state.guard??(async()=>await service.confirmLeave()!==null)),[service]);
  return <input aria-label="Borrador retenido" defaultValue="inicial"/>;
}}));
vi.mock("../infrastructure/browser/browser-client",()=>({createBrowserClient:(_http:HttpTransport,broker:DialogBroker)=>{state.broker=broker;return {client:{},revalidate:state.revalidate,clear:vi.fn()};}}));
vi.mock("../infrastructure/browser/contextual-table-client",()=>({contextualTableClient:(_context:unknown,onTerminal:(reason:string)=>void)=>{state.terminals.push(onTerminal);return {subscribeStatus:()=>()=>{},getStatus:()=>state.status,start:()=>()=>{},clear:()=>{}};}}));
const id="01010101-0101-4101-8101-010101010101",at="2026-10-31T00:00:00.000Z",seed=systemSeeds[0];
const configuration={ref:seed.ref,definition:seed.definition,hash:"a".repeat(64),availability:"enabled"};
const game={id,ownerId:"a",name:"Campaña",systemRef:seed.ref,state:"ready",createdAt:at,updatedAt:at,revision:1};
const version={...seed.ref,state:"published",createdAt:at,publishedAt:at,revision:1,availability:"enabled",definition:seed.definition,hash:configuration.hash,templates:{}};
const opening={ok:true,opening:{id,gameId:id,generation:1,revision:1,state:"open"},invitation:null,systemRef:seed.ref,status:"fresh"};
const roster={ok:true,openingId:id,generation:1,status:"open",items:[{participantId:"player",alias:"Luz",discriminator:1,admission:"admitted",presence:"connected",admittedAt:at}],total:1,revision:1,presenceSequence:1};
const reply=(value:unknown)=>new Response(JSON.stringify(value),{headers:{"content-type":"application/json"}});
let host:HTMLDivElement,root:Root,http:HttpTransport,fetcher:ReturnType<typeof vi.fn<typeof fetch>>;
let close:ReturnType<typeof vi.fn<() => void>>;
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});state.guard=undefined;state.broker=undefined;state.terminals=[];state.expired.mockClear();state.revalidate.mockReset().mockResolvedValue(undefined);
  host=document.createElement("div");document.body.append(host);root=createRoot(host);
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};
  close=vi.fn(function(this:HTMLDialogElement){this.removeAttribute("open");});HTMLDialogElement.prototype.close=close;
  fetcher=vi.fn<typeof fetch>(async input=>{const path=String(input);return reply(path.includes("participants?")?roster:path.endsWith("configuration")?{ok:true,configuration}:path.includes("/versions/")?{ok:true,version}:path.endsWith("/opening")||path.endsWith("heartbeat")?opening:{ok:true,game});});
  http=new HttpTransport(fetcher);http.bindAccount("a");
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});
async function render(active:boolean){await act(async()=>root.render(<><div hidden={!active} inert={!active}><GameEditor http={http} gameId={id} active={active} expired={state.expired} onExit={()=>{}} onLogout={async()=>{}} registerLeave={()=>()=>{}}/></div>{!active&&<AccountAccess retained http={http} onAccount={()=>{}}/>}</>));}
async function click(label:string){const button=[...host.querySelectorAll("button")].find(b=>b.textContent===label);expect(button).toBeTruthy();await act(async()=>button!.click());}
async function start(){await render(true);await click("Continuar partida");const node=host.querySelector<HTMLInputElement>('[aria-label="Borrador retenido"]')!;expect(node).toBeTruthy();node.value="pendiente privado";return node;}
function assertDraft(node:HTMLInputElement){expect(host.querySelector('[aria-label="Borrador retenido"]')).toBe(node);expect(node.value).toBe("pendiente privado");}
for(const label of ["Cerrar partida","Reabrir partida","Crear enlace nuevo","Expulsar Luz #1"])it(`suspender con ${label} cancela el modal, cierra dialog y conserva borrador al recuperar`,async()=>{
  const node=await start();await click(label);const dialog=host.querySelector<HTMLDialogElement>("dialog")!;expect(dialog.open).toBe(true);
  await render(false);expect(host.querySelector("dialog")).toBeNull();expect(dialog.open).toBe(false);expect(close).toHaveBeenCalled();expect(document.activeElement).toBe(host.querySelector('input[type="email"]'));assertDraft(node);
  await render(true);expect(host.querySelector("dialog")).toBeNull();assertDraft(node);
  expect(fetcher.mock.calls.filter(([url,init])=>init?.method==="POST"&&!String(url).endsWith("heartbeat"))).toHaveLength(0);
  await click(label);expect(host.querySelector("dialog")?.getAttribute("aria-label")).toBe(label.startsWith("Expulsar")?"Expulsar participante":label);
});
for(const label of ["Cerrar partida","Reabrir partida","Crear enlace nuevo","Expulsar Luz #1"])it(`respuesta tardía de ${label} no restaura la decisión tras recuperar`,async()=>{
  const node=await start();let finish!:(value:typeof opening)=>void;vi.spyOn(http,"request").mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  await click(label);expect(host.querySelector("dialog")).toBeNull();await render(false);await render(true);await act(async()=>finish(opening));expect(host.querySelector("dialog")).toBeNull();assertDraft(node);
});
it("suspensión cancela el guard anidado y no envía cierre ni reabre una decisión del broker",async()=>{
  const node=await start();await click("Cerrar partida");await click("Confirmar");expect(host.querySelectorAll("dialog")).toHaveLength(2);
  await render(false);expect(host.querySelector("dialog")).toBeNull();expect(await state.broker!.leave()).toBeNull();
  await render(true);expect(host.querySelector("dialog")).toBeNull();assertDraft(node);expect(fetcher.mock.calls.some(([url])=>String(url).endsWith("/opening/close"))).toBe(false);
});
it("guard resuelto tarde no envía una reapertura aun si la cuenta ya se recuperó",async()=>{
  let finish!:(accept:boolean)=>void;state.guard=()=>new Promise(resolve=>{finish=resolve;});const node=await start();await click("Reabrir partida");await click("Confirmar");await render(false);await render(true);await act(async()=>finish(true));
  expect(fetcher.mock.calls.some(([url])=>String(url).endsWith("/opening/reopen"))).toBe(false);expect(host.querySelector("dialog")).toBeNull();assertDraft(node);
});
for(const code of [503,409])it(`revocación durante diálogo de revalidación ${code} libera recuperación y revalida de nuevo`,async()=>{
  const node=await start();await render(false);state.revalidate.mockRejectedValueOnce(new ServiceError("VALIDATION","Comprobación pendiente",code));await render(true);const dialog=host.querySelector<HTMLDialogElement>("dialog")!;expect(dialog.open).toBe(true);
  await render(false);expect(host.querySelector("dialog")).toBeNull();expect(dialog.open).toBe(false);expect(document.activeElement).toBe(host.querySelector('input[type="email"]'));await render(true);expect(host.querySelector("dialog")).toBeNull();assertDraft(node);expect(state.revalidate).toHaveBeenCalledTimes(3);
});
it("resultado de expulsión posterior al desmontaje no devuelve invitación al editor recuperado",async()=>{
  const node=await start();await click("Expulsar Luz #1");let finish!:(value:unknown)=>void;vi.spyOn(http,"request").mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));await click("Confirmar expulsión");await render(false);await render(true);await act(async()=>finish({ok:true,participantId:"player",outcome:"revoked",secretAvailable:true,replayed:false,invitationUrl:"enlace obsoleto"}));
  expect(host.querySelector<HTMLInputElement>('input[readonly]')?.value).toBe("");expect(host.querySelector("dialog")).toBeNull();assertDraft(node);
});

it("resultado tardío de renovación no repone enlace ni decisión tras recuperar",async()=>{
  const node=await start();await click("Crear enlace nuevo");let finish!:(value:unknown)=>void;vi.spyOn(http,"request").mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));await click("Confirmar");await render(false);await render(true);await act(async()=>finish({...opening,invitationUrl:"enlace obsoleto"}));
  expect(host.querySelector<HTMLInputElement>('input[readonly]')?.value).toBe("");expect(host.querySelector("dialog")).toBeNull();assertDraft(node);
});

const sessionReply={ok:true,account:{id:"a",email:"a@example.test",name:"A",role:"dm",enabled:true,mustChangePassword:false,emailVerified:false,createdAt:at,updatedAt:at},sessionId:"session",expiresAt:at};
function deferredResponse(){let resolve!:(response:Response)=>void;const promise=new Promise<Response>(done=>{resolve=done;});return {promise,resolve};}
for(const action of ["close","reopen"] as const)for(const order of ["terminal-before-post","post-before-terminal","session-after-next-opening"] as const)it(`${action}: ${order} reconcilia apertura y descarta terminal de generación anterior`,async()=>{
  state.guard=async()=>true;await start();const oldTerminal=state.terminals.at(-1)!;await click(action==="close"?"Cerrar partida":"Reabrir partida");
  const post=deferredResponse(),sessionCheck=deferredResponse(),refresh=deferredResponse();
  const next={...opening,opening:{...opening.opening,id:"02020202-0202-4202-8202-020202020202",generation:2,revision:2}};
  const closed={...opening,opening:{...opening.opening,state:"closed",revision:2},status:"expired"};
  let refreshed=false,sessionChecks=0;const fallback=fetcher.getMockImplementation()!;
  fetcher.mockImplementation((input,init)=>{
    const path=String(input);
    if(path.endsWith(`/opening/${action}`))return post.promise;
    if(path.endsWith("/identity/session"))return ++sessionChecks===1?sessionCheck.promise:Promise.resolve(reply(sessionReply));
    if(path.endsWith("/opening")&&!refreshed)return refresh.promise;
    if(path.endsWith("/opening")||path.endsWith("/opening/start")||path.endsWith("heartbeat"))return Promise.resolve(reply(next));
    return fallback(input,init);
  });
  await click("Confirmar");
  if(order!=="post-before-terminal")await act(async()=>oldTerminal("access-ended"));
  if(order==="terminal-before-post")await act(async()=>sessionCheck.resolve(reply(sessionReply)));
  await act(async()=>post.resolve(action==="close"?new Response(null,{status:204}):reply(next)));
  if(order==="post-before-terminal"){await act(async()=>oldTerminal("access-ended"));await act(async()=>sessionCheck.resolve(reply(sessionReply)));}
  await act(async()=>{refreshed=true;refresh.resolve(reply(action==="close"?closed:next));});
  expect(host.textContent).not.toContain("Tu acceso a esta partida ya no está disponible");expect(host.querySelector("dialog")).toBeNull();
  if(action==="close"){
    expect(host.textContent).toContain("Estado del anfitrión: Acceso caducado");expect(host.textContent).not.toContain("Continuar partida");await click("Iniciar partida");
    expect(fetcher.mock.calls.some(([input])=>String(input).endsWith("/opening/start"))).toBe(true);
  }
  expect(host.querySelector('[aria-label="Borrador retenido"]')?.closest('[hidden]')).toBeNull();
  expect(state.terminals).toHaveLength(2);
  if(order==="session-after-next-opening")await act(async()=>sessionCheck.resolve(reply(sessionReply)));
  const requests=fetcher.mock.calls.length;await act(async()=>oldTerminal("access-ended"));expect(fetcher.mock.calls).toHaveLength(requests);
  expect(host.querySelector("dialog")).toBeNull();expect(host.querySelector('[aria-label="Borrador retenido"]')?.closest('[hidden]')).toBeNull();
  // La mesa nueva sigue respondiendo a sus propios terminales.
  await act(async()=>state.terminals.at(-1)!("replaced"));expect(host.querySelector('dialog[aria-label="Borrador conservado"]')).not.toBeNull();expect(host.textContent).toContain("Esta partida está abierta en otra pestaña");
});
it("un terminal durante cierre incierto sigue congelando la apertura anterior",async()=>{
  state.guard=async()=>true;const node=await start();await click("Cerrar partida");const post=deferredResponse(),fallback=fetcher.getMockImplementation()!;
  fetcher.mockImplementation((input,init)=>String(input).endsWith("/opening/close")?post.promise:String(input).endsWith("/identity/session")?Promise.resolve(reply(sessionReply)):fallback(input,init));
  await click("Confirmar");await act(async()=>state.terminals.at(-1)!("access-ended"));await act(async()=>post.resolve(new Response(JSON.stringify({ok:false,error:{code:"UNAVAILABLE",message:"Cierre incierto"}}),{status:503,headers:{"content-type":"application/json"}})));
  expect(host.querySelector('dialog[aria-label="Borrador conservado"]')).not.toBeNull();assertDraft(node);expect(node.closest('[hidden]')).not.toBeNull();
});

it("cierre propio no omite 401 ni permite reactivar una respuesta tras suspender autoridad",async()=>{
  const expired=vi.fn();http=new HttpTransport(fetcher,expired);http.bindAccount("a");state.guard=async()=>true;const node=await start();await click("Cerrar partida");const post=deferredResponse(),fallback=fetcher.getMockImplementation()!;
  fetcher.mockImplementation((input,init)=>String(input).endsWith("/opening/close")?post.promise:String(input).endsWith("/identity/session")?Promise.resolve(new Response(JSON.stringify({ok:false,error:{code:"UNAUTHORIZED",message:"Sesión revocada"}}),{status:401,headers:{"content-type":"application/json"}})):fallback(input,init));
  await click("Confirmar");await act(async()=>state.terminals.at(-1)!("access-ended"));expect(expired).toHaveBeenCalledTimes(1);await render(false);await act(async()=>post.resolve(new Response(null,{status:204})));expect(host.querySelector("dialog")).toBeNull();assertDraft(node);expect(document.activeElement).toBe(host.querySelector('input[type="email"]'));
});

for(const status of [503,401])it(`sesión de apertura vieja responde ${status} después de reabrir: no congela contexto nuevo y mantiene autoridad HTTP`,async()=>{
  const expired=vi.fn();http=new HttpTransport(fetcher,expired);http.bindAccount("a");state.guard=async()=>true;await start();await click("Reabrir partida");const post=deferredResponse(),sessionCheck=deferredResponse(),fallback=fetcher.getMockImplementation()!;
  const next={...opening,opening:{...opening.opening,id:"02020202-0202-4202-8202-020202020202",generation:2,revision:2}};
  fetcher.mockImplementation((input,init)=>{const path=String(input);if(path.endsWith("/opening/reopen"))return post.promise;if(path.endsWith("/identity/session"))return sessionCheck.promise;if(path.endsWith("/opening")||path.endsWith("heartbeat"))return Promise.resolve(reply(next));return fallback(input,init);});
  await click("Confirmar");await act(async()=>state.terminals[0]("access-ended"));await act(async()=>post.resolve(reply(next)));
  expect(state.terminals).toHaveLength(2);await act(async()=>sessionCheck.resolve(new Response(JSON.stringify({ok:false,error:{code:status===401?"UNAUTHORIZED":"UNAVAILABLE",message:"Respuesta tardía"}}),{status,headers:{"content-type":"application/json"}})));
  expect(state.expired).not.toHaveBeenCalled();expect(expired).toHaveBeenCalledTimes(status===401?1:0);expect(host.querySelector("dialog")).toBeNull();
  if(status===401)await render(false);
  expect(host.querySelector('[aria-label="Borrador retenido"]')?.closest('[hidden]')!==null).toBe(status===401);
});
