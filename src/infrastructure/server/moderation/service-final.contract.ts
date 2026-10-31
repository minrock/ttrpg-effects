import { BrowserTableClient } from "../../browser/table-client";
import { HttpTransport } from "../../browser/http";
import { createBrowserClient } from "../../browser/browser-client";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import { afterEach, expect, it } from "vitest";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { accounts, admin, changed, cleanup, directory, fixture, http, origin, png, raw, secret } from "../owned/fixtures";
import { postgresPool } from "../database/driver";
import { openServiceApi } from "../../../server/http";
import { invalidateRestoredAccess } from "../invitations/restore-access";
import { snapshot, stream, context, invitationSecret } from "./fixtures";
import { systemSeeds } from "../../../domain/systems/system-catalog";
import type { DatabaseConfig } from "../database/config";
const config=(database:DatabaseConfig,authSecret=secret)=>({database,identity:{publicOrigin:origin,secret:authSecret},publicOrigin:origin,host:"127.0.0.1",port:0,dataDir:database.driver==="sqlite"?database.dataDir:"",dmKey:"",playerKey:""});
async function inventory(database:DatabaseConfig){return raw(database,async c=>{const tables=(await c.query(database.driver==="sqlite"?"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'":"SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")).rows;const result:Record<string,{count:number;hash:string}>={};for(const row of tables){const name=String(row.name);if(!/^[a-z_][a-z0-9_]*$/.test(name))throw new Error("Tabla de fixture inesperada");const rows=(await c.query(`SELECT * FROM "${name}"`)).rows;const serialized=rows.map(row=>JSON.stringify(Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b))))).sort();result[name]={count:rows.length,hash:createHash("sha256").update(serialized.join("\n")).digest("hex")};}return result;});}
afterEach(async()=>{for(const action of cleanup.splice(0).reverse())await action();});
for(const kind of ["sqlite","postgres"] as const){
  it(`principal esperado ${kind}: cambio de cookie entre validación y POST no transfiere borrador`,async()=>{
    const database=await fixture(kind),users=await accounts(database);await users.identity.close();
    const app=await openServiceApi(config(database),"3.13.0");cleanup.push(()=>app.close());const port=await app.listen();
    let cookie=users.aCookie,expired=0;
    const fetcher:typeof fetch=async(url,init)=>{
      const r=await http(port,String(url),cookie,init?.method??"GET",init?.body?JSON.parse(String(init.body)):undefined,Object.fromEntries(new Headers(init?.headers).entries()));
      return new Response(r.status===204?null:r.bytes.toString(),{status:r.status,headers:{"content-type":"application/json"}});
    };
    const transport=new HttpTransport(fetcher,()=>{expired++;},"/api/v1/dm");transport.bindAccount(users.a.id);
    const seed=systemSeeds[0],at="2026-10-31T00:00:00.000Z";
    const client=createBrowserClient(transport,{selectScene:async()=>null,sceneName:async()=>"Borrador privado A"},undefined,{gameId:randomUUID(),configuration:{ref:seed.ref,definition:seed.definition,hash:"a".repeat(64),availability:"enabled"},version:{...seed.ref,state:"published",createdAt:at,publishedAt:at,revision:1,availability:"enabled",definition:seed.definition,hash:"a".repeat(64),templates:{}},table:new BrowserTableClient(transport)});
    const base=createDefaultScene(),scene={...base,sceneAside:{...base.sceneAside,notes:[{id:randomUUID(),name:"Privada",parentId:null,content:"PRIVADO_CENTINELA_CUENTA_A"}]}};
    // Una sesión válida previa no basta: el cookie cambia justo antes del POST nuevo.
    expect((await http(port,"/api/v1/identity/session",cookie,"GET",undefined,{"x-ttrpg-account":users.a.id})).status).toBe(200);
    cookie=users.bCookie;
    expect((await client.client.api.saveScene(scene)).ok).toBe(false);expect(expired).toBe(1);
    expect((await http(port,"/scenes",users.bCookie)).json.scenes).toEqual([]);
    expect((await http(port,"/games",users.bCookie,"GET",undefined,{"x-ttrpg-account":users.a.id})).status).toBe(401);
    expect((await http(port,"/api/v1/identity/admin/dms",users.adminCookie,"POST",{email:"rejected@example.test",name:"No crear",password:changed},{"x-ttrpg-account":users.a.id})).status).toBe(401);
    const game=await app.backend.identity.authorized(users.aCookie,"dm",(_,tx)=>tx.games.create(users.a.id,"A",{systemId:"generic",version:1}));
    const opening=await app.backend.invitations.start(users.aCookie,game.id,null,1,randomUUID());
    for(const path of [`/games/${game.id}/opening/heartbeat`,`/games/${game.id}/table/scene`])expect((await http(port,path,users.bCookie,"POST",context(opening),{"x-ttrpg-account":users.a.id})).status).toBe(401);
    cookie=(await app.backend.identity.login(users.a.email,changed,"same-account")).cookie;transport.resume();
    expect((await client.client.api.saveScene(scene)).ok).toBe(true);
    const list=await http(port,"/scenes",cookie);expect(list.json.scenes).toHaveLength(1);
    const stored=await http(port,`/scenes/${(list.json.scenes as Array<{id:string}>)[0].id}`,cookie);expect(stored.bytes.toString()).toContain("PRIVADO_CENTINELA_CUENTA_A");
    expect((await http(port,"/scenes",users.bCookie)).json.scenes).toEqual([]);client.clear();
  },60000);

  it(`servicio final ${kind}: dos propietarios, A1/A2/B1, catálogo retenido y corte sin rutas globales`,async()=>{
    const database=await fixture(kind), users=await accounts(database);await users.identity.close();
    const app=await openServiceApi(config(database),"3.13.0");cleanup.push(()=>app.close());const port=await app.listen();
    const health=await http(port,"/api/v1/health","");expect(health.json.version).toBe("3.13.0");
    for(const route of ["auth/login","auth/session","auth/logout","scenes","assets/resolve","monster-templates","libraries/monsters","table/state","table/events","dice/session"]){const r=await http(port,`/api/v1/${route}`,"ttrpg_session=legacy");expect([404,410]).toContain(r.status);expect(r.bytes.toString()).not.toContain("<!doctype");}
    const create=async(cookie:string,name:string,systemId:string)=>{const r=await http(port,"/games",cookie,"POST",{name,systemRef:{systemId,version:1}});expect(r.status).toBe(201);return r.json.game as {id:string;revision:number};};
    const a1=await create(users.aCookie,"A1","generic"),a2=await create(users.aCookie,"A2","dnd-55e"),b1=await create(users.bCookie,"B1","generic");
    expect((await http(port,`/games/${b1.id}`,users.aCookie)).status).toBe(404);expect((await http(port,`/games/${a1.id}`,users.adminCookie)).status).toBe(403);
    const uploaded=await http(port,"/assets",users.aCookie,"POST",png,{"content-type":"image/png"});expect(uploaded.status).toBe(201);const asset=(uploaded.json.asset as {id:string}).id;
    const image=snapshot(asset);const stored=await http(port,"/scenes",users.aCookie,"POST",{name:"Privada A",scene:image.scene});expect(stored.status).toBe(201);const resource=stored.json.resource as {id:string;revision:number};
    const definitionRef={scope:"catalog",systemId:"generic",version:1,templateId:"generic-markdown"};
    const defined=await http(port,"/scenes",users.aCookie,"POST",{name:"Definiciones exactas",scene:{...image.scene,sceneAside:{...image.scene.sceneAside,monsters:["first","second"].map(id=>({id,name:id,templateId:"generic-markdown",notes:"# Ficha",imagePath:null,visibleToPlayer:false}))}},bindings:{monsters:{first:definitionRef,second:definitionRef}}});expect(defined.status).toBe(201);
    const definedId=(defined.json.resource as {id:string}).id;const definitions=await http(port,`/definitions/scenes/${definedId}`,users.aCookie);expect(definitions.status).toBe(200);expect(definitions.json.templates).toHaveLength(1);expect(definitions.json.monsters).toEqual({first:0,second:0});expect((await http(port,`/definitions/scenes/${definedId}`,users.bCookie)).status).toBe(404);
    for(const path of [`/scenes/${resource.id}`,`/scenes/${resource.id}/export`,`/assets/${asset}`,`/definitions/scenes/${resource.id}`])expect((await http(port,path,users.bCookie)).status).toBe(404);
    expect((await http(port,`/assets/${asset}`,users.bCookie,"HEAD")).status).toBe(404);
    expect((await http(port,"/assets/resolve",users.bCookie,"POST",{references:[`asset:${asset}`]})).json.assets).toEqual([{reference:`asset:${asset}`,url:null}]);
    const start=await app.backend.invitations.start(users.aCookie,a1.id,null,1,randomUUID());
    const guests=await Promise.all(["Mismo alias","Mismo alias","日本語"].map(alias=>app.backend.invitations.guests.admit(a1.id,{alias,secret:invitationSecret(start)},randomUUID(),null)));
    const listeners=guests.map(g=>stream(port,a1.id,`ttrpg_guest=${g.token}`));await Promise.all(listeners.map(s=>s.until(()=>s.events.length>0)));
    const publish=await http(port,`/games/${a1.id}/table/scene`,users.aCookie,"POST",{...context(start),command:{requestId:randomUUID(),context:null,payload:image},sceneResourceId:resource.id});expect(publish.status).toBe(200);
    await listeners[0].until(()=>listeners[0].events.some(e=>e.type==="scene"));expect(listeners[0].bytes).not.toContain("PRIVADO_CENTINELA");
    const key=randomUUID(),payload={...context(start),expectedInvitationVersion:1},kick=`/games/${a1.id}/participants/${guests[0].guest.participantId}/kick`;
    expect((await http(port,kick,users.aCookie,"POST",payload,{"if-match":"1","idempotency-key":key})).status).toBe(200);await listeners[0].until(()=>listeners[0].ended);expect(listeners[1].ended).toBe(false);
    const replay=await http(port,kick,users.aCookie,"POST",payload,{"if-match":"1","idempotency-key":key});expect(replay.json.replayed).toBe(true);expect(replay.json).not.toHaveProperty("invitationUrl");
    expect((await http(port,`/api/v1/games/${a1.id}/assets/${asset}`,`ttrpg_guest=${guests[0].token}`)).status).toBe(401);
    expect((await http(port,`/api/v1/games/${a1.id}/assets/${asset}`,`ttrpg_guest=${guests[1].token}`)).bytes).toEqual(png);
    const disabled=await http(port,"/api/v1/admin/systems/generic/versions/1/availability",users.adminCookie,"PATCH",{availability:"disabled"},{"if-match":"1"});expect(disabled.status).toBe(200);
    expect((await http(port,`/games/${a1.id}/configuration`,users.aCookie)).status).toBe(200);
    expect((await http(port,"/games",users.aCookie,"POST",{name:"Rechazada",systemRef:{systemId:"generic",version:1}})).status).toBe(409);
    expect((await http(port,"/games",users.aCookie)).json.games).toHaveLength(2);expect(a2.id).not.toBe(a1.id);
    if(kind==="postgres")expect(database).not.toHaveProperty("dataDir");
  },60000);
  it(`respaldo integral ${kind}, restauración aislada e invalidación antes de servir`,async()=>{
    const database=await fixture(kind),u=await accounts(database);await u.identity.close();const app=await openServiceApi(config(database),"3.13.0");
    const game=await app.backend.identity.authorized(u.aCookie,"dm",(_,tx)=>tx.games.create(u.a.id,"Respaldo A",{systemId:"generic",version:1}));
    await app.backend.identity.authorized(u.bCookie,"dm",(_,tx)=>tx.games.create(u.b.id,"Respaldo B",{systemId:"dnd-55e",version:1}));
    const start=await app.backend.invitations.start(u.aCookie,game.id,null,1,randomUUID()),guest=await app.backend.invitations.guests.admit(game.id,{alias:"Restaurado",secret:invitationSecret(start)},randomUUID(),null);
    const asset=randomUUID();await app.backend.identity.authorized(u.aCookie,"dm",(_,tx)=>tx.assets.create(asset,"image/png",png));
    await app.backend.identity.authorized(u.adminCookie,"admin",(_,tx)=>tx.systems.draft({systemId:"generic",version:2},systemSeeds[0].definition,0));
    const sourcePort=await app.listen();const saved=await http(sourcePort,"/scenes",u.aCookie,"POST",{name:"Escena de respaldo",scene:snapshot(asset).scene});expect(saved.status).toBe(201);const sceneId=(saved.json.resource as {id:string}).id;
    await app.backend.identity.authorized(u.aCookie,"dm",(_,tx)=>tx.links.link(game.id,"scenes",sceneId));await app.close();
    const sourceInventory=await inventory(database);
    let restored:DatabaseConfig;
    if(database.driver==="sqlite"){
      const target=directory();for(const name of readdirSync(database.dataDir).filter(name=>/^control\.sqlite(?:-wal|-shm)?$/.test(name)))copyFileSync(join(database.dataDir,name),join(target,name));restored={...database,dataDir:target};expect(statSync(join(target,"control.sqlite")).size).toBeGreaterThan(0);
    }else{
      const name=`ttrpg_restore_${randomUUID().replaceAll("-","")}`,pool=postgresPool(admin);try{await pool.query(`CREATE DATABASE "${name}"`);}finally{await pool.end();}
      cleanup.push(async()=>{const p=postgresPool(admin);try{await p.query(`DROP DATABASE "${name}"`);}finally{await p.end();}});const url=new URL(database.url);const targetUrl=new URL(database.url);targetUrl.pathname=`/${name}`;restored={...database,url:targetUrl.href};
      const tools=JSON.parse(readFileSync(process.env.TTRPG_TEST_PG_TOOLS??"/tmp/ttrpg-auth-pg-tools.json","utf8")) as {pg_dump:string;pg_restore:string};
      const temp=directory(),pass=join(temp,"pgpass"),dump=join(temp,"backup.dump");const escape=(s:string)=>s.replaceAll("\\","\\\\").replaceAll(":","\\:");writeFileSync(pass,`${escape(url.hostname)}:${url.port||"5432"}:*:${escape(decodeURIComponent(url.username))}:${escape(decodeURIComponent(url.password))}\n`,{mode:0o600});
      const env={...process.env,PGHOST:url.hostname,PGPORT:url.port||"5432",PGUSER:decodeURIComponent(url.username),PGSSLMODE:"verify-full",PGSSLROOTCERT:database.caFile,PGPASSFILE:pass};
      const dumped=spawnSync(tools.pg_dump,["--format=custom","--file",dump],{env:{...env,PGDATABASE:decodeURIComponent(url.pathname.slice(1))},stdio:"pipe"});expect(dumped.status,"pg_dump debe terminar sin imprimir secretos").toBe(0);
      const recovered=spawnSync(tools.pg_restore,["--no-owner","--no-privileges","--exit-on-error","--dbname",name,dump],{env,stdio:"pipe"});expect(recovered.status,"pg_restore aislado debe terminar correctamente").toBe(0);
    }
    expect(await raw(restored,async c=>(await c.query("SELECT count(*) AS n FROM ttrpg_games")).rows[0].n)).toEqual(await raw(database,async c=>(await c.query("SELECT count(*) AS n FROM ttrpg_games")).rows[0].n));
    expect(await inventory(restored)).toEqual(sourceInventory);
    await invalidateRestoredAccess(restored);const next=await openServiceApi(config(restored,randomBytes(32).toString("base64url")),"3.13.0");cleanup.push(()=>next.close());const port=await next.listen();
    expect((await http(port,"/api/v1/identity/session",u.aCookie)).status).toBe(401);expect((await http(port,`/api/v1/games/${game.id}/guest/session`,`ttrpg_guest=${guest.token}`)).status).toBe(401);
    const login=await next.backend.identity.login(u.a.email,changed,"restore-a"),b=await next.backend.identity.login(u.b.email,changed,"restore-b");expect((await http(port,`/assets/${asset}`,login.cookie)).bytes).toEqual(png);expect((await http(port,`/assets/${asset}`,b.cookie)).status).toBe(404);expect((await http(port,`/scenes/${sceneId}`,login.cookie)).status).toBe(200);expect((await http(port,`/scenes/${sceneId}`,b.cookie)).status).toBe(404);
    expect((await next.backend.identity.listDms((await next.backend.identity.login("admin@example.test",changed,"restore-admin")).cookie,50,0)).total).toBe(2);
  },60000);
  it(`artefacto compilado ${kind} carga .env, precedencia y no abre SQLite auxiliar`,async()=>{
    const database=await fixture(kind),dir=directory();mkdirSync(join(dir,"web"));writeFileSync(join(dir,"web/index.html"),"<!doctype html><title>Acceso fixture</title>");
    const values:Record<string,string>={TTRPG_PORT:"0",TTRPG_HOST:"127.0.0.1",TTRPG_PUBLIC_ORIGIN:origin,TTRPG_AUTH_SECRET:secret,TTRPG_WEB_DIR:join(dir,"web"),TTRPG_DB_DRIVER:database.driver,TTRPG_DEPLOYMENT:database.deployment,...(database.driver==="sqlite"?{TTRPG_DATA_DIR:database.dataDir}:{TTRPG_DATABASE_URL:database.url,TTRPG_DB_TLS:database.tls,TTRPG_DB_CA_FILE:database.caFile!})};
    const file=join(dir,".env");writeFileSync(file,Object.entries(values).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join("\n"),{mode:0o600});
    const child=spawn(process.execPath,[`--env-file=${file}`,resolve("out/api/index.mjs")],{cwd:dir,env:{PATH:process.env.PATH,TTRPG_HOST:"127.0.0.1"},stdio:["ignore","pipe","pipe"]});cleanup.push(async()=>{if(child.exitCode===null){child.kill("SIGTERM");await new Promise<void>(resolve=>child.once("exit",()=>resolve()));}});
    const port=await new Promise<number>((resolve,reject)=>{let output="";const timer=setTimeout(()=>reject(new Error("API compilada no arrancó")),15000);child.once("exit",()=>{clearTimeout(timer);reject(new Error("API compilada terminó antes de escuchar"));});child.stdout.on("data",chunk=>{output+=chunk;const m=/Puerto: (\d+)/.exec(output);if(m){clearTimeout(timer);resolve(Number(m[1]));}});});
    expect((await http(port,"/api/v1/health","")).status).toBe(200);expect((await http(port,"/api/v1/scenes","ttrpg_session=old")).status).toBe(404);
    expect(readdirSync(dir).filter(n=>n.endsWith(".sqlite"))).toEqual([]);
  },30000);
}
