import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { compactRecoveryCopies } from "./draft-repository";
import { contentHash, type DraftContent, type DraftContext } from "../../../domain/drafts/draft";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import type { SqlConnection } from "../database/driver";

it("consolida datos históricos conservando la última copia con contenido por cuenta/partida/escena",async()=>{
 const db=new DatabaseSync(":memory:");
 try {
  db.exec("PRAGMA foreign_keys=ON; CREATE TABLE owned_drafts(owner_id TEXT,id TEXT PRIMARY KEY,game_id TEXT,context TEXT,revision INTEGER,sequence INTEGER,hash TEXT,updated_at TEXT,confirmed_sequence INTEGER); CREATE TABLE owned_draft_versions(owner_id TEXT,draft_id TEXT REFERENCES owned_drafts(id) ON DELETE CASCADE,revision INTEGER,body TEXT);");
  const c:SqlConnection={release(){},async query(sql,values=[]){const stmt=db.prepare(sql.replace(/\$\d+/g,"?"));return stmt.columns().length?{rows:stmt.all(...values),changes:0}:{rows:[],changes:Number(stmt.run(...values).changes)};}};
  const context:DraftContext={gameId:randomUUID(),sceneId:randomUUID(),writerId:randomUUID(),parentDraftId:null,baseRevision:1,systemRef:{systemId:"generic",version:1},systemHash:"hash"};
  const content:DraftContent={scene:createDefaultScene(),bindings:{monsters:{}},view:{camera:{x:0,y:0,zoom:1},sidebar:true,aside:true,selectedId:null}},hash=await contentHash(content);
  const seed=async(owner:string,ctx:DraftContext,date:string,revision=2)=>{
   const id=randomUUID();await c.query("INSERT INTO owned_drafts VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[owner,id,ctx.gameId,JSON.stringify(ctx),revision,revision,revision?hash:"",date,0]);
   for(let r=1;r<=revision;r++)await c.query("INSERT INTO owned_draft_versions VALUES($1,$2,$3,$4)",[owner,id,r,JSON.stringify(content)]);
   return id;
  };
  const old=await seed("owner",context,"2026-11-12T10:00:00.000Z");
  const latest=await seed("owner",context,"2026-11-12T11:00:00.000Z");
  const empty=await seed("owner",context,"2026-11-12T12:00:00.000Z",0);
  const otherScene=await seed("owner",{...context,sceneId:randomUUID()},"2026-11-12T09:00:00.000Z");
  const otherOwner=await seed("other",context,"2026-11-12T09:00:00.000Z");
  db.exec("BEGIN");await compactRecoveryCopies(c,"owner");db.exec("COMMIT");
  const ids=(await c.query("SELECT id FROM owned_drafts")).rows.map(r=>r.id);
  expect(ids).toEqual(expect.arrayContaining([latest,otherScene,otherOwner]));expect(ids).not.toContain(old);expect(ids).not.toContain(empty);
  expect((await c.query("SELECT revision FROM owned_draft_versions WHERE owner_id=$1",["owner"])).rows).toEqual([{revision:2},{revision:2}]);
  expect((await c.query("SELECT revision FROM owned_draft_versions WHERE owner_id=$1",["other"])).rows).toHaveLength(2);
  // Un superviviente dañado aborta toda la consolidación; el llamador revierte la transacción.
  await seed("owner",context,"2026-11-12T08:00:00.000Z");
  await c.query("UPDATE owned_draft_versions SET body=$1 WHERE draft_id=$2",["{}",latest]);
  const before=JSON.stringify((await c.query("SELECT * FROM owned_drafts")).rows);
  db.exec("BEGIN");await expect(compactRecoveryCopies(c,"owner")).rejects.toMatchObject({code:"CORRUPT"});db.exec("ROLLBACK");
  expect(JSON.stringify((await c.query("SELECT * FROM owned_drafts")).rows)).toBe(before);
 } finally {db.close();}
});
