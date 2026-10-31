import { readRetainedTemplate } from "./records";
import { z } from "zod";
import { SystemError, type BindingPolicy, type ResourceGameLinks, type SystemCatalog } from "../../../application/services/system-catalog";
import { definitionRefSchema, resourceBindingsSchema, systemDefinitionSchema, systemIdSchema, systemRefSchema, availabilitySchema, sameSystem, type DefinitionRef, type ResourceBindings, type SystemRef, type SystemVersion } from "../../../domain/systems/system-catalog";
import type { CommitEffects, ResourceKind } from "../../../application/services/owned-store";
import type { Execute } from "../database/catalog-repository";
import type { Row } from "../database/driver";
import { definitionHash, stable } from "./system-data";
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new SystemError("VALIDATION"); return result.data; }
export function readSystem(row: Row): SystemVersion {
  try {
    const definition = systemDefinitionSchema.parse(JSON.parse(String(row.definition)));
    const templates = z.record(z.string(), z.strictObject({ availability: availabilitySchema, revision: z.number().int().min(1) })).parse(JSON.parse(String(row.templates)));
    const ref = systemRefSchema.parse({ systemId: row.system_id, version: row.version });
    if (definitionHash(definition) !== row.hash || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1 || !["draft", "published"].includes(String(row.state)) || definition.presentations.some(t => !templates[t.id]) || Object.keys(templates).length !== definition.presentations.length) throw new Error();
    const createdAt = z.iso.datetime().parse(row.created_at), publishedAt = z.iso.datetime().nullable().parse(row.published_at);
    if ((row.state === "published") !== (publishedAt !== null) || publishedAt && publishedAt < createdAt) throw new Error();
    return { ...ref, createdAt, publishedAt, definition, hash: String(row.hash), templates, revision: Number(row.revision), availability: availabilitySchema.parse(row.availability), state: row.state as "draft" | "published" };
  } catch { throw new SystemError("CORRUPT"); }
}
export function systemRepositories(run: Execute, owner: string, role: "admin" | "dm", effects: CommitEffects): { systems: SystemCatalog; bindings: BindingPolicy; links: ResourceGameLinks; validate(): Promise<void> } {
  const admin = () => { if (role !== "admin") throw new SystemError("FORBIDDEN"); };
  const dm = () => { if (role !== "dm") throw new SystemError("FORBIDDEN"); };
  const original = new Map<string, Promise<ResourceBindings | null>>();
  const newReferences: DefinitionRef[] = [], newGames: SystemRef[] = [];
  const originalLinks = new Map<string, Promise<boolean>>();
  const get = (ref: SystemRef) => run(async c => { parse(systemRefSchema, ref); const row = (await c.query("SELECT * FROM system_versions WHERE system_id=$1 AND version=$2", [ref.systemId, ref.version])).rows[0]; if (!row) throw new SystemError("NOT_FOUND"); const result = readSystem(row); if (role !== "admin" && result.state !== "published") throw new SystemError("NOT_FOUND"); return result; });
  const selectable = async (ref: SystemRef, templateId?: string) => { const version = await get({ systemId: ref.systemId, version: ref.version }); if (version.state !== "published" || version.availability !== "enabled" || templateId !== undefined && version.templates[templateId]?.availability !== "enabled") throw new SystemError("DISABLED"); };
  const definition = (input: DefinitionRef) => run(async c => {
    const ref = parse(definitionRefSchema,input);
    if (ref.scope === "private") {
      dm(); if (ref.ownerId !== owner) throw new SystemError("NOT_FOUND");
      const row = (await c.query("SELECT hash,body FROM retained_templates WHERE owner_id=$1 AND id=$2 AND version=$3", [owner, ref.templateId, ref.version])).rows[0];
      if (!row || row.hash !== ref.hash) throw new SystemError("NOT_FOUND"); const value = readRetainedTemplate(String(row.body),ref.templateId); if (definitionHash(value) !== ref.hash) throw new SystemError("CORRUPT"); return value;
    }
    const version = await get({ systemId: ref.systemId, version: ref.version }), template = version.definition.presentations.find(t => t.id === ref.templateId);
    if (version.state !== "published" || !template) throw new SystemError("NOT_FOUND"); return template;
  });
  const read = (kind: ResourceKind, id: string) => run(async c => { dm(); const row = (await c.query("SELECT bindings FROM owned_resources WHERE owner_id=$1 AND kind=$2 AND id=$3", [owner, kind, id])).rows[0]; try { return row ? resourceBindingsSchema.parse(JSON.parse(String(row.bindings))) : null; } catch { throw new SystemError("CORRUPT"); } });
  const capture = (kind: ResourceKind, id: string) => { const key = `${kind}/${id}`; if (!original.has(key)) original.set(key, read(kind, id)); return original.get(key)!; };
  const requireNew = async (ref: DefinitionRef) => { if (ref.scope === "private") throw new SystemError("DISABLED"); await selectable(ref, ref.templateId); newReferences.push(ref); };
  const systems: SystemCatalog = {
    create: (id, name) => run(async c => { admin(); parse(systemIdSchema, id); parse(z.string().trim().min(1).max(200), name); const result = await c.query("INSERT INTO system_catalog(system_id,name) VALUES($1,$2) ON CONFLICT(system_id) DO NOTHING", [id, name.trim()]); if (!result.changes) throw new SystemError("CONFLICT"); }),
    list: () => run(async c => { const rows = (await c.query("SELECT * FROM system_catalog ORDER BY system_id")).rows; const result = []; for (const row of rows) { const versions = (await c.query("SELECT * FROM system_versions WHERE system_id=$1 ORDER BY version", [String(row.system_id)])).rows.map(readSystem).filter(v => role === "admin" || v.state === "published"); if (role === "admin" || versions.length) result.push({ systemId: String(row.system_id), name: String(row.name), versions }); } return result; }),
    get,
    async selectable() { return (await systems.list()).flatMap(s=>s.versions.filter(v=>v.state === "published" && v.availability === "enabled").map(v=>({ref:{systemId:v.systemId,version:v.version},name:s.name,templates:v.definition.presentations.filter(t=>v.templates[t.id].availability === "enabled").map(t=>({id:t.id,name:t.name}))}))); },
    draft: (ref, input, revision) => run(async c => {
      admin(); parse(systemRefSchema, ref); const value = parse(systemDefinitionSchema, input); parse(z.number().int().min(0), revision);
      if (!(await c.query("SELECT system_id FROM system_catalog WHERE system_id=$1", [ref.systemId])).rows.length) throw new SystemError("NOT_FOUND");
      const old = (await c.query("SELECT * FROM system_versions WHERE system_id=$1 AND version=$2", [ref.systemId, ref.version])).rows[0];
      if (old && old.state === "published") throw new SystemError("IMMUTABLE");
      if ((old ? Number(old.revision) : 0) !== revision) throw new SystemError("CONFLICT");
      const templates = stable(Object.fromEntries(value.presentations.map(t => [t.id, { availability: "enabled", revision: 1 }])));
      const changed = old ? await c.query("UPDATE system_versions SET definition=$1,hash=$2,templates=$3,revision=revision+1 WHERE system_id=$4 AND version=$5 AND revision=$6 AND state='draft'", [stable(value), definitionHash(value), templates, ref.systemId, ref.version, revision]) : await c.query("INSERT INTO system_versions(system_id,version,state,revision,availability,definition,hash,templates,created_at,published_at) VALUES($1,$2,'draft',1,'enabled',$3,$4,$5,$6,NULL) ON CONFLICT(system_id,version) DO NOTHING", [ref.systemId, ref.version, stable(value), definitionHash(value), templates, new Date().toISOString()]);
      if (!changed.changes) throw new SystemError("CONFLICT");
      return get(ref);
    }),
    publish: (ref, revision) => run(async c => { admin(); parse(z.number().int().min(1),revision); const old = await get(ref); if (old.state !== "draft") throw new SystemError("IMMUTABLE"); if (old.revision !== revision) throw new SystemError("CONFLICT"); const changed = await c.query("UPDATE system_versions SET state='published',availability='enabled',published_at=$1,revision=revision+1 WHERE system_id=$2 AND version=$3 AND revision=$4 AND state='draft'", [new Date().toISOString(),ref.systemId, ref.version, revision]); if (!changed.changes) throw new SystemError("CONFLICT"); return get(ref); }),
    availability: (ref, value, revision, templateId) => run(async c => {
      admin(); parse(z.number().int().min(1),revision); parse(availabilitySchema, value); const old = await get(ref); if (old.state !== "published" && templateId !== undefined) throw new SystemError("IMMUTABLE");
      if (templateId !== undefined) { const target = old.templates[templateId]; if (!target) throw new SystemError("NOT_FOUND"); if (target.revision !== revision) throw new SystemError("CONFLICT"); const previous = stable(old.templates); old.templates[templateId] = { availability: value, revision: revision + 1 }; const changed = await c.query("UPDATE system_versions SET templates=$1 WHERE system_id=$2 AND version=$3 AND templates=$4", [stable(old.templates), ref.systemId, ref.version, previous]); if (!changed.changes) throw new SystemError("CONFLICT"); }
      else { if (old.revision !== revision) throw new SystemError("CONFLICT"); const changed = await c.query("UPDATE system_versions SET availability=$1,revision=revision+1 WHERE system_id=$2 AND version=$3 AND revision=$4", [value, ref.systemId, ref.version, revision]); if (!changed.changes) throw new SystemError("CONFLICT"); }
      return get(ref);
    }),
    resolve: async ref => { const v = await get(ref); if (v.state !== "published") throw new SystemError("NOT_FOUND"); return { ref: { systemId: v.systemId, version: v.version }, definition: v.definition, hash: v.hash, availability: v.availability }; },
    definition
  };
  const bindings: BindingPolicy = {
    read: async (kind, id) => (await read(kind,id)) ?? { monsters: {} },
    async write(kind, id, input, requested) {
      dm(); if (kind === "templates") throw new SystemError("IMMUTABLE");
      const previous = await capture(kind, id), value = input as { templateId?: string | null; scene?: { sceneAside: { monsters: Array<{ id: string; templateId: string | null }> } } };
      const next = requested === undefined && previous ? previous : parse(resourceBindingsSchema, requested ?? { monsters: {} });
      if (kind === "monsters" && !next.root || kind !== "monsters" && next.root || kind !== "scenes" && Object.keys(next.monsters).length) throw new SystemError("VALIDATION");
      const actual = kind === "monsters" ? [["root", value.templateId] as const] : kind === "scenes" ? value.scene!.sceneAside.monsters.map(m => [m.id, m.templateId] as const) : [];
      if (kind === "scenes" && (new Set(actual.map(([key]) => key)).size !== actual.length || Object.keys(next.monsters).length !== actual.length)) throw new SystemError("VALIDATION");
      for (const [key, template] of actual) {
        const ref = key === "root" ? next.root : next.monsters[key], old = key === "root" ? previous?.root : previous?.monsters[key];
        if (!ref || template !== null && ref.templateId !== template || template === null && ref.templateId !== "generic-markdown") throw new SystemError("VALIDATION");
        await definition(ref); if (!old || stable(old) !== stable(ref)) await requireNew(ref);
      }
      return structuredClone(next);
    },
    async newGame(input) { dm(); const ref = parse(systemRefSchema, input); await selectable(ref); newGames.push(ref); }
  };
  const game = (id: string) => run(async c => { dm(); const row = (await c.query("SELECT system_id,system_version FROM ttrpg_games WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL", [id, owner])).rows[0]; if (!row) throw new SystemError("NOT_FOUND"); return { systemId: String(row.system_id), version: Number(row.system_version) }; });
  const validate = async (gameId: string, kind: Exclude<ResourceKind,"templates">, id: string) => {
    const ref = await game(gameId), resource = await read(kind,id); if (!resource) throw new SystemError("NOT_FOUND");
    for (const binding of [...(resource.root ? [resource.root] : []), ...Object.values(resource.monsters)]) {
      if (binding.scope === "private" ? ref.systemId !== "generic" || ref.version !== 1 : !sameSystem(ref, binding)) throw new SystemError("INCOMPATIBLE");
      await definition(binding);
    }
  };
  const links: ResourceGameLinks = {
    validate,
    resolve: async id => systems.resolve(await game(id)),
    link: (gameId, kind, id) => run(async c => {
      dm(); if (!["scenes","monsters","npcs","player-characters"].includes(kind)) throw new SystemError("VALIDATION");
      const key = `${gameId}/${kind}/${id}`;
      if (!originalLinks.has(key)) originalLinks.set(key, c.query("SELECT game_id FROM game_resources WHERE owner_id=$1 AND game_id=$2 AND kind=$3 AND resource_id=$4", [owner,gameId,kind,id]).then(r => r.rows.length > 0));
      await validate(gameId, kind, id);
      if (!await originalLinks.get(key)) { const bound = await read(kind,id); for (const ref of [...(bound?.root ? [bound.root] : []), ...Object.values(bound?.monsters ?? {})]) await requireNew(ref); const ref = await game(gameId); await selectable(ref); newGames.push(ref); }
      await c.query("INSERT INTO game_resources(owner_id,game_id,kind,resource_id) VALUES($1,$2,$3,$4) ON CONFLICT(owner_id,game_id,kind,resource_id) DO NOTHING", [owner,gameId,kind,id]);
    })
  };
  const validateFinal = async () => {
    for (const ref of newGames) await selectable(ref);
    for (const ref of newReferences) { if (ref.scope === "private") throw new SystemError("DISABLED"); await selectable(ref, ref.templateId); }
    // Validar el estado final, incluso si varios métodos comenzaron antes de otro await.
    await run(async c => { if (role !== "dm") return; for (const row of (await c.query("SELECT r.game_id,r.kind,r.resource_id FROM game_resources r JOIN ttrpg_games g ON g.id=r.game_id AND g.owner_id=r.owner_id WHERE r.owner_id=$1 AND g.deleted_at IS NULL", [owner])).rows) await validate(String(row.game_id), row.kind as Exclude<ResourceKind,"templates">, String(row.resource_id)); });
  };
  effects.beforeCommit(validateFinal);
  return { systems, bindings, links, validate: validateFinal };
}
