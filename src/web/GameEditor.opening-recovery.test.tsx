// @vitest-environment jsdom
import { act, useEffect, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GameEditor } from "./GameEditor";
import { HttpTransport } from "../infrastructure/browser/http";
import { systemSeeds, type ResolvedSystem, type SystemVersion } from "../domain/systems/system-catalog";
import type { GameMetadata } from "../domain/games/game-metadata";
import type { OpeningReply } from "./service-model";
import type { CampaignSelection } from "../shared/contracts/campaigns";
import { DraftCoordinator } from "../application/services/draft-coordinator";
import type { DraftCheckpoint } from "../domain/drafts/draft";
import { contentHash } from "../domain/drafts/draft";
import { createDefaultScene } from "../domain/sessions/default-scene";
import type { ServiceWorkspace } from "./workspace";

const state=vi.hoisted(()=>({
  browser:undefined as unknown,
  mounts:0,
  restores:[] as DraftCheckpoint[],
  clear:vi.fn(),
  revalidate:vi.fn().mockResolvedValue(undefined),
  status:{phase:"connected",published:false,presence:null,error:null}
}));

vi.mock("../renderer/src/App",()=>({App:({service,tablePanel}:{service:ServiceWorkspace;tablePanel?:ReactNode})=>{
  const [restored,setRestored]=useState("sin restaurar");
  useEffect(()=>{state.mounts++;},[]);
  useEffect(()=>service.browser.drafts?.onRestore(async checkpoint=>{
    state.restores.push(checkpoint);
    setRestored(checkpoint.content.scene.name);
  }),[service.browser]);
  return <><input aria-label="Borrador retenido" defaultValue="contenido vivo"/><output aria-label="Contenido restaurado">{restored}</output>{tablePanel}</>;
}}));
vi.mock("./Participants",()=>({Participants:()=>null}));
vi.mock("../infrastructure/browser/browser-client",()=>({createBrowserClient:()=>state.browser}));
vi.mock("../infrastructure/browser/contextual-table-client",()=>({contextualTableClient:()=>({subscribeStatus:()=>()=>{},getStatus:()=>state.status,start:()=>()=>{},clear:()=>{}})}));

const id="01010101-0101-4101-8101-010101010101";
const at="2026-11-15T00:00:00.000Z";
const seed=systemSeeds[0];
const configuration:ResolvedSystem={ref:seed.ref,definition:seed.definition,hash:"a".repeat(64),availability:"enabled"};
const game:GameMetadata={id,ownerId:"dm",name:"Partida de prueba",systemRef:seed.ref,state:"ready",createdAt:at,updatedAt:at,revision:1};
const version:SystemVersion={...seed.ref,state:"published",createdAt:at,publishedAt:at,revision:1,availability:"enabled",definition:seed.definition,hash:configuration.hash,templates:{}};
const oldOpening:OpeningReply={ok:true,opening:{id,gameId:id,generation:1,revision:1,state:"open"},invitation:null,systemRef:seed.ref,status:"fresh"};
const nextOpening:OpeningReply={...oldOpening,opening:{...oldOpening.opening!,id:"02020202-0202-4202-8202-020202020202",generation:2,revision:2},invitationUrl:"https://example.test/nueva"};
const expiredOpening:OpeningReply={...oldOpening,opening:null,invitation:null,status:"expired"};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json"}});
const failedHeartbeat=()=>reply({ok:false,error:{code:"REVISION_CONFLICT",message:"La apertura anterior ya no es válida."}},409);

let host:HTMLDivElement,root:Root,http:HttpTransport;
beforeEach(()=>{
  Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
  state.browser=undefined;state.mounts=0;state.restores=[];state.clear.mockClear();state.revalidate.mockReset().mockResolvedValue(undefined);
  host=document.createElement("div");document.body.append(host);root=createRoot(host);
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};
  HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.restoreAllMocks();});

function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
async function checkpoint(name="Borrador que debe sobrevivir"):Promise<DraftCheckpoint>{
  const scene={...createDefaultScene(),name};
  const content={scene,bindings:{monsters:{}},view:{camera:scene.camera,sidebar:true,aside:true,selectedId:null}};
  return {schemaVersion:1,localDraftId:crypto.randomUUID(),ownerId:"dm",origin:location.origin,instanceId:null,
    context:{gameId:id,writerId:crypto.randomUUID(),parentDraftId:null,sceneId:null,baseRevision:0,systemRef:seed.ref,systemHash:configuration.hash},
    remote:null,sequence:1,hash:await contentHash(content),updatedAt:at,content,pending:null,confirmation:null,createKey:crypto.randomUUID(),confirmedHash:null};
}
function browser(){
  const drafts=new DraftCoordinator("dm",location.origin,{enabled:async()=>true,write:async()=>{}},{
    capabilities:async()=>null,list:async()=>({drafts:[],total:0}),create:async()=>{throw new Error("No debe crear borradores remotos");},
    get:async()=>{throw new Error("No debe leer borradores remotos");},put:async()=>{throw new Error("No debe publicar el borrador");},remove:async()=>{}
  });
  state.browser={client:{},drafts,clear:state.clear,revalidate:state.revalidate,
    localDrafts:{list:vi.fn().mockResolvedValue([]),read:vi.fn(),raw:vi.fn(),setEnabled:vi.fn()},
    latestSavedScene:vi.fn().mockResolvedValue(null),openSaved:vi.fn(),draftContent:vi.fn(),draftContext:vi.fn()};
  return drafts;
}
function path(input:RequestInfo|URL){return String(input);}
async function render(active=true,selection?:CampaignSelection){await act(async()=>root.render(<GameEditor http={http} gameId={id} active={active} expired={()=>{}} onExit={()=>{}} onLogout={async()=>{}} registerLeave={()=>()=>{}} selection={selection}/>));}
async function click(label:string){const button=[...host.querySelectorAll("button")].find(node=>node.textContent===label);expect(button).toBeDefined();await act(async()=>button!.click());}

/** Entra al editor y detiene el segundo heartbeat para poder instalar un checkpoint real antes del 409. */
async function enterWithRejectedHeartbeat(latest:()=>Response|Promise<Response>,selection?:CampaignSelection){
  const drafts=browser();
  const rejected=deferred<Response>();let heartbeat=0,openingGets=0;
  const fetcher=vi.fn<typeof fetch>(async input=>{
    const value=path(input);
    if(selection&&value.endsWith(`/campaigns/${id}`))return reply({ok:true,campaign:{id,name:"Campaña",description:"",coverAssetId:null,state:"active",systemRef:seed.ref,revision:1,createdAt:at,updatedAt:at}});
    if(selection&&value.endsWith(`/arcs/${selection.arcId}`))return reply({ok:true,arc:{id:selection.arcId,campaignId:id,name:"Arco",description:"",coverAssetId:null,revision:1,createdAt:at,updatedAt:at,sceneCount:1}});
    if(selection&&value.includes(`/arcs/${selection.arcId}/scenes`))return reply({ok:true,items:[{sceneId:selection.sceneId,arcId:selection.arcId,campaignId:id,name:"Escena",revision:1,coverRevision:0,customCoverAssetId:null,mapCount:0,map0ImagePath:null,map0AssetId:null,cover:{source:"placeholder"},writeBlock:null}],total:1,limit:100,offset:0});
    if(value.endsWith("/configuration"))return reply({ok:true,configuration});
    if(value.includes("/versions/"))return reply({ok:true,version});
    if(value.endsWith(`/dm/games/${id}`))return reply({ok:true,game});
    if(value.endsWith("/opening")&&!value.endsWith("/heartbeat")){openingGets++;return openingGets===1?reply(oldOpening):latest();}
    if(value.endsWith("/heartbeat")){heartbeat++;return heartbeat===1?reply(oldOpening):rejected.promise;}
    throw new Error(`Ruta inesperada: ${value}`);
  });
  http=new HttpTransport(fetcher);http.bindAccount("dm");
  await render(true,selection);
  if(selection)await vi.waitFor(()=>expect(host.querySelector('[aria-label="Borrador retenido"]')).not.toBeNull());
  else {await vi.waitFor(()=>expect(host.textContent).toContain("Continuar partida"));await click("Continuar partida");}
  await vi.waitFor(()=>expect(host.querySelector('[aria-label="Borrador retenido"]')).not.toBeNull());
  const value=await checkpoint();await drafts.restore(value);
  await act(async()=>rejected.resolve(failedHeartbeat()));
  await vi.waitFor(()=>expect(host.querySelector('dialog[aria-label="La apertura de la partida cambió"]')).not.toBeNull());
  return {drafts,value,fetcher,heartbeat:()=>heartbeat,openingGets:()=>openingGets};
}

it("con borradores habilitados muestra el 409 de heartbeat, consulta una vez y Recuperar no repite la apertura vieja",async()=>{
  const flow=await enterWithRejectedHeartbeat(()=>reply(expiredOpening));
  expect(host.textContent).toContain("La apertura anterior ya no es válida.");
  expect(flow.openingGets()).toBe(2);
  expect(flow.heartbeat()).toBe(2);
  await click("Recuperar borrador");
  await vi.waitFor(()=>expect(state.restores).toHaveLength(2));
  expect(flow.openingGets()).toBe(2);
  expect(flow.heartbeat()).toBe(2);
  expect(host.querySelector<HTMLInputElement>('[aria-label="Borrador retenido"]')?.value).toBe("contenido vivo");
});

it("un GET de apertura fallido no inicia una apertura sin confirmación",async()=>{
  const flow=await enterWithRejectedHeartbeat(()=>reply({ok:false,error:{code:"UNAVAILABLE",message:"No se pudo leer la apertura."}},503));
  await vi.waitFor(()=>expect(host.textContent).toContain("Reintentar comprobación"));
  expect(flow.fetcher.mock.calls.some(([url])=>path(url).endsWith("/opening/start"))).toBe(false);
  expect(flow.heartbeat()).toBe(2);
});

it("Iniciar nueva apertura conserva el checkpoint en el editor remountado y no publica",async()=>{
  const flow=await enterWithRejectedHeartbeat(()=>reply(expiredOpening));
  const fallback=flow.fetcher.getMockImplementation()!;
  flow.fetcher.mockImplementation(async(input,init)=>{
    const value=path(input);
    if(value.endsWith("/opening/start"))return reply(nextOpening);
    if(value.endsWith("/opening")&&!value.endsWith("/heartbeat"))return reply(nextOpening);
    if(value.endsWith("/heartbeat"))return reply(nextOpening);
    return fallback(input,init);
  });
  const restores=state.restores.length;
  await click("Iniciar nueva apertura");
  await vi.waitFor(()=>expect(state.restores.length).toBeGreaterThan(restores));
  expect(state.restores.at(-1)?.content.scene.name).toBe(flow.value.content.scene.name);
  expect(host.querySelector('[aria-label="Contenido restaurado"]')?.textContent).toBe(flow.value.content.scene.name);
  expect(flow.fetcher.mock.calls.some(([url])=>/publish|projection|table/.test(path(url)))).toBe(false);
});

it("Continuar con la misma apertura conserva el montaje del editor y traspasa el checkpoint",async()=>{
  const flow=await enterWithRejectedHeartbeat(()=>reply(oldOpening));
  const before=host.querySelector<HTMLInputElement>('[aria-label="Borrador retenido"]')!;
  const mounts=state.mounts,fallback=flow.fetcher.getMockImplementation()!;
  flow.fetcher.mockImplementation(async(input,init)=>{
    const value=path(input);
    if(value.endsWith("/heartbeat"))return reply(oldOpening);
    if(value.endsWith("/opening")&&!value.endsWith("/heartbeat"))return reply(oldOpening);
    return fallback(input,init);
  });
  const restores=state.restores.length;
  await click("Continuar partida");
  await vi.waitFor(()=>expect(state.restores.length).toBeGreaterThan(restores));
  expect(host.querySelector('[aria-label="Borrador retenido"]')).toBe(before);
  expect(state.mounts).toBe(mounts);
  expect(state.restores.at(-1)?.content.scene.name).toBe(flow.value.content.scene.name);
});

it("si la apertura cambia antes del CAS conserva el borrador y comunica un error recuperable",async()=>{
  const flow=await enterWithRejectedHeartbeat(()=>reply(expiredOpening));
  const changed={...nextOpening,opening:{...nextOpening.opening!,id:"03030303-0303-4303-8303-030303030303",generation:3,revision:3}};
  const fallback=flow.fetcher.getMockImplementation()!;
  flow.fetcher.mockImplementation(async(input,init)=>{
    const value=path(input);
    if(value.endsWith("/opening/start"))return reply(nextOpening);
    if(value.endsWith("/opening")&&!value.endsWith("/heartbeat"))return reply(changed);
    return fallback(input,init);
  });
  await click("Iniciar nueva apertura");
  await vi.waitFor(()=>expect(host.textContent).toContain("La apertura cambió antes de continuar"));
  expect(state.restores).toHaveLength(1);
  expect(host.querySelector('dialog[aria-label="La apertura de la partida cambió"]')).not.toBeNull();
  expect(flow.fetcher.mock.calls.filter(([url])=>path(url).endsWith("/opening/start"))).toHaveLength(1);
});

it("una respuesta de Iniciar tardía tras desactivar y reactivar no adopta una apertura vieja",async()=>{
  const flow=await enterWithRejectedHeartbeat(()=>reply(expiredOpening));
  const start=deferred<Response>(),fallback=flow.fetcher.getMockImplementation()!;
  flow.fetcher.mockImplementation(async(input,init)=>path(input).endsWith("/opening/start")?start.promise:fallback(input,init));
  await click("Iniciar nueva apertura");
  await render(false);await render(true);
  await act(async()=>start.resolve(reply(nextOpening)));
  expect(state.restores).toHaveLength(1);
  expect(host.querySelector('[aria-label="Contenido restaurado"]')?.textContent).toBe(flow.value.content.scene.name);
});

it("una respuesta de Iniciar tardía tras cambiar la escena no adopta su apertura ni el checkpoint",async()=>{
  const first:CampaignSelection={campaignId:id,arcId:"11111111-1111-4111-8111-111111111111",sceneId:"22222222-2222-4222-8222-222222222222"};
  const second:CampaignSelection={campaignId:id,arcId:"33333333-3333-4333-8333-333333333333",sceneId:"44444444-4444-4444-8444-444444444444"};
  const flow=await enterWithRejectedHeartbeat(()=>reply(expiredOpening),first);
  const start=deferred<Response>(),fallback=flow.fetcher.getMockImplementation()!;
  flow.fetcher.mockImplementation(async(input,init)=>path(input).endsWith("/opening/start")?start.promise:fallback(input,init));
  await click("Iniciar nueva apertura");
  await render(true,second);
  await act(async()=>start.resolve(reply(nextOpening)));
  expect(state.restores).toHaveLength(1);
  expect(host.textContent).not.toContain("https://example.test/nueva");
  expect(host.querySelector('[aria-label="Contenido restaurado"]')).toBeNull();
});
