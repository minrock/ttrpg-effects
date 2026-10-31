import { resourceRecord } from "./records";
import type { ResourceKind } from "../../../application/services/owned-store";
import { createHash } from "node:crypto";
import { systemSeeds, type DefinitionRef, type ResourceBindings } from "../../../domain/systems/system-catalog";
import type { SqlConnection } from "../database/driver";
import { DataError } from "./transfer-errors";
export function stable(value: unknown): string { if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]"; if (value && typeof value === "object") return "{" + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => JSON.stringify(k) + ":" + stable(v)).join(",") + "}"; return JSON.stringify(value) ?? "null"; }
export const definitionHash = (value: unknown) => createHash("sha256").update(stable(value)).digest("hex");
/** Solo transición operativa: las definiciones personales nunca se publican. */
export function historicalBindings(value: unknown, kind: string, owner: string, templates: Map<string, unknown>): ResourceBindings {
  const ref = (templateId: string | null): DefinitionRef => {
    const personal = templateId && templates.get(templateId);
    if (personal) return { scope: "private", ownerId: owner, templateId: templateId!, version: 1, hash: definitionHash(personal) };
    const seed = systemSeeds.find(s => s.definition.presentations.some(p => p.id === templateId));
    if (templateId && !seed) throw new DataError("TEMPLATE_MISSING");
    return { scope: "catalog", ...(seed ?? systemSeeds[0]).ref, templateId: templateId ?? "generic-markdown" };
  };
  const data = value as { templateId?: string | null; scene?: { sceneAside: { monsters: Array<{id: string; templateId: string | null}> } } };
  if (kind === "monsters") return { root: ref(data.templateId ?? null), monsters: {} };
  return { monsters: kind === "scenes" ? Object.fromEntries(data.scene!.sceneAside.monsters.map(m => [m.id, ref(m.templateId)])) : {} };
}
function historicalRecord(kind: ResourceKind, body: unknown) { try { return resourceRecord(kind,JSON.parse(String(body))); } catch { throw new DataError("CORRUPT"); } }
export async function seedSystems(c: SqlConnection): Promise<void> {
  for (const seed of systemSeeds) {
    await c.query("INSERT INTO system_catalog(system_id,name) VALUES($1,$2)", [seed.ref.systemId, seed.name]);
    const templates = Object.fromEntries(seed.definition.presentations.map(t => [t.id, { availability: "enabled", revision: 1 }]));
    await c.query("INSERT INTO system_versions(system_id,version,state,revision,availability,definition,hash,templates,created_at,published_at) VALUES($1,1,'published',1,'enabled',$2,$3,$4,'2026-10-30T00:00:00.000Z','2026-10-30T00:00:00.000Z')", [seed.ref.systemId, stable(seed.definition), definitionHash(seed.definition), stable(templates)]);
  }
  const owners = (await c.query("SELECT DISTINCT owner_id FROM owned_resources")).rows;
  for (const { owner_id: owner } of owners) {
    for (let offset=0;;offset+=10) {
      const rows=(await c.query("SELECT id,body FROM owned_resources WHERE owner_id=$1 AND kind='templates' ORDER BY id LIMIT 10 OFFSET $2",[String(owner),offset])).rows;
      for(const row of rows) { const value=historicalRecord("templates",row.body); if(value.id !== row.id)throw new DataError("CORRUPT"); await c.query("INSERT INTO retained_templates(owner_id,id,version,hash,body) VALUES($1,$2,1,$3,$4)",[String(owner),value.id,definitionHash(value),stable(value)]); }
      if(rows.length<10)break;
    }
    for (let offset=0;;offset+=10) {
      const rows=(await c.query("SELECT kind,id,body FROM owned_resources WHERE owner_id=$1 AND kind<>'templates' ORDER BY kind,id LIMIT 10 OFFSET $2",[String(owner),offset])).rows;
      for(const row of rows) {
        const value=historicalRecord(row.kind as ResourceKind,row.body); if(value.id !== row.id)throw new DataError("CORRUPT");
        const ids="templateId" in value ? [value.templateId] : "scene" in value ? value.scene.sceneAside.monsters.map(m=>m.templateId) : [];
        const templates=new Map<string,unknown>();
        for(const id of new Set(ids)) if(id) { const retained=(await c.query("SELECT body FROM retained_templates WHERE owner_id=$1 AND id=$2 AND version=1",[String(owner),id])).rows[0]; if(retained)templates.set(id,JSON.parse(String(retained.body))); }
        await c.query("UPDATE owned_resources SET bindings=$1 WHERE owner_id=$2 AND kind=$3 AND id=$4",[stable(historicalBindings(value,String(row.kind),String(owner),templates)),String(owner),String(row.kind),String(row.id)]);
      }
      if(rows.length<10)break;
    }
  }
}
