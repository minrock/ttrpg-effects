import { vi } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, request } from "node:http";
import { IDBFactory } from "fake-indexeddb";
import { migrateCatalog } from "../server/database";
import { openIdentity } from "../server/identity";
import { createOwnedHttp } from "../../server/owned-http";
import { HttpTransport } from "./http";
import { createBrowserClient } from "./browser-client";
import { BrowserTableClient } from "./table-client";
import { GENERIC_SYSTEM, systemSeeds, type ResolvedSystem } from "../../domain/systems/system-catalog";
import { z } from "zod";
const cleanups:Array<()=>Promise<unknown>>=[];
export async function cleanupSceneService(){for(const close of cleanups.splice(0).reverse())await close();vi.unstubAllGlobals();}
export async function sceneServiceFixture(){
 const dir=realpathSync(mkdtempSync(join(tmpdir(),"ttrpg-save-confirmed-")));cleanups.push(async()=>rmSync(dir,{recursive:true,force:true}));
 const config={driver:"sqlite" as const,deployment:"local" as const,dataDir:dir};await migrateCatalog(config);
 const origin="http://localhost:8787",identity=await openIdentity(config,{publicOrigin:origin,secret:randomBytes(32).toString("base64url")});cleanups.push(()=>identity.close());
 const password="contraseña prueba inicial",next="contraseña prueba definitiva";
 await identity.bootstrap({email:"admin@example.test",name:"Admin",password});
 const first=await identity.login("admin@example.test",password,"fixture");await identity.changePassword(first.cookie,password,next);
 const admin=await identity.login("admin@example.test",next,"fixture"),dm=await identity.createDm(admin.cookie,{email:"dm@example.test",name:"DM",password});
 const initial=await identity.login(dm.email,password,"fixture");await identity.changePassword(initial.cookie,password,next);const session=await identity.login(dm.email,next,"fixture");
 const handler=createOwnedHttp(identity,origin),server=createServer((req,res)=>{void handler(req,res);});
 cleanups.push(()=>new Promise<void>(resolve=>{server.close(()=>resolve());server.closeAllConnections();}));await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));const address=server.address();if(!address||typeof address==="string")throw new Error("Sin puerto");
 const fetcher:typeof fetch=async(input,init={})=>new Promise((resolve,reject)=>{
  const headers=new Headers(init.headers);headers.set("host","localhost:8787");headers.set("origin",origin);headers.set("cookie",session.cookie);
  const body=init.body?String(init.body):undefined;if(body)headers.set("content-length",String(Buffer.byteLength(body)));
  const req=request(`http://127.0.0.1:${address.port}${input}`,{method:init.method,headers:Object.fromEntries(headers)},res=>{const chunks:Buffer[]=[];res.on("data",c=>chunks.push(c));res.on("end",()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:{"content-type":"application/json"}})));});req.on("error",reject);req.end(body);
 });
 const http=new HttpTransport(fetcher,()=>{},"/api/v1/dm");http.bindAccount(dm.id);
 const game=await http.request("/games",z.object({game:z.object({id:z.string()})}),{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":randomUUID()},body:JSON.stringify({name:"Mesa de prueba",systemRef:GENERIC_SYSTEM})});
 const {configuration}=await http.request(`/games/${game.game.id}/configuration`,z.object({configuration:z.custom<ResolvedSystem>()}));
 vi.stubGlobal("indexedDB",new IDBFactory());
 const create=()=>{const browser=createBrowserClient(http,{sceneName:async()=>"Escena completa",selectScene:async()=>null},undefined,{gameId:game.game.id,configuration,version:{...systemSeeds[0].ref,definition:systemSeeds[0].definition,hash:configuration.hash,revision:1,createdAt:new Date().toISOString(),publishedAt:new Date().toISOString(),state:"published",availability:"enabled",templates:{}},table:new BrowserTableClient(http)});browser.drafts!.setActive(true);cleanups.push(()=>browser.drafts!.stop());return browser;};
 return {create,http,gameId:game.game.id};
}
