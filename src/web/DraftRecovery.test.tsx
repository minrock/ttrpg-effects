// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DraftRecovery } from "./DraftRecovery";
import type { BrowserClient } from "../infrastructure/browser/browser-client";
import { ServiceError } from "../infrastructure/browser/http";
import { createDefaultScene } from "../domain/sessions/default-scene";
import type { DraftCheckpoint } from "../domain/drafts/draft";

let host:HTMLDivElement,root:Root;
const uuid=()=>crypto.randomUUID();
beforeEach(()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});host=document.createElement("div");document.body.append(host);root=createRoot(host);
 HTMLDialogElement.prototype.showModal=function(){this.setAttribute("open","");};HTMLDialogElement.prototype.close=function(){this.removeAttribute("open");};
});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();});
function setup(){
 const scene=createDefaultScene(),gameId=uuid(),sceneId=uuid();
 const cp:DraftCheckpoint={schemaVersion:1,localDraftId:uuid(),ownerId:"dm",origin:location.origin,instanceId:null,context:{gameId,writerId:uuid(),parentDraftId:null,sceneId,baseRevision:1,systemRef:{systemId:"generic",version:1},systemHash:"hash"},content:{scene,bindings:{monsters:{}},view:{camera:scene.camera,sidebar:true,aside:true,selectedId:null}},remote:null,pending:null,sequence:1,hash:"hash",confirmedHash:null,createKey:uuid(),updatedAt:new Date().toISOString()};
 const index={id:cp.localDraftId,context:cp.context,updatedAt:cp.updatedAt};
 const status={local:"Guardado en este dispositivo",remote:"Servidor sin conexión",confirmed:"Cambios sin confirmar",error:"",enabled:true,available:null};
 const restore=vi.fn().mockResolvedValue(undefined),read=vi.fn().mockResolvedValue(cp),remoteList=vi.fn(()=>new Promise(()=>{}));
 const browser={drafts:{ownerId:"dm",origin:location.origin,subscribe:()=>()=>{},getStatus:()=>status,checkpoint:null,flushLocal:vi.fn().mockResolvedValue(undefined),restore,remote:{list:remoteList}},localDrafts:{list:vi.fn().mockResolvedValue([index]),read,raw:vi.fn(),remove:vi.fn()},openSaved:vi.fn().mockResolvedValue({ok:true,scene,filePath:`scene:${sceneId}`}),draftContent:vi.fn((scene,view)=>({scene,view,bindings:{monsters:{}}})),draftContext:vi.fn(()=>cp.context),listScenes:vi.fn().mockResolvedValue({scenes:[],total:0})} as unknown as BrowserClient;
 const onRecovered=vi.fn(),onExit=vi.fn();
 const render=async(selectedSceneId:string|null=sceneId)=>act(async()=>root.render(<DraftRecovery browser={browser} gameId={gameId} active onRecovered={onRecovered} onExit={onExit} selectedSceneId={selectedSceneId??undefined}/>));
 const click=async(label:string)=>act(async()=>{const node=[...host.querySelectorAll("button")].find(b=>b.textContent===label);expect(node).toBeDefined();node!.click();});
 return {browser,cp,restore,read,remoteList,onRecovered,onExit,render,click};
}
it("ofrece la copia contextual directamente sin selector ni consulta remota",async()=>{
 const t=setup();await t.render();expect(host.querySelector("dialog")?.getAttribute("aria-label")).toContain("Cambios sin guardar");
 expect(host.querySelector("select")).toBeNull();expect(t.remoteList).not.toHaveBeenCalled();
 expect(host.querySelector('[aria-label="Recuperar estado local"]')).toBeNull();
 await t.click("Recuperar borrador");expect(t.read).toHaveBeenCalledWith("dm",location.origin,t.cp.localDraftId);expect(t.restore).toHaveBeenCalledWith(expect.objectContaining({content:t.cp.content,pending:null,confirmation:null}));expect(t.onRecovered).toHaveBeenCalledOnce();expect(host.querySelector("dialog")).toBeNull();
});
it("volver al arco cierra la recuperación contextual sin dejar el editor esperando",async()=>{
 const t=setup();await t.render();await t.click("Volver al arco");expect(t.onExit).toHaveBeenCalledOnce();expect(host.querySelector("dialog")).toBeNull();
});
it("cargar mapa recupera la escena confirmada sin borrar ni leer el cuerpo local",async()=>{
 const t=setup();await t.render();await t.click("Abrir escena guardada");await vi.waitFor(()=>expect(t.restore).toHaveBeenCalled());expect(t.browser.openSaved).toHaveBeenCalledWith(`scene:${t.cp.context.sceneId}`);
 expect(t.restore).toHaveBeenCalledWith(expect.objectContaining({context:t.cp.context}),{confirmed:true});expect(t.read).not.toHaveBeenCalled();expect(t.browser.localDrafts.remove).not.toHaveBeenCalled();
});
it("si hay conflicto recupera como copia sin sobrescribir el origen",async()=>{
 const t=setup();t.restore.mockRejectedValueOnce(new ServiceError("REVISION_CONFLICT","Cambió la escena",409));await t.render();await t.click("Recuperar borrador");
 expect(t.restore).toHaveBeenCalledTimes(2);expect(t.restore.mock.calls[1][0].context.sceneId).toBeNull();expect(t.restore.mock.calls[1][0].context.baseRevision).toBe(0);expect(t.restore.mock.calls[1][0].content.scene).not.toBe(t.cp.content.scene);expect(t.cp.context.sceneId).not.toBeNull();expect(t.browser.localDrafts.remove).not.toHaveBeenCalled();
});
it("una copia ilegible permite cargar el mapa y permanece exportable",async()=>{
 const t=setup();t.read.mockRejectedValue(new Error("El respaldo está dañado"));await t.render();await t.click("Recuperar borrador");expect(host.querySelector('[role="alert"]')?.textContent).toContain("dañado");expect(t.onRecovered).not.toHaveBeenCalled();
 await t.click("Abrir escena guardada");await vi.waitFor(()=>expect(t.onRecovered).toHaveBeenCalledOnce());expect(t.browser.localDrafts.remove).not.toHaveBeenCalled();
});
it("una copia de otra escena no abre recuperación al entrar en la seleccionada",async()=>{
 const t=setup(),selected=uuid();await t.render(selected);expect(host.querySelector("dialog")).toBeNull();await vi.waitFor(()=>expect(t.browser.openSaved).toHaveBeenCalledWith(`scene:${selected}`));expect(t.read).not.toHaveBeenCalled();
});

it("si la escena contextual fue eliminada no ofrece elegir otra ni pierde el respaldo",async()=>{
 const t=setup();vi.mocked(t.browser.openSaved).mockRejectedValue(new ServiceError("NOT_FOUND","Escena ausente",404));await t.render();await t.click("Abrir escena guardada");expect(host.textContent).toContain("ya no está disponible");expect(host.textContent).not.toContain("Escenas guardadas en el servicio");expect(t.browser.localDrafts.remove).not.toHaveBeenCalled();
});

it("al reabrir una copia ya confirmada carga el servidor sin pedir recuperación",async()=>{
 const t=setup();t.cp.confirmedHash=t.cp.hash;
 vi.mocked(t.browser.localDrafts.list).mockResolvedValue([{id:t.cp.localDraftId,context:t.cp.context,updatedAt:t.cp.updatedAt,hash:t.cp.hash,confirmedHash:t.cp.hash} as never]);
 await t.render();expect(host.querySelector("dialog")).toBeNull();expect(t.browser.openSaved).toHaveBeenCalledWith(`scene:${t.cp.context.sceneId}`);expect(t.restore).toHaveBeenCalledWith(expect.anything(),{confirmed:true});
});

it("sin IndexedDB carga la última escena confirmada de la partida",async()=>{
 const t=setup();vi.mocked(t.browser.localDrafts.list).mockResolvedValue([]);t.browser.latestSavedScene=vi.fn().mockResolvedValue(t.cp.context.sceneId);
 await t.render();expect(host.querySelector("dialog")).toBeNull();await vi.waitFor(()=>expect(t.restore).toHaveBeenCalled());expect(t.browser.openSaved).toHaveBeenCalledWith(`scene:${t.cp.context.sceneId}`);
});
it("en la ruta legada recupera el único lienzo sin guardar, sin escoger otra escena",async()=>{
 const t=setup();t.cp.context.sceneId=null;vi.mocked(t.browser.localDrafts.list).mockResolvedValue([{id:t.cp.localDraftId,context:t.cp.context,updatedAt:t.cp.updatedAt}] as never);t.browser.latestSavedScene=vi.fn().mockResolvedValue(null);
 await t.render(null);expect(host.textContent).toContain("Cambios sin guardar");expect(t.browser.openSaved).not.toHaveBeenCalled();
});
it("una escena seleccionada carga su ID exacto y nunca sustituye la última escena",async()=>{
 const t=setup(),selected=uuid();vi.mocked(t.browser.localDrafts.list).mockResolvedValue([]);t.browser.latestSavedScene=vi.fn().mockResolvedValue(t.cp.context.sceneId);
 await t.render(selected);await vi.waitFor(()=>expect(t.restore).toHaveBeenCalled());expect(t.browser.openSaved).toHaveBeenCalledWith(`scene:${selected}`);expect(t.browser.latestSavedScene).not.toHaveBeenCalled();
});
it("cambios locales posteriores al guardado sí ofrecen recuperación",async()=>{
 const t=setup();vi.mocked(t.browser.localDrafts.list).mockResolvedValue([{id:t.cp.localDraftId,context:t.cp.context,updatedAt:t.cp.updatedAt,hash:"nuevo",confirmedHash:"anterior",sceneHash:"figura nueva",confirmedSceneHash:"figura anterior"} as never]);
 await t.render();expect(host.textContent).toContain("Cambios sin guardar");expect(t.browser.openSaved).not.toHaveBeenCalled();
});
it("mover cámara o paneles no dispara recuperación de una escena ya guardada",async()=>{
 const t=setup();vi.mocked(t.browser.localDrafts.list).mockResolvedValue([{id:t.cp.localDraftId,context:t.cp.context,updatedAt:t.cp.updatedAt,hash:"vista nueva",confirmedHash:"vista anterior",sceneHash:"mismo documento",confirmedSceneHash:"mismo documento"} as never]);
 await t.render();expect(host.querySelector("dialog")).toBeNull();await vi.waitFor(()=>expect(t.restore).toHaveBeenCalled());
});
it("una confirmación perdida se concilia con el servidor y no pide recuperar lo ya guardado",async()=>{
 const t=setup();t.browser.isDraftSaved=vi.fn().mockResolvedValue(true);
 await t.render();expect(host.querySelector("dialog")).toBeNull();await vi.waitFor(()=>expect(t.restore).toHaveBeenCalled());expect(t.browser.isDraftSaved).toHaveBeenCalledWith(t.cp);
});
it("si IndexedDB no está disponible todavía carga la escena del servidor",async()=>{
 const t=setup();vi.mocked(t.browser.localDrafts.list).mockRejectedValue(new Error("IndexedDB bloqueada"));t.browser.latestSavedScene=vi.fn().mockResolvedValue(t.cp.context.sceneId);
 await t.render();expect(host.querySelector("dialog")).toBeNull();await vi.waitFor(()=>expect(t.restore).toHaveBeenCalled());
});

it("restaura una copia traspasada y desacoplada antes de consultar la escena de la URL",async()=>{
 const t=setup(),handoff:DraftCheckpoint={...t.cp,context:{...t.cp.context,sceneId:null,baseRevision:0}};
 const consumed=vi.fn();
 await act(async()=>root.render(<DraftRecovery browser={t.browser} gameId={handoff.context.gameId} active onRecovered={t.onRecovered} onExit={t.onExit} selectedSceneId={t.cp.context.sceneId??undefined} handoff={handoff} onHandoffConsumed={consumed}/>));
 await vi.waitFor(()=>expect(t.restore).toHaveBeenCalledWith(handoff));
 expect(consumed).toHaveBeenCalledOnce();expect(t.onRecovered).toHaveBeenCalledOnce();expect(t.browser.openSaved).not.toHaveBeenCalled();expect(host.querySelector("dialog")).toBeNull();
});

it("traspasa el snapshot capturado por flushLocal, también cuando el respaldo persistente está desactivado",async()=>{
 const t=setup(),latest:DraftCheckpoint={...t.cp,localDraftId:uuid(),content:{...t.cp.content,view:{...t.cp.content.view,sidebar:false}},updatedAt:new Date().toISOString()};
 const drafts=t.browser.drafts as unknown as {checkpoint:DraftCheckpoint|null;flushLocal:ReturnType<typeof vi.fn>;getStatus:()=>{enabled:boolean}};
 drafts.checkpoint=t.cp;
 drafts.flushLocal.mockImplementation(async()=>{drafts.checkpoint=latest;});
 const action=vi.fn().mockResolvedValue(true);
 const recovery={state:"continue" as const,message:"La apertura cambió.",onRetry:vi.fn(),onAction:action};
 await act(async()=>root.render(<DraftRecovery browser={t.browser} gameId={t.cp.context.gameId} active onRecovered={t.onRecovered} onExit={t.onExit} selectedSceneId={t.cp.context.sceneId??undefined} openingRecovery={recovery}/>));
 await t.click("Continuar partida");
 await vi.waitFor(()=>expect(action).toHaveBeenCalled());
 expect(action.mock.calls[0][1]).toBe(latest);
 const status=drafts.getStatus();status.enabled=false;
 const latestInMemory={...latest,localDraftId:uuid()};drafts.checkpoint=t.cp;drafts.flushLocal.mockImplementation(async()=>{drafts.checkpoint=latestInMemory;});action.mockClear();
 await t.click("Continuar partida");await vi.waitFor(()=>expect(action).toHaveBeenCalled());expect(action.mock.calls[0][1]).toBe(latestInMemory);
});

it("no cambia de apertura si IndexedDB no confirma el traspaso persistente",async()=>{
 const t=setup(),action=vi.fn().mockResolvedValue(true);
 const drafts=t.browser.drafts as unknown as {flushLocal:ReturnType<typeof vi.fn>};drafts.flushLocal.mockRejectedValue(new Error("IndexedDB bloqueada"));
 const recovery={state:"continue" as const,message:"La apertura cambió.",onRetry:vi.fn(),onAction:action};
 await act(async()=>root.render(<DraftRecovery browser={t.browser} gameId={t.cp.context.gameId} active onRecovered={t.onRecovered} onExit={t.onExit} selectedSceneId={t.cp.context.sceneId??undefined} openingRecovery={recovery}/>));
 await t.click("Continuar partida");
 expect(action).not.toHaveBeenCalled();expect(host.textContent).toContain("IndexedDB bloqueada");
});
