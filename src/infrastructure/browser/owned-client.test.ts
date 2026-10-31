import { expect, it, vi } from "vitest";
import { z } from "zod";
import { HttpTransport } from "./http";
import { Mutations } from "./mutations";
import { createBrowserClient } from "./browser-client";
import { BrowserTableClient } from "./table-client";
import { systemSeeds, type ResourceBindings } from "../../domain/systems/system-catalog";
import { createDefaultScene } from "../../domain/sessions/default-scene";
const response=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
it("la respuesta perdida reintenta misma clave, payload y CAS; conflicto no pisa la revisión",async()=>{
 const f=vi.fn().mockRejectedValueOnce(new Error("perdida")).mockResolvedValueOnce(response({ok:true})).mockResolvedValueOnce(response({ok:false,error:{code:"REVISION_CONFLICT",message:"Conserva el borrador"}},409));const m=new Mutations(new HttpTransport(f));const dto=z.object({ok:z.literal(true)});
 await expect(m.send("/dm/scenes",dto,"PUT",{name:"primero"},3)).rejects.toMatchObject({code:"NETWORK"});await m.send("/dm/scenes",dto,"PUT",{name:"primero"},3);expect(f.mock.calls[0][1].headers).toEqual(f.mock.calls[1][1].headers);expect(f.mock.calls[0][1].body).toBe(f.mock.calls[1][1].body);expect(new Headers(f.mock.calls[0][1].headers).get("If-Match")).toBe("3");await expect(m.send("/dm/scenes",dto,"PUT",{name:"otro"},3)).rejects.toMatchObject({code:"REVISION_CONFLICT"});
});
it("escena propia conserva binding privado retenido y revisión fuera del documento portable",async()=>{
 const id="01010101-0101-4101-8101-010101010101",base=createDefaultScene(),scene={...base,sceneAside:{...base.sceneAside,monsters:[{id:"monster",name:"Retenido",imagePath:null,visibleToPlayer:false,notes:"x",templateId:"generic-markdown"}]}};
 const bindings:ResourceBindings={monsters:{monster:{scope:"private",ownerId:"owner",templateId:"generic-markdown",version:1,hash:"a".repeat(64)}}};
 const resource={id,name:"Privada",scene,revision:4,bindings,createdAt:"2026-10-31T00:00:00.000Z",updatedAt:"2026-10-31T00:00:00.000Z",warnings:[],missingImages:[]};const seed=systemSeeds[0];
 const f=vi.fn(async(path:string,init?:RequestInit)=>path.includes("/definitions/")?response({ok:true,templates:[{...seed.definition.presentations[0],name:"Privada coincidente"}],monsters:{monster:0}}):init?.method==="PUT"?response({ok:true,resource:{...resource,revision:5}}):response({ok:true,resource}));
 const http=new HttpTransport(f as typeof fetch,()=>{},"/api/v1/dm");const browser=createBrowserClient(http,{selectScene:async()=>`scene:${id}`,sceneName:async()=>"nombre"},undefined,{gameId:id,configuration:{ref:seed.ref,definition:seed.definition,hash:"b".repeat(64),availability:"enabled"},version:{...seed.ref,state:"published",createdAt:resource.createdAt,publishedAt:resource.createdAt,revision:1,availability:"enabled",definition:seed.definition,hash:"b".repeat(64),templates:{"generic-markdown":{availability:"enabled",revision:1}}},table:new BrowserTableClient(http)});
 expect((await browser.client.api.loadScene()).ok).toBe(true);const templates=await browser.client.api.listMonsterTemplates();expect(templates.ok&&templates.templates[0].name).not.toBe("Privada coincidente");if(templates.ok){expect(browser.client.presentations?.forMonster("monster","generic-markdown",templates.templates)[0].name).toBe("Privada coincidente");expect(browser.client.presentations?.forMonster("new","generic-markdown",templates.templates)[0].name).not.toBe("Privada coincidente");}expect((await browser.client.api.saveSceneToPath(scene,`scene:${id}`)).ok).toBe(true);const saved=f.mock.calls.find(([,init])=>init?.method==="PUT")![1]!;expect(new Headers(saved.headers).get("If-Match")).toBe("4");const payload=JSON.parse(saved.body as string);expect(payload.bindings).toEqual(bindings);expect(payload.scene).not.toHaveProperty("bindings");expect(payload.scene).not.toHaveProperty("revision");browser.clear();
});
it("una respuesta de cuenta anterior no reaparece aunque fetch ignore abort",async()=>{let complete!:(r:Response)=>void;const h=new HttpTransport(()=>new Promise<Response>(r=>{complete=r;}));const p=h.request("/dm/games",z.unknown());h.invalidate();h.resume();complete(response({private:"old"}));await expect(p).rejects.toMatchObject({code:"STALE"});});

it("respeta Retry-After sin enviar otra mutación y conserva su clave incierta",async()=>{vi.useFakeTimers();try{const f=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ok:false,error:{code:"RATE_LIMITED",message:"Espera"}}),{status:429,headers:{"Content-Type":"application/json","Retry-After":"12"}})).mockResolvedValueOnce(response({ok:true}));const m=new Mutations(new HttpTransport(f));const dto=z.object({ok:z.literal(true)});await expect(m.send("/dm/games",dto,"POST",{name:"Partida"})).rejects.toMatchObject({status:429});await expect(m.send("/dm/games",dto,"POST",{name:"Partida"})).rejects.toMatchObject({status:429});expect(f).toHaveBeenCalledTimes(1);vi.advanceTimersByTime(12000);await m.send("/dm/games",dto,"POST",{name:"Partida"});expect(f.mock.calls[0][1].headers).toEqual(f.mock.calls[1][1].headers);}finally{vi.useRealTimers();}});
it("reintenta una imagen incierta con la misma clave y contenido",async()=>{
 const seed=systemSeeds[0],id="01010101-0101-4101-8101-010101010101",at="2026-10-31T00:00:00.000Z";
 const f=vi.fn().mockRejectedValueOnce(new Error("respuesta perdida")).mockResolvedValueOnce(response({ok:true,asset:{id,reference:`asset:${id}`,url:`/api/v1/dm/assets/${id}`,mimeType:"image/png",byteLength:3}}));
 const http=new HttpTransport(f,()=>{},"/api/v1/dm");const file=new File([new Uint8Array([1,2,3])],"fixture.png",{type:"image/png"});
 const browser=createBrowserClient(http,{selectScene:async()=>null,sceneName:async()=>null},async()=>file,{gameId:id,configuration:{ref:seed.ref,definition:seed.definition,hash:"a".repeat(64),availability:"enabled"},version:{...seed.ref,state:"published",createdAt:at,publishedAt:at,revision:1,availability:"enabled",definition:seed.definition,hash:"a".repeat(64),templates:{"generic-markdown":{availability:"enabled",revision:1}}},table:new BrowserTableClient(http)});
 expect((await browser.client.api.openMapImage()).ok).toBe(false);expect((await browser.client.api.openMapImage()).ok).toBe(true);expect(f.mock.calls[0][1].headers).toEqual(f.mock.calls[1][1].headers);expect(f.mock.calls[0][1].body).toBe(f.mock.calls[1][1].body);browser.clear();
});

it("401 administrativo bloquea lecturas/mutaciones; login incorrecto queda recuperable",async()=>{
 const expired=vi.fn(),f=vi.fn(async()=>response({ok:false,error:{code:"UNAUTHORIZED",message:"Sesión caducada"}},401)),h=new HttpTransport(f,expired);
 await expect(h.request("/identity/login",z.unknown(),{method:"POST"})).rejects.toMatchObject({status:401});expect(expired).not.toHaveBeenCalled();
 h.bindAccount("admin-a");await expect(h.request("/identity/admin/dms?limit=20",z.unknown())).rejects.toMatchObject({status:401});expect(expired).toHaveBeenCalledOnce();
 await expect(h.json("/identity/admin/dms",z.unknown(),"POST",{})).rejects.toMatchObject({status:401});expect(f).toHaveBeenCalledTimes(2);
 h.resume();await expect(h.json("/identity/admin/dms",z.unknown(),"POST",{})).rejects.toMatchObject({status:401});expect(expired).toHaveBeenCalledTimes(2);
});
it("binding de cuenta viaja con mutaciones y descarta respuestas tardías al cambiarlo",async()=>{
 let complete!:(r:Response)=>void;const f=vi.fn<typeof fetch>(()=>new Promise<Response>(r=>{complete=r;})),h=new HttpTransport(f);h.bindAccount("a");
 const p=h.json("/dm/scenes",z.unknown(),"POST",{private:"a"});expect(new Headers(f.mock.calls[0][1]?.headers).get("X-TTRPG-Account")).toBe("a");h.bindAccount("b");complete(response({private:"a"}));await expect(p).rejects.toMatchObject({code:"STALE"});
});
