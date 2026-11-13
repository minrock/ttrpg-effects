import { createHash } from "node:crypto";
import { z } from "zod";
import type { DraftRepository } from "../../../application/services/draft-store";
import { OwnedError } from "../../../application/services/owned-store";
import { sameRecoverySlot, canonical, DRAFT_LIMITS, draftContextSchema, draftContentSchema, draftHeadSchema, draftPutSchema, type DraftHead } from "../../../domain/drafts/draft";
import type { Execute, CatalogClock } from "../database/catalog-repository";
import type { Row, SqlConnection } from "../database/driver";
function head(row: Row): DraftHead {
  try { return draftHeadSchema.parse({ id: row.id, context: JSON.parse(String(row.context)), revision: Number(row.revision), sequence: Number(row.sequence), hash: row.hash, updatedAt: row.updated_at, confirmedSequence: Number(row.confirmed_sequence) }); }
  catch { throw new OwnedError("CORRUPT"); }
}
/** Ejecutar dentro de una transacción exclusiva; nunca toca escenas guardadas. */
export async function compactRecoveryCopies(c: SqlConnection, owner: string): Promise<void> {
  const rows=(await c.query("SELECT * FROM owned_drafts WHERE owner_id=$1 ORDER BY updated_at DESC,id DESC",[owner])).rows;
  const groups:DraftHead[][]=[];
  // Una reserva vacía posterior no sustituye un respaldo con contenido.
  rows.sort((a,b)=>Number(Number(b.revision)>0)-Number(Number(a.revision)>0));
  for(const row of rows){
    const current=head(row),group=groups.find(group=>sameRecoverySlot(group[0].context,current.context));
    if(group)group.push(current);else groups.push([current]);
  }
  for(const [current,...obsolete] of groups){
    const versions=(await c.query("SELECT revision FROM owned_draft_versions WHERE owner_id=$1 AND draft_id=$2",[owner,current.id])).rows;
    // El listado habitual lee solo metadatos, sin descargar documentos ya consolidados.
    if(!obsolete.length && versions.length===(current.revision>0?1:0) && (!versions.length||Number(versions[0].revision)===current.revision))continue;
    if(current.revision>0){
      const latest=(await c.query("SELECT body FROM owned_draft_versions WHERE owner_id=$1 AND draft_id=$2 AND revision=$3",[owner,current.id,current.revision])).rows[0];
      try {
        const content=draftContentSchema.parse(JSON.parse(String(latest?.body)));
        if(createHash("sha256").update(canonical(content)).digest("hex")!==current.hash)throw new Error();
      } catch { throw new OwnedError("CORRUPT"); }
    }
    for(const old of obsolete)await c.query("DELETE FROM owned_drafts WHERE owner_id=$1 AND id=$2",[owner,old.id]);
    await c.query("DELETE FROM owned_draft_versions WHERE owner_id=$1 AND draft_id=$2 AND revision<>$3",[owner,current.id,current.revision]);
  }
}
/** execute pertenece a la transacción autorizada, con exclusión SQL antes de leer cuotas. */
export function draftRepository(execute: Execute, owner: string, clock: CatalogClock): DraftRepository {
  const read = (id: string) => execute(async c => {
    if (!z.uuid().safeParse(id).success) throw new OwnedError("VALIDATION");
    const row = (await c.query("SELECT * FROM owned_drafts WHERE owner_id=$1 AND id=$2", [owner,id])).rows[0];
    if (!row) throw new OwnedError("NOT_FOUND"); return row;
  });
  const writable = (gameId: string) => execute(async c => {
    const row = (await c.query("SELECT state,deleted_at FROM ttrpg_games WHERE owner_id=$1 AND id=$2", [owner,gameId])).rows[0];
    if (!row || row.deleted_at) throw new OwnedError("NOT_FOUND");
    if (row.state !== "ready") throw new OwnedError("CONFLICT");
  });
  const slotRows = async (c: SqlConnection, context: DraftHead["context"]) => {
    const rows=(await c.query("SELECT * FROM owned_drafts WHERE owner_id=$1 AND game_id=$2 ORDER BY updated_at DESC,id DESC",[owner,context.gameId])).rows;
    return rows.filter(row=>sameRecoverySlot(head(row).context,context)).sort((a,b)=>Number(Number(b.revision)>0)-Number(Number(a.revision)>0));
  };
  const compactSlot = async (c: SqlConnection, current: DraftHead) => {
    for(const row of await slotRows(c,current.context))if(row.id!==current.id)await c.query("DELETE FROM owned_drafts WHERE owner_id=$1 AND id=$2",[owner,String(row.id)]);
  };
  // Las copias confirmadas no ocupan una plaza de trabajo pendiente.
  const requireBranchSlot = async (c: SqlConnection) => {
    const count=Number((await c.query("SELECT COUNT(*) AS count FROM owned_drafts WHERE owner_id=$1 AND (revision=0 OR sequence>confirmed_sequence)",[owner])).rows[0].count);
    if(count>=DRAFT_LIMITS.branches)throw new OwnedError("DRAFT_BRANCH_LIMIT");
  };
  return {
    instance: () => execute(async c => {
      await c.query("INSERT INTO identity_settings(key,value) VALUES('draft_instance',$1) ON CONFLICT(key) DO NOTHING", [clock.id()]);
      return String((await c.query("SELECT value FROM identity_settings WHERE key='draft_instance'")).rows[0].value);
    }),
    list: (gameId, offset=0) => execute(async c => {
      if (!Number.isSafeInteger(offset) || offset<0 || gameId && !z.uuid().safeParse(gameId).success) throw new OwnedError("VALIDATION");
      await compactRecoveryCopies(c,owner);
      const where=gameId ? "owner_id=$1 AND game_id=$2" : "owner_id=$1", values=gameId?[owner,gameId]:[owner];
      const rows=await c.query(`SELECT * FROM owned_drafts WHERE ${where} ORDER BY updated_at DESC,id LIMIT 50 OFFSET $${values.length+1}`, [...values,offset]);
      return { drafts:rows.rows.map(head), total:Number((await c.query(`SELECT COUNT(*) AS count FROM owned_drafts WHERE ${where}`, values)).rows[0].count) };
    }),
    create: async input => {
      const parsed=draftContextSchema.safeParse(input); if(!parsed.success)throw new OwnedError("VALIDATION"); const context={...parsed.data,parentDraftId:null};
      await writable(context.gameId);
      return execute(async c=>{
        await compactRecoveryCopies(c,owner);
        const existing=(await slotRows(c,context))[0];
        if(existing)return head(existing);
        await requireBranchSlot(c);
        const id=clock.id(), at=clock.now().toISOString();
        await c.query("INSERT INTO owned_drafts(owner_id,id,game_id,context,updated_at) VALUES($1,$2,$3,$4,$5)",[owner,id,context.gameId,JSON.stringify(context),at]);
        return head(await read(id));
      });
    },
    get: async (id, revision) => {
      const draft=head(await read(id));
      if(revision!==undefined&&(!Number.isSafeInteger(revision)||revision<1))throw new OwnedError("VALIDATION");
      return execute(async c=>{
        const rows=(await c.query("SELECT revision,sequence,updated_at FROM owned_draft_versions WHERE owner_id=$1 AND draft_id=$2 ORDER BY revision DESC",[owner,id])).rows;
        const row=(await c.query("SELECT body FROM owned_draft_versions WHERE owner_id=$1 AND draft_id=$2 AND revision=$3",[owner,id,revision??draft.revision])).rows[0];
        if(!row&&revision)throw new OwnedError("NOT_FOUND");
        let content=null;
        if(row)try { content=draftContentSchema.parse(JSON.parse(String(row.body))); } catch { throw new OwnedError("CORRUPT"); }
        return { ok:true, draft, content, versions:rows.map(v=>({revision:Number(v.revision),sequence:Number(v.sequence),updatedAt:String(v.updated_at)})) };
      });
    },
    put: async (id, expected, key, input) => {
      const parsed=draftPutSchema.safeParse(input);if(!parsed.success||!z.uuid().safeParse(key).success||!Number.isSafeInteger(expected)||expected<0)throw new OwnedError("VALIDATION");
      const put=parsed.data, body=JSON.stringify(put.content), bytes=Buffer.byteLength(body);
      if(Buffer.byteLength(JSON.stringify(put))>DRAFT_LIMITS.bytes)throw new OwnedError("RESULT_TOO_LARGE");
      if(createHash("sha256").update(canonical(put.content)).digest("hex")!==put.hash)throw new OwnedError("VALIDATION");
      const receiptHash=createHash("sha256").update(canonical(put)).digest("hex");
      const row=await read(id), current=head(row);
      if(row.receipt_key===key){if(row.receipt_hash!==receiptHash)throw new OwnedError("OPERATION_CONTENT_CONFLICT");try{return draftHeadSchema.parse(JSON.parse(String(row.receipt_result)));}catch{throw new OwnedError("CORRUPT");}}
      await writable(current.context.gameId);
      if(current.revision!==expected||put.sequence<=current.sequence)throw new OwnedError("CONFLICT");
      return execute(async c=>{
        if((await slotRows(c,current.context))[0]?.id!==id)throw new OwnedError("CONFLICT");
        if(current.revision>0 && current.sequence===current.confirmedSequence)await requireBranchSlot(c);
        const retained=(await c.query("SELECT revision,bytes FROM owned_draft_versions WHERE owner_id=$1 AND draft_id=$2 ORDER BY revision DESC",[owner,id])).rows;
        const removed=retained.slice(DRAFT_LIMITS.generations-1);
        const total=Number((await c.query("SELECT COALESCE(SUM(bytes),0) AS bytes FROM owned_draft_versions WHERE owner_id=$1",[owner])).rows[0].bytes);
        let obsoleteBytes=0;
        for(const sibling of await slotRows(c,{...current.context,sceneId:put.sceneId}))if(sibling.id!==id){
          obsoleteBytes+=Number((await c.query("SELECT COALESCE(SUM(bytes),0) AS bytes FROM owned_draft_versions WHERE owner_id=$1 AND draft_id=$2",[owner,String(sibling.id)])).rows[0].bytes);
        }
        if(total-obsoleteBytes+bytes-removed.reduce((n,r)=>n+Number(r.bytes),0)>DRAFT_LIMITS.remoteBytes)throw new OwnedError("DRAFT_STORAGE_LIMIT");
        const revision=current.revision+1, at=clock.now().toISOString(), context={...current.context,sceneId:put.sceneId,baseRevision:put.baseRevision};
        const next={...current,context,revision,sequence:put.sequence,hash:put.hash,updatedAt:at};
        const result=await c.query("UPDATE owned_drafts SET context=$1,revision=$2,sequence=$3,hash=$4,updated_at=$5,receipt_key=$6,receipt_hash=$7,receipt_result=$8 WHERE owner_id=$9 AND id=$10 AND revision=$11",[JSON.stringify(context),revision,put.sequence,put.hash,at,key,receiptHash,JSON.stringify(next),owner,id,expected]);
        if(!result.changes)throw new OwnedError("CONFLICT");
        await c.query("INSERT INTO owned_draft_versions(owner_id,draft_id,revision,sequence,body,bytes,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7)",[owner,id,revision,put.sequence,body,bytes,at]);
        for(const old of removed)await c.query("DELETE FROM owned_draft_versions WHERE owner_id=$1 AND draft_id=$2 AND revision=$3",[owner,id,Number(old.revision)]);
        await compactSlot(c,next);
        return next;
      });
    },
    confirmed: async(id,revision,sceneId,sceneRevision)=>{
      const current=head(await read(id));if(current.revision!==revision)throw new OwnedError("CONFLICT");
      const context={...current.context,sceneId,baseRevision:sceneRevision};
      await execute(async c=>{
        await c.query("UPDATE owned_drafts SET confirmed_sequence=$1,context=$2 WHERE owner_id=$3 AND id=$4 AND revision=$5",[current.sequence,JSON.stringify(context),owner,id,revision]);
        await compactSlot(c,{...current,context});
      });
    },
    remove: async(id,revision)=>{
      if(head(await read(id)).revision!==revision)throw new OwnedError("CONFLICT");
      await execute(c=>c.query("DELETE FROM owned_drafts WHERE owner_id=$1 AND id=$2 AND revision=$3",[owner,id,revision]));
    }
  };
}
