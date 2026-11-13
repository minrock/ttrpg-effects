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
 const onRecovered=vi.fn();
 const render=async()=>act(async()=>root.render(<DraftRecovery browser={browser} gameId={gameId} active onRecovered={onRecovered}/>));
 const click=async(label:string)=>act(async()=>{const node=[...host.querySelectorAll("button")].find(b=>b.textContent===label);expect(node).toBeDefined();node!.click();});
 return {browser,cp,restore,read,remoteList,onRecovered,render,click};
}
it("ofrece la copia local directamente sin selector ni consulta remota",async()=>{
 const t=setup();await t.render();expect(host.querySelector("dialog")?.getAttribute("aria-label")).toBe("¿Cómo quieres continuar?");
 expect(host.querySelector("select")).toBeNull();expect(t.remoteList).not.toHaveBeenCalled();
 await t.click("Recuperar estado local");expect(t.read).toHaveBeenCalledWith("dm",location.origin,t.cp.localDraftId);expect(t.restore).toHaveBeenCalledWith(expect.objectContaining({content:t.cp.content,pending:null,confirmation:null}));expect(t.onRecovered).toHaveBeenCalledOnce();expect(host.querySelector("dialog")).toBeNull();
});
it("cargar mapa recupera la escena confirmada sin borrar ni leer el cuerpo local",async()=>{
 const t=setup();await t.render();await t.click("Cargar mapa nuevamente");await vi.waitFor(()=>expect(t.restore).toHaveBeenCalled());expect(t.browser.openSaved).toHaveBeenCalledWith(`scene:${t.cp.context.sceneId}`);
 expect(t.restore).toHaveBeenCalledWith(expect.objectContaining({context:t.cp.context}),{confirmed:true});expect(t.read).not.toHaveBeenCalled();expect(t.browser.localDrafts.remove).not.toHaveBeenCalled();
});
it("si hay conflicto recupera como copia sin sobrescribir el origen",async()=>{
 const t=setup();t.restore.mockRejectedValueOnce(new ServiceError("REVISION_CONFLICT","Cambió la escena",409));await t.render();await t.click("Recuperar estado local");
 expect(t.restore).toHaveBeenCalledTimes(2);expect(t.restore.mock.calls[1][0].context.sceneId).toBeNull();expect(t.restore.mock.calls[1][0].context.baseRevision).toBe(0);expect(t.restore.mock.calls[1][0].content.scene).not.toBe(t.cp.content.scene);expect(t.cp.context.sceneId).not.toBeNull();expect(t.browser.localDrafts.remove).not.toHaveBeenCalled();
});
it("una copia ilegible permite cargar el mapa y permanece exportable",async()=>{
 const t=setup();t.read.mockRejectedValue(new Error("El respaldo está dañado"));await t.render();await t.click("Recuperar estado local");expect(host.querySelector('[role="alert"]')?.textContent).toContain("dañado");expect(t.onRecovered).not.toHaveBeenCalled();
 await t.click("Cargar mapa nuevamente");await vi.waitFor(()=>expect(t.onRecovered).toHaveBeenCalledOnce());expect(t.browser.localDrafts.remove).not.toHaveBeenCalled();
});
it("sin escena asociada abre el selector de mapas con vuelta a recuperación",async()=>{
 const t=setup();t.cp.context.sceneId=null;await t.render();await t.click("Cargar mapa nuevamente");expect(host.textContent).toContain("Escenas guardadas en el servicio");await t.click("Cancelar");expect(host.textContent).toContain("¿Cómo quieres continuar?");expect(t.read).not.toHaveBeenCalled();
});

it("si el mapa guardado fue eliminado permite elegir otro sin perder el respaldo",async()=>{
 const t=setup();vi.mocked(t.browser.openSaved).mockRejectedValue(new ServiceError("NOT_FOUND","Escena ausente",404));await t.render();await t.click("Cargar mapa nuevamente");expect(host.textContent).toContain("Escenas guardadas en el servicio");expect(t.browser.localDrafts.remove).not.toHaveBeenCalled();
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
it("cambios locales posteriores al guardado sí ofrecen recuperación",async()=>{
 const t=setup();vi.mocked(t.browser.localDrafts.list).mockResolvedValue([{id:t.cp.localDraftId,context:t.cp.context,updatedAt:t.cp.updatedAt,hash:"nuevo",confirmedHash:"anterior",sceneHash:"figura nueva",confirmedSceneHash:"figura anterior"} as never]);
 await t.render();expect(host.textContent).toContain("¿Cómo quieres continuar?");expect(t.browser.openSaved).not.toHaveBeenCalled();
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
