import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mkdtempSync, realpathSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createApi } from "../../server/legacy-http.fixture";
import { connectInternalSceneLink, disconnectInternalSceneLink } from "../../domain/annotations/internal-scene-links";
import { createDefaultSceneMap, createSceneWithMap, syncRuntimeFieldsFromActiveMap } from "../../domain/sessions/scene-maps";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { createEmptyMonsterTemplate } from "../../domain/monster-templates/monster-template";
import { HttpTransport, ServiceError, sessionSchema } from "./http";
import { createBrowserClient } from "./browser-client";
import { assetUrl, sceneReference } from "../../shared/contracts/service-references";
import { parseSceneJson, serializeSceneDocument } from "../../domain/sessions/scene-schema";
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==","base64");
const dirs:string[]=[];const apis:ReturnType<typeof createApi>[]=[];
afterEach(async()=>{for(const api of apis.splice(0))await api.close();for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});
async function fixture(){
 const dir=realpathSync(mkdtempSync(join(tmpdir(),"ttrpg-browser-test-")));dirs.push(dir);const origin="http://127.0.0.1:8787";
 const web=join(dir,"web");mkdirSync(web);writeFileSync(join(web,"index.html"),"<!doctype html><title>Mesa</title>");writeFileSync(join(web,"client.js"),"void 0");
 const config={host:"127.0.0.1",port:0,dataDir:dir,webDir:web,publicOrigin:origin,dmKey:"d".repeat(32),playerKey:"p".repeat(32)};
 let api=createApi(config,{version:"test"});apis.push(api);let port=await api.listen();let cookie="";
 const fetcher:typeof fetch=async(input,init={})=>{
  expect(init.credentials).toBe("same-origin");const headers=new Headers(init.headers);headers.set("Host",new URL(origin).host);headers.set("Origin",origin);if(cookie)headers.set("Cookie",cookie);
  const bytes=init.body instanceof Blob?Buffer.from(await init.body.arrayBuffer()):init.body?Buffer.from(String(init.body)):undefined;
  if(bytes)headers.set("Content-Length",String(bytes.length));
  return new Promise((resolve,reject)=>{const req=request(`http://127.0.0.1:${port}${input}`,{method:init.method,headers:Object.fromEntries(headers),agent:false},res=>{const chunks:Buffer[]=[];res.on("data",c=>chunks.push(c));res.on("end",()=>{if(res.headers["set-cookie"])cookie=res.headers["set-cookie"][0].split(";")[0];const out=new Headers();for(const[k,v]of Object.entries(res.headers))if(v!==undefined)out.set(k,Array.isArray(v)?v.join(","):v);resolve(new Response(res.statusCode===204?null:Buffer.concat(chunks),{status:res.statusCode,headers:out}));});});req.on("error",reject);req.end(bytes);});
 };
 const http=new HttpTransport(fetcher);await http.json("/auth/login",sessionSchema,"POST",{key:config.dmKey});
 const dialogs={selectScene:vi.fn<()=>Promise<string|null>>(),sceneName:vi.fn(async()=>"Mesa persistente")};const choose=vi.fn(async()=>new File([png],"map.png",{type:"image/png"}));const browser=createBrowserClient(http,dialogs,choose);
 return {dir,http,browser,dialogs,choose,fetcher,config,restart:async()=>{await api.close();api=createApi(config,{version:"test"});apis.push(api);port=await api.listen();await http.json("/auth/login",sessionSchema,"POST",{key:config.dmKey});}};
}
describe("cliente real contra servicio temporal",()=>{
 it("guarda identidad, importa, compone mapas, resuelve assets, bibliotecas/plantillas y persiste tras reinicio",async()=>{
  const f=await fixture();const api=f.browser.client.api;const image=await api.openMapImage();expect(image.ok).toBe(true);if(!image.ok)return;
  const scene={...createDefaultScene(),map:{...createDefaultScene().map,imagePath:image.imagePath}};
  const first=await api.saveScene(scene);expect(first.ok).toBe(true);if(!first.ok)return;
  expect(first.mapImageUrl).toBe(assetUrl(image.imagePath));const second=await api.saveScene({...first.scene,labels:[{id:"label-1",type:"label",text:"Persistida",position:{x:1,y:2},fontFamily:"Arial, sans-serif",color:"#ffffff",opacity:1,shadow:{enabled:false,color:"#000000",blur:0}}]},{suggestedFilePath:first.filePath});expect(second.ok, JSON.stringify(second)).toBe(true);if(!second.ok)return;expect(second.filePath).toBe(first.filePath);
  const exported=await f.http.request(`/scenes/${first.filePath.slice(6)}/export`,z.unknown());expect(parseSceneJson(JSON.stringify(exported)).labels[0].text).toBe("Persistida");
  f.choose.mockResolvedValueOnce(new File([serializeSceneDocument(second.scene)],"copia.ttrpgscene",{type:"application/json"}));const imported=await f.browser.importFile();expect(imported.ok).toBe(true);if(!imported.ok)return;expect(imported.filePath).not.toBe(first.filePath);
  f.dialogs.selectScene.mockResolvedValue(imported.filePath);const merged=await api.importSceneAsMap(second.scene);expect(merged.ok).toBe(true);if(merged.ok)expect(merged.scene.maps).toHaveLength(2);
  expect((await api.saveNpcLibraryEntry({name:"Aliada",imagePath:image.imagePath,notes:"privado"})).ok).toBe(true);
  expect((await api.saveMonsterLibraryEntry({name:"Goblin",system:"5e",contentMarkdown:"Ficha",imagePath:image.imagePath})).ok).toBe(true);
  expect((await api.savePlayerCharacterLibraryEntry({characterName:"Maga",imagePath:image.imagePath})).ok).toBe(true);
  const template={...createEmptyMonsterTemplate("personal"),id:"personal",name:"Personal",system:"5e"};expect((await api.saveMonsterTemplate(template)).ok).toBe(true);
  await f.restart();f.dialogs.selectScene.mockResolvedValue(first.filePath);const loaded=await api.loadScene();expect(loaded.ok).toBe(true);if(loaded.ok)expect(loaded.scene.labels[0].text).toBe("Persistida");
  const npcs=await api.searchNpcLibrary({text:"Aliada"});expect(npcs.ok).toBe(true);if(npcs.ok){expect(npcs.entries[0].imagePath).toBe(image.imagePath);expect((await api.getNpcLibraryEntry(npcs.entries[0].id)).ok).toBe(true);expect((await api.saveNpcLibraryEntry({id:npcs.entries[0].id,name:"Aliada actualizada"})).ok).toBe(true);}
  expect((await api.searchMonsterLibrary({text:"Goblin"})).ok).toBe(true);expect((await api.searchPlayerCharacterLibrary({text:"Maga"})).ok).toBe(true);expect((await api.listMonsterTemplates()).ok).toBe(true);expect((await api.deleteMonsterTemplate("personal")).ok).toBe(true);
  const bytes=await f.fetcher(`/api/v1/assets/${image.imagePath.slice(6)}`,{credentials:"same-origin"});expect(Buffer.from(await bytes.arrayBuffer())).toEqual(png);
  await f.http.json("/auth/login",sessionSchema,"POST",{key:f.config.playerKey});expect((await api.loadScene()).ok).toBe(false);expect((await api.searchNpcLibrary({text:""})).ok).toBe(false);expect((await f.fetcher(`/api/v1/assets/${image.imagePath.slice(6)}`,{credentials:"same-origin"})).status).toBe(404);
  await f.http.json("/auth/logout",z.undefined(),"POST");await expect(f.http.request("/auth/session",sessionSchema)).rejects.toMatchObject({status:401});
 });
 it("enlaces recíprocos reales, navegación, desconexión y referencias locales rotas",async()=>{
  const f=await fixture();const api=f.browser.client.api;
  const save=async(markerId:string)=>{const base=createDefaultScene();const out=await api.saveScene({...base,mapAnnotations:{...base.mapAnnotations,sceneLinks:[{id:markerId,kind:"scene-link",name:markerId,position:{x:2,y:3},locked:false,connection:null}]}});if(!out.ok)throw new Error(out.error);return out;};
  const a=await save("a"),b=await save("b");const request={sourceScenePath:a.filePath,sourceMarkerId:"a",targetScenePath:b.filePath,targetMarkerId:"b"};
  expect((await api.listSceneLinkCandidates(b.filePath)).ok).toBe(true);expect((await api.connectSceneLink(request)).ok).toBe(true);
  const target=await api.loadSceneLinkTarget({scenePath:a.filePath,markerId:"a"});expect(target.ok, JSON.stringify(target)).toBe(true);if(target.ok){expect(target.sceneResult.filePath).toBe(b.filePath);expect(target.entryPoint).toEqual({x:2,y:3});}
  expect((await api.disconnectSceneLink({scenePath:a.filePath,markerId:"a"})).ok).toBe(true);expect((await api.loadSceneLinkTarget({scenePath:a.filePath,markerId:"a"})).ok).toBe(false);
  expect((await api.connectSceneLink({...request,targetScenePath:"/etc/passwd"})).ok).toBe(false);
  for(const reference of ["file:///etc/passwd","https://evil.test/a.png","map-asset:///tmp/a","/etc/passwd","blob:x"])expect(await api.resolveMapUrl(reference)).toBeNull();
 });
 it("fallo del segundo guardado revierte ambos extremos de un enlace",async()=>{
  const f=await fixture();const api=f.browser.client.api;const base=createDefaultScene();
  const save=async(id:string)=>{const out=await api.saveScene({...base,mapAnnotations:{...base.mapAnnotations,sceneLinks:[{id,kind:"scene-link",name:id,position:{x:0,y:0},locked:false,connection:null}]}});if(!out.ok)throw new Error(out.error);return out;};
  const a=await save("a"),b=await save("b");const db=new DatabaseSync(join(f.dir,"service.sqlite"));
  try {db.exec(`CREATE TRIGGER fail_link BEFORE INSERT ON scenes WHEN NEW.id='${b.filePath.slice(6)}' BEGIN SELECT RAISE(ABORT,'injected'); END`);
   expect((await api.connectSceneLink({sourceScenePath:a.filePath,sourceMarkerId:"a",targetScenePath:b.filePath,targetMarkerId:"b"})).ok).toBe(false);
   for(const ref of [a.filePath,b.filePath]){f.dialogs.selectScene.mockResolvedValue(ref);const loaded=await api.loadScene();expect(loaded.ok).toBe(true);if(loaded.ok)expect(loaded.scene.mapAnnotations.sceneLinks[0].connection).toBeNull();}
  } finally {db.exec("DROP TRIGGER fail_link");db.close();}
 });
 it("cancelación y formato corrupto conservados; mesa real disponible",async()=>{
  const f=await fixture();f.dialogs.selectScene.mockResolvedValue(null);expect(await f.browser.client.api.loadScene()).toEqual({ok:false,error:"Carga cancelada."});
  f.choose.mockResolvedValueOnce(new File(["not json"],"bad.ttrpgscene"));expect((await f.browser.importFile()).ok).toBe(false);expect((await f.browser.listScenes()).total).toBe(0);
  expect(f.browser.client.capabilities.player).toBe(true);expect((await f.browser.client.api.openPlayerWindow()).ok).toBe(true);expect((await f.browser.client.api.getDmDiceSession()).ok).toBe(true);
 });
 it("selector pendiente de sesión anterior no sube a una sesión recuperada",async()=>{
  const f=await fixture();let finish!:(file:File)=>void;f.choose.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));const pending=f.browser.client.api.openMapImage();f.browser.clear();f.http.resume();finish(new File([png],"map.png",{type:"image/png"}));expect(await pending).toMatchObject({ok:false,error:"Operación de una sesión anterior descartada."});
 });
 it.each(["selector","lectura"])("401 invalida %s pendiente antes de reautenticar",async kind=>{
  let finish!:(value:File|string)=>void;const fetcher=vi.fn(async()=>new Response(JSON.stringify({ok:false,error:{code:"UNAUTHORIZED",message:"Expirada"}}),{status:401,headers:{"content-type":"application/json"}}));
  const http=new HttpTransport(fetcher);const file=new File(["{}"],"escena.ttrpgscene");
  const choose=kind==="selector"?()=>new Promise<File|null>(resolve=>{finish=value=>resolve(value as File);}):async()=>file;
  if(kind==="lectura")vi.spyOn(file,"text").mockImplementation(()=>new Promise(resolve=>{finish=value=>resolve(value as string);}));
  const browser=createBrowserClient(http,{selectScene:async()=>null,sceneName:async()=>"Temporal"},choose);
  const pending=kind==="selector"?browser.client.api.openMapImage():browser.importFile();await vi.waitFor(()=>expect(finish).toBeDefined());
  await expect(http.request("/scenes",z.unknown())).rejects.toMatchObject({status:401});http.resume();
  finish(kind==="selector"?new File([png],"map.png",{type:"image/png"}):serializeSceneDocument(createDefaultScene()));
  expect(await pending).toMatchObject({ok:false,error:"Operación de una sesión anterior descartada."});expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it("reconecta liberando destino anterior en la misma escena y en otra escena",async()=>{
  const f=await fixture(),api=f.browser.client.api;
  const save=async(ids:string[])=>{const scene=createDefaultScene();const out=await api.saveScene({...scene,mapAnnotations:{...scene.mapAnnotations,sceneLinks:ids.map(id=>({id,kind:"scene-link" as const,name:id,position:{x:0,y:0},locked:false,connection:null}))}});if(!out.ok)throw new Error(out.error);return out;};
  const a=await save(["a"]),b=await save(["b","c"]),d=await save(["d"]);
  const connect=(targetScenePath:string,targetMarkerId:string)=>api.connectSceneLink({sourceScenePath:a.filePath,sourceMarkerId:"a",targetScenePath,targetMarkerId});
  expect((await connect(b.filePath,"b")).ok).toBe(true);expect((await connect(b.filePath,"c")).ok).toBe(true);
  f.dialogs.selectScene.mockResolvedValue(b.filePath);let loaded=await api.loadScene();if(!loaded.ok)throw new Error(loaded.error);expect(loaded.scene.mapAnnotations.sceneLinks[0].connection).toBeNull();expect(loaded.scene.mapAnnotations.sceneLinks[1].connection?.peer.markerId).toBe("a");
  expect((await connect(d.filePath,"d")).ok).toBe(true);loaded=await api.loadScene();if(!loaded.ok)throw new Error(loaded.error);expect(loaded.scene.mapAnnotations.sceneLinks.every(m=>m.connection===null)).toBe(true);
  const candidates=await api.listSceneLinkCandidates(b.filePath);if(!candidates.ok)throw new Error(candidates.error);expect(candidates.candidate.markers.every(m=>m.available)).toBe(true);
  const target=await api.loadSceneLinkTarget({scenePath:a.filePath,markerId:"a"});expect(target.ok).toBe(true);if(target.ok)expect(target.sceneResult.filePath).toBe(d.filePath);
 });
 it("rechaza transiciones remoto/interno sin alterar extremos y revierte desconexión fallida", async () => {
  const f = await fixture(), api = f.browser.client.api;
  const marker = (id: string) => ({ id, kind: "scene-link" as const, name: id, position: { x: 0, y: 0 }, locked: false, connection: null });
  const map = (id: string) => createDefaultSceneMap({ id: `map-${id}`, name: id, mapAnnotations: { pins: [], areas: [], sceneLinks: [marker(id)] } });
  const aMap = map("a"), cMap = map("c");
  const aSaved = await api.saveScene(syncRuntimeFieldsFromActiveMap({ ...createSceneWithMap(aMap), maps: [aMap, cMap] }));
  const bSaved = await api.saveScene(createSceneWithMap(map("b")));
  if (!aSaved.ok || !bSaved.ok) throw new Error("Fixture failed");
  const a = aSaved.filePath, b = bSaved.filePath;
  const read = async (ref: string) => { f.dialogs.selectScene.mockResolvedValue(ref); const loaded = await api.loadScene(); if (!loaded.ok) throw new Error(loaded.error); return loaded.scene; };
  const remoteRequest = { sourceScenePath: a, sourceMarkerId: "a", targetScenePath: b, targetMarkerId: "b" };
  const internalRequest = { sourceMapId: "map-a", sourceMarkerId: "a", targetMapId: "map-c", targetMarkerId: "c", scenePath: a, connectionId: "internal" };
  expect((await api.connectSceneLink(remoteRequest)).ok).toBe(true);
  const remoteA = await read(a), remoteB = await read(b);
  expect(() => connectInternalSceneLink(remoteA, internalRequest)).toThrow("Usa Desligar");
  expect(await read(a)).toEqual(remoteA); expect(await read(b)).toEqual(remoteB);
  const db = new DatabaseSync(join(f.dir, "service.sqlite"));
  try {
   db.exec(`CREATE TRIGGER fail_disconnect BEFORE INSERT ON scenes WHEN NEW.id='${b.slice(6)}' BEGIN SELECT RAISE(ABORT,'injected'); END`);
   expect((await api.disconnectSceneLink({ scenePath: a, markerId: "a" })).ok).toBe(false);
   expect(await read(a)).toEqual(remoteA); expect(await read(b)).toEqual(remoteB);
  } finally { db.exec("DROP TRIGGER fail_disconnect"); db.close(); }
  expect((await api.disconnectSceneLink({ scenePath: a, markerId: "a" })).ok).toBe(true);
  expect((await read(b)).mapAnnotations.sceneLinks[0].connection).toBeNull();
  const internalA = connectInternalSceneLink(await read(a), internalRequest);
  expect((await api.saveSceneToPath(internalA, a)).ok).toBe(true);
  const persistedInternal = await read(a), freeB = await read(b);
  expect(await api.connectSceneLink(remoteRequest)).toMatchObject({ ok: false, error: expect.stringContaining("Usa Desligar") });
  expect(await api.connectSceneLink({ sourceScenePath: b, sourceMarkerId: "b", targetScenePath: a, targetMarkerId: "a" })).toMatchObject({ ok: false, error: expect.stringContaining("Usa Desligar") });
  expect(await read(a)).toEqual(persistedInternal); expect(await read(b)).toEqual(freeB);
  const candidates = await api.listSceneLinkCandidates(b); if (!candidates.ok) throw new Error(candidates.error); expect(candidates.candidate.markers[0].available).toBe(true);
  expect((await api.saveSceneToPath(disconnectInternalSceneLink(persistedInternal, "map-a", "a"), a)).ok).toBe(true);
  expect((await api.connectSceneLink(remoteRequest)).ok).toBe(true);
  expect((await read(a)).maps[1].mapAnnotations.sceneLinks[0].connection).toBeNull();
  expect((await api.loadSceneLinkTarget({ scenePath: a, markerId: "a" })).ok).toBe(true);
 });
 it("estáticos no convierten errores API/imagenes en HTML ni exponen datos",async()=>{
  const f=await fixture();const get=(path:string,method="GET",accept="text/html")=>f.fetcher(path,{credentials:"same-origin",method,headers:{Accept:accept}});
  expect((await get("/")).headers.get("content-type")).toContain("text/html");expect((await get("/mesa/entrada")).status).toBe(200);expect((await get("/assets/absent.png")).status).toBe(404);expect((await get("/service.sqlite")).status).toBe(404);expect((await get("/.env")).status).toBe(404);expect((await get("/","POST")).status).toBe(405);expect((await get("/api/v1/unknown")).headers.get("content-type")).toContain("application/json");expect((await get("/client.js")).headers.get("content-security-policy")).not.toContain("unsafe-eval");
 });
});
describe("frontera HTTP",()=>{
 it.each([401,403,404,413,500])("distingue HTTP %s sin interpretar HTML como éxito",async status=>{const expired=vi.fn();const transport=new HttpTransport(vi.fn(async()=>new Response("<html>error</html>",{status,headers:{"Content-Type":"text/html"}})),expired);await expect(transport.request("/scenes",z.object({ok:z.literal(true)}))).rejects.toMatchObject({status});expect(expired).toHaveBeenCalledTimes(status===401?1:0);});
 it("JSON inválido, forma inválida y red producen fallos recuperables",async()=>{for(const response of [new Response("not json",{headers:{"content-type":"application/json"}}),new Response("{}",{headers:{"content-type":"application/json"}})]){const transport=new HttpTransport(vi.fn(async()=>response));await expect(transport.request("/scenes",z.object({ok:z.literal(true)}))).rejects.toBeInstanceOf(ServiceError);}const transport=new HttpTransport(vi.fn(async()=>{throw new Error("offline");}));await expect(transport.request("/scenes",z.unknown())).rejects.toMatchObject({code:"NETWORK"});});
 it("descarta respuesta invalidada incluso mientras lee JSON",async()=>{let finish!:(value:unknown)=>void;const response=new Response("{}",{headers:{"Content-Type":"application/json"}});vi.spyOn(response,"json").mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const transport=new HttpTransport(vi.fn(async()=>response));const pending=transport.request("/scenes",z.unknown());await vi.waitFor(()=>expect(finish).toBeDefined());transport.invalidate();finish({ok:true});await expect(pending).rejects.toMatchObject({code:"STALE"});await expect(transport.json("/scenes",z.unknown(),"POST",{})).rejects.toMatchObject({status:401});});
 it("descarta también errores cuyo cuerpo llega tras invalidar la sesión",async()=>{let finish!:(value:unknown)=>void;const response=new Response("{}",{status:500,headers:{"Content-Type":"application/json"}});vi.spyOn(response,"json").mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));const transport=new HttpTransport(vi.fn(async()=>response));const pending=transport.request("/scenes",z.unknown());await vi.waitFor(()=>expect(finish).toBeDefined());transport.invalidate();finish({ok:false,error:{code:"OLD",message:"Anterior"}});await expect(pending).rejects.toMatchObject({code:"STALE"});});
 it("valida identidad opaca",()=>{expect(()=>sceneReference("../../etc")).toThrow();expect(assetUrl("asset:bad")).toBeNull();});
});
