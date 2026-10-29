import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request } from "node:http";
import { randomUUID } from "node:crypto";
import { createApi } from "./http";
import { LIMITS, type ServerConfig } from "./config";
import sharp from "sharp";
import { privateFixture, refs } from "../application/services/public-table-projection.fixture";
import { sceneDocumentV2Schema } from "../domain/sessions/scene-schema";
import { tableEventSchema, type TableEvent } from "../shared/contracts/table";
import { defaultDiceDraft } from "../domain/dice/dice";
const origin="http://127.0.0.1:8787";
let api:ReturnType<typeof createApi>, dir:string, base:string, dm:string, player:string, time:number, config:ServerConfig;
const closes:Array<()=>void>=[];
async function call(path:string,method="GET",payload?:unknown,cookie=dm,extra:Record<string,string>={}) {
  return new Promise<{status:number;body:string;headers:import("node:http").IncomingHttpHeaders}>((resolve,reject)=>{
    const req=request(base+path,{method,headers:{Host:new URL(origin).host,Origin:origin,Cookie:cookie,...(payload===undefined?{}:{"Content-Type":"application/json"}),...extra},agent:false},res=>{const chunks:Buffer[]=[];res.on("data",c=>chunks.push(c));res.on("end",()=>resolve({status:res.statusCode!,body:Buffer.concat(chunks).toString(),headers:res.headers}));});req.on("error",reject);req.end(payload===undefined?undefined:payload instanceof Buffer?payload:JSON.stringify(payload));
  });
}
async function login(key:string) {const response=await call("/auth/login","POST",{key},"");expect(response.status).toBe(200);return response.headers["set-cookie"]![0].split(";")[0];}
async function start(){api=createApi(config,{version:"3.5.0",now:()=>time});base=`http://127.0.0.1:${await api.listen()}/api/v1`;}
async function stream(cookie=player,cursor?:string){
  const events:TableEvent[]=[];let ended=false;let bytes="";
  const req=request(base+"/table/events?role=dm",{headers:{Host:new URL(origin).host,Cookie:cookie,...(cursor?{"Last-Event-ID":cursor}:{})},agent:false});
  await new Promise<void>((resolve,reject)=>{req.on("response",res=>{expect(res.statusCode).toBe(200);res.setEncoding("utf8");let buffer="";res.on("data",(chunk:string)=>{bytes+=chunk;buffer+=chunk;let end:number;while((end=buffer.indexOf("\n\n"))>=0){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);const data=block.split("\n").find(l=>l.startsWith("data: "));if(data)events.push(tableEventSchema.parse(JSON.parse(data.slice(6))));}if(events.length)resolve();});res.on("end",()=>{ended=true;});});req.on("error",reject);req.end();});
  const close=()=>req.destroy();closes.push(close);return {events,close,get bytes(){return bytes;},get ended(){return ended;}};
}
function mutation(payload:unknown,context:string|null=null,extra:Record<string,unknown>={}){return {requestId:randomUUID(),context,payload,...extra};}
async function publish(snapshot=privateFixture()){sceneDocumentV2Schema.parse(snapshot.scene);const response=await call("/table/open","POST",mutation({snapshot}));expect(response.status).toBe(200);return JSON.parse(response.body).state;}
beforeEach(async()=>{dir=realpathSync(mkdtempSync(join(tmpdir(),"ttrpg-table-")));time=Date.now();config={host:"127.0.0.1",port:0,dataDir:dir,publicOrigin:origin,dmKey:"d".repeat(32),playerKey:"p".repeat(32)};await start();dm=await login(config.dmKey);player=await login(config.playerKey);});
afterEach(async()=>{closes.splice(0).forEach(c=>c());await api.close();rmSync(dir,{recursive:true,force:true});});
describe("mesa HTTP/SSE real",()=>{
  it("bootstrap y publicación sin secretos ni permisos por query",async()=>{
    const ps=await stream(),ds=await stream(dm);expect(ps.events[0].state?.snapshot).toBeNull();
    const state=await publish();await new Promise(r=>setTimeout(r,20));
    expect(ps.events.some(e=>e.type==="scene")).toBe(true);expect(ps.bytes).not.toContain("SECRET");expect(ps.bytes).not.toContain("presence");expect(ds.events.some(e=>e.type==="presence")).toBe(true);
    for(const action of ["open","scene","camera","camera-command","pointer","area-highlight"]){expect((await call(`/table/${action}?role=dm`,"POST",mutation({},state.context),player)).status).toBe(403);}
    for(const action of ["context","preferences","begin","complete","fail","clear-history","dismiss","visibility","size"]){expect((await call(`/dice/${action}`,"POST",mutation({},state.context),player)).status).toBe(403);}
    expect((await call("/dice/session","GET",undefined,player)).status).toBe(403);expect((await call("/table/state","GET",undefined,"")).status).toBe(401);
  });
  it("assets: autorización vigente GET/HEAD/resolve, compartidos y revocación",async()=>{
    const assets: Array<{reference:string;url:string}>=[];
    for(let i=0;i<8;i++){
      const png=await sharp({create:{width:2,height:2,channels:4,background:{r:i*25,g:100,b:200,alpha:1}}}).png().toBuffer();
      const upload=await call("/assets","POST",png,dm,{"Content-Type":"image/png"});expect(upload.status).toBe(201);assets.push(JSON.parse(upload.body).asset);
    }
    let json=JSON.stringify(privateFixture());refs.forEach((ref,i)=>{json=json.replaceAll(ref,assets[i].reference);});let fixture=JSON.parse(json) as ReturnType<typeof privateFixture>;
    const access=async(expected:number[])=>{
      for(let i=0;i<8;i++)for(const method of ["GET","HEAD"])expect((await call(assets[i].url.replace("/api/v1",""),method,undefined,player,{"If-None-Match":"*"})).status).toBe(expected.includes(i)?200:404);
      const resolved=JSON.parse((await call("/assets/resolve","POST",{references:[...assets.map(a=>a.reference),"/SECRET-path","https://SECRET-external"]},player)).body).assets;
      expect(resolved.map((a:{url:string|null})=>a.url)).toEqual([...assets.map((a,i)=>expected.includes(i)?a.url:null),null,null]);
    };
    await access([]);await publish(fixture);await access([0,1,3,5]);
    fixture={...fixture,scene:{...fixture.scene,sceneAside:{...fixture.scene.sceneAside,npcs:fixture.scene.sceneAside.npcs.map(n=>({...n,visibleToPlayer:false}))}}};await publish(fixture);await access([0,1,3,5]); // Monstruo comparte el retrato.
    fixture={...fixture,scene:{...fixture.scene,sceneAside:{...fixture.scene.sceneAside,monsters:fixture.scene.sceneAside.monsters.map(n=>({...n,visibleToPlayer:false}))},combatTracker:{...fixture.scene.combatTracker,active:false}}};await publish(fixture);await access([0,1]);
    const second=fixture.scene.maps[1];Object.assign(fixture.scene,{...second,activeMapId:second.id,id:fixture.scene.id,name:fixture.scene.name,maps:fixture.scene.maps});await publish(fixture);await access([6]);
    await call("/table/scene","POST",mutation(null));await access([]);expect((await call(assets[0].url.replace("/api/v1",""))).status).toBe(200);

  });
  it("idempotencia, reconexión actual y reportes ligados a conexión/contexto",async()=>{
    const p1=await stream();const state=await publish();const id=p1.events[0].state!.connectionId!;
    const cmd=mutation({revision:1,camera:{center:{x:40,y:40},zoom:1},reason:"recenter"},state.context);
    expect((await call("/table/camera-command","POST",cmd)).status).toBe(200);expect((await call("/table/camera-command","POST",cmd)).status).toBe(200);
    expect((await call("/table/camera-command","POST",{...cmd,payload:{...cmd.payload as object,revision:2}})).status).toBe(409);
    const report={reportRevision:1,acknowledgedCommandRevision:1,camera:{center:{x:40,y:40},zoom:1},origin:"remote-command",final:true};
    expect((await call("/table/camera-report","POST",mutation(report,state.context,{connectionId:id}),player)).status).toBe(200);
    expect((await call("/table/camera-report","POST",mutation({...report,reportRevision:2,acknowledgedCommandRevision:99},state.context,{connectionId:id}),player)).status).toBe(409);
    expect((await call("/table/camera-report","POST",mutation(report,state.context,{connectionId:randomUUID()}),player)).status).toBe(409);
    p1.close();const next=await publish({...privateFixture(),cameraSyncKey:9});const p2=await stream(player,`${state.epoch}:player:0`);expect(p2.events[0].state?.context).toBe(next.context);expect(p2.events[0].state?.cameraCommand).toBeNull();
    expect((await call("/table/ready","POST",mutation({},state.context,{connectionId:id,revision:state.revision}),player)).status).toBe(409);
    expect(JSON.parse((await call("/table/state")).body).state.presence.count).toBe(1);
  });
  it("promoción principal, logout y caducidad cierran streams sin comandos nuevos",async()=>{
    const a=await stream();const secondCookie=await login(config.playerKey);const b=await stream(secondCookie);let state=JSON.parse((await call("/table/state")).body).state;expect(state.presence.count).toBe(2);expect(state.presence.primaryId).toBe(a.events[0].state?.connectionId);
    await call("/auth/logout","POST",undefined,player);await new Promise(r=>setTimeout(r,20));expect(a.ended).toBe(true);state=JSON.parse((await call("/table/state")).body).state;expect(state.presence.primaryId).toBe(b.events[0].state?.connectionId);expect(state.presence.report).toBeNull();
    time+=LIMITS.sessionMs;await new Promise(r=>setTimeout(r,1100));expect(b.ended).toBe(true);expect((await call("/table/state","GET",undefined,secondCookie)).status).toBe(401);
  });
  it("dados abiertos/ocultos, repetición begin/complete y tiempo restante",async()=>{
    const ps=await stream();const state=await publish();const ctx={token:"dice-context",sceneId:"public-scene",mapId:state.snapshot.scene.activeMapId,sceneName:"SECRET-dice-scene",mapName:"SECRET-dice-map"};
    expect((await call("/dice/context","POST",mutation(ctx,state.context))).status).toBe(200);
    const simulation={values:[{id:"f:d6:0",value:4}],replay:{frameCount:2,stepMs:1000/30,durationMs:1000/30,frames:[0,0,1,0,0,0,1,0,0,.5,0,0,0,1]}};
    const roll=async(visibility:"open"|"hidden")=>{const begin=mutation({requestId:randomUUID(),contextToken:ctx.token,draft:{...defaultDiceDraft(),visibility,groups:[{id:"f",damageType:"fire",dice:{d6:1}}]},d20:null},state.context);const a=await call("/dice/begin","POST",begin),b=await call("/dice/begin","POST",begin);expect(b.body).toBe(a.body);const rollId=JSON.parse(a.body).value.rollId;const complete=mutation({rollId,simulation},state.context);const c=await call("/dice/complete","POST",complete);expect(c.status).toBe(200);expect((await call("/dice/complete","POST",complete)).body).toBe(c.body);return rollId;};
    const visible=await roll("open");time+=1000;await new Promise(r=>setTimeout(r,20));const before=ps.events.filter(e=>e.type==="dice").length;await roll("hidden");await new Promise(r=>setTimeout(r,20));expect(ps.events.filter(e=>e.type==="dice")).toHaveLength(before);expect(ps.bytes).not.toContain("SECRET");expect(JSON.parse((await call("/dice/public","GET",undefined,player)).body).value.presentation.rollId).toBe(visible);
    expect(JSON.parse((await call("/dice/session")).body).value.history).toHaveLength(2);
    await call("/table/pointer","POST",mutation({id:randomUUID(),position:{x:1,y:2},creatureSize:"medium",durationMs:5000},state.context));time+=2000;ps.close();const resumed=await stream();expect(resumed.events[0].state!.pointer!.expiresAt-resumed.events[0].serverTime).toBe(3000);time+=4000;resumed.close();const expired=await stream();expect(expired.events[0].state!.pointer).toBeNull();
  });
});

describe("límites y reinicio de mesa",()=>{
  it("reinicio cambia época y fuerza bootstrap vacío incluso con cursor anterior",async()=>{
    const state=await publish();const old=await stream();old.close();await api.close();await start();dm=await login(config.dmKey);player=await login(config.playerKey);
    const resumed=await stream(player,`${state.epoch}:player:999999`);expect(resumed.events[0].type).toBe("bootstrap");expect(resumed.events[0].epoch).not.toBe(state.epoch);expect(resumed.events[0].state?.snapshot).toBeNull();
  });
  it("máximo un stream por sesión y 64 por instancia, sin acumular conexiones al reemplazar",async()=>{
    const first=await stream();const replacement=await stream();await new Promise(r=>setTimeout(r,10));expect(first.ended).toBe(true);expect(JSON.parse((await call("/table/state")).body).state.presence.count).toBe(1);
    for(let i=0;i<63;i++){if(i%6===0)time+=61000;const cookie=await login(config.playerKey);await stream(cookie);}
    time+=61000;const excess=await login(config.playerKey);expect((await call("/table/events","GET",undefined,excess)).status).toBe(429);
    replacement.close();await new Promise(r=>setTimeout(r,10));const accepted=await stream(excess);expect(accepted.events[0].state?.connectionId).toBeTruthy();
  });
  it("limita cuerpos enormes, reportes intermedios y reuso de IDs; ventana de cinco minutos",async()=>{
    const ps=await stream();const state=await publish();
    expect((await call("/table/scene","POST",mutation("enorme"),dm,{"Content-Length":String(LIMITS.jsonBytes+1)})).status).toBe(413);
    const metadata={connectionId:ps.events[0].state!.connectionId};const report={reportRevision:1,acknowledgedCommandRevision:null,camera:{center:{x:0,y:0},zoom:1},origin:"local-navigation",final:false};
    expect((await call("/table/camera-report","POST",mutation(report,state.context,metadata),player)).status).toBe(200);
    expect((await call("/table/camera-report","POST",mutation({...report,reportRevision:2},state.context,metadata),player)).status).toBe(409);
    expect((await call("/table/camera-report","POST",mutation({...report,reportRevision:2,final:true},state.context,metadata),player)).status).toBe(200);
    const idempotent=mutation({id:"ttl",position:{x:0,y:0},creatureSize:"medium",durationMs:1000},state.context);expect((await call("/table/pointer","POST",idempotent)).status).toBe(200);time+=299999;expect((await call("/table/pointer","POST",{...idempotent,payload:{...idempotent.payload as object,id:"changed"}})).status).toBe(409);
  });
});

it("desconecta un consumidor real pausado sin acumular cola ilimitada",async()=>{
  const slow=request(base+"/table/events",{headers:{Host:new URL(origin).host,Cookie:player},agent:false});closes.push(()=>slow.destroy());
  await new Promise<void>((resolve,reject)=>{slow.once("response",res=>{res.pause();resolve();});slow.once("error",reject);slow.end();});
  const fixture=privateFixture();const shapes=[{id:"large-shape",type:"path" as const,points:Array.from({length:30000},(_,i)=>({x:i,y:i%100}))}];
  const snapshot={...fixture,scene:{...fixture.scene,shapes,maps:fixture.scene.maps.map((m,i)=>i?m:{...m,shapes})}};
  for(let i=0;i<12;i++) { const state=await publish(snapshot); if(state.presence.count===0)break; }
  await new Promise(r=>setTimeout(r,100));
  expect(JSON.parse((await call("/table/state")).body).state.presence.count).toBe(0);
},15000);

it("reportes legítimos compactos no consumen la reserva de órdenes DM",async()=>{
  const f=privateFixture();const shapes=Array.from({length:20},(_,n)=>({id:`trazo-${n}`,type:"path" as const,points:Array.from({length:500},(_,i)=>({x:i*13.31,y:n*14.77}))}));
  const snapshot={...f,scene:{...f.scene,shapes,maps:f.scene.maps.map((m,i)=>i?m:{...m,shapes})}};
  const ps=await stream();const state=await publish(snapshot);
  for(let i=1;i<=500;i++){
    time+=100;const response=await call("/table/camera-report","POST",mutation({reportRevision:i,acknowledgedCommandRevision:null,camera:{center:{x:i,y:0},zoom:1},origin:"local-navigation",final:false},state.context,{connectionId:ps.events[0].state!.connectionId}),player);
    expect(response.status).toBe(200);expect(response.body.length).toBeLessThan(100);
  }
  const pointer=mutation({id:"disponible",position:{x:0,y:0},creatureSize:"medium",durationMs:1000},state.context);
  expect((await call("/table/pointer","POST",pointer)).status).toBe(200);
},15000);

it.each(["logout","rotación","caducidad"])("rechaza cuerpo pendiente después de %s sin ejecutar dados",async(mode)=>{
  const input=JSON.stringify(mutation({token:"revocado",sceneId:"s",mapId:"m",sceneName:"s",mapName:"m"}));
  let pending!:import("node:http").ClientRequest;
  const result=new Promise<number>((resolve,reject)=>{
    pending=request(base+"/dice/context",{method:"POST",headers:{Host:new URL(origin).host,Origin:origin,Cookie:dm,"Content-Type":"application/json","Content-Length":Buffer.byteLength(input)},agent:false},res=>{res.resume();res.on("end",()=>resolve(res.statusCode!));});
    pending.on("error",reject);pending.write(input.slice(0,1));
  });
  await new Promise(r=>setTimeout(r,25));
  if(mode==="logout") expect((await call("/auth/logout","POST")).status).toBe(204);
  else if(mode==="rotación") expect((await call("/auth/login","POST",{key:config.dmKey})).status).toBe(200);
  else time+=LIMITS.sessionMs;
  pending.end(input.slice(1));expect(await result).toBe(401);
  dm=await login(config.dmKey);
  const draft={...defaultDiceDraft(),groups:[{id:"g",damageType:"none",dice:{d6:1}}]};
  expect((await call("/dice/begin","POST",mutation({requestId:randomUUID(),contextToken:"revocado",draft,d20:null}))).status).toBe(409);
});

it.each([
  ["/table/camera","POST"], ["/assets/resolve","POST"], ["/scenes","POST"],
  ["/scene-links/connect","POST"], ["/monster-templates/01010101-0101-4101-8101-010101010101","PUT"], ["/libraries/npcs","POST"], ["/assets","POST"]
])("revalida sesión antes de consumir el cuerpo privado de %s",async(path,method)=>{
  const image=path==="/assets";
  const input=image?await sharp({create:{width:2,height:2,channels:3,background:"red"}}).png().toBuffer():Buffer.from("{}");
  let pending!:import("node:http").ClientRequest;
  const result=new Promise<number>((resolve,reject)=>{
    pending=request(base+path,{method,headers:{Host:new URL(origin).host,Origin:origin,Cookie:dm,"Content-Type":image?"image/png":"application/json","Content-Length":input.length},agent:false},res=>{res.resume();res.on("end",()=>resolve(res.statusCode!));});
    pending.on("error",reject);pending.write(input.subarray(0,1));
  });
  await new Promise(r=>setTimeout(r,25));expect((await call("/auth/logout","POST")).status).toBe(204);
  pending.end(input.subarray(1));expect(await result).toBe(401);
});
