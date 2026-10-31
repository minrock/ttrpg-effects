import { hostInvitationRepository } from "../invitations/host-repository";
import { systemRepositories } from "./system-repository";
import { SystemError } from "../../../application/services/system-catalog";
import { resourceBindingsSchema } from "../../../domain/systems/system-catalog";
import { createHash } from "node:crypto";
import { z } from "zod";
import { OwnedError, type OwnedTransaction, type ResourceKind, type Versioned, type ResourceBodies, type Opening, type CommitEffects } from "../../../application/services/owned-store";
import type { IdentitySessionDto } from "../../../shared/contracts/identity";
import type { Execute, CatalogClock } from "../database/catalog-repository";
import { catalogRepository } from "../database/catalog-repository";
import type { Row } from "../database/driver";
import { resourceRecord, searchText } from "./records";
const kinds = z.enum(["scenes", "templates", "monsters", "npcs", "player-characters"]);
const id = z.string().min(1).max(128);
const pageSchema = z.object({ limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0), text: z.string().max(200).default("") }).strict();
export function expected(value: unknown, allowCreate = false): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < (allowCreate ? 0 : 1)) throw new OwnedError("VALIDATION"); return value;
}
function check(kind: ResourceKind, key: string) { if (!kinds.safeParse(kind).success || !id.safeParse(key).success) throw new OwnedError("VALIDATION"); }
export function record<K extends ResourceKind>(kind: K, row: Row): Versioned<ResourceBodies[K]> {
  try {
    const value = resourceRecord(kind, JSON.parse(String(row.body)));
    if (value.id !== row.id || Buffer.from(value.id).toString("hex") !== row.sort_id || value.updatedAt !== row.updated_at || !Number.isSafeInteger(row.revision) || Number(row.revision) < 1) throw new Error();
    const createdAt = "createdAt" in value ? value.createdAt : value.updatedAt;
    if ((kind !== "templates" && createdAt !== row.created_at) || searchText(kind, value) !== row.search_text || ("name" in value ? value.name : value.characterName) !== row.name) throw new Error();
    return { value, revision: Number(row.revision), bindings: resourceBindingsSchema.parse(JSON.parse(String(row.bindings ?? '{"monsters":{}}'))) };
  } catch { throw new OwnedError("CORRUPT"); }
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object") return "{" + Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => JSON.stringify(key) + ":" + canonical(item)).join(",") + "}";
  return JSON.stringify(value) ?? "null";
}
export const fingerprint = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const openingSchema = z.object({ id: z.uuid(), gameId: z.uuid(), generation: z.number().int().min(1), state: z.enum(["open", "closed"]), hostAccountId: id, hostSessionId: id, createdAt: z.iso.datetime(), closedAt: z.iso.datetime().nullable(), lastHeartbeatAt: z.iso.datetime(), leaseExpiresAt: z.iso.datetime(), revision: z.number().int().min(1) }).strict();
const openingColumns = 'id,game_id AS "gameId",generation,state,host_account_id AS "hostAccountId",host_session_id AS "hostSessionId",created_at AS "createdAt",closed_at AS "closedAt",last_heartbeat_at AS "lastHeartbeatAt",lease_expires_at AS "leaseExpiresAt",revision';
function opening(row: Row): Opening { const result = openingSchema.safeParse(row); if (!result.success) throw new OwnedError("CORRUPT"); return result.data; }
export function ownedRepositories(run: Execute, identity: IdentitySessionDto, clock: CatalogClock, commitEffects: CommitEffects): OwnedTransaction & { verifyInvariants(): Promise<void> } {
  const { role, id: owner } = identity.account, sessionId = identity.sessionId;
  const requireDm = () => { if (role !== "dm") throw new OwnedError("FORBIDDEN"); };
  const execute: Execute = work => run(async c => { requireDm(); return work(c); });
  const registerEffect = (action: () => void) => { try { requireDm(); action(); } catch (error) { void run(async () => { throw error; }).catch(() => undefined); throw error; } };
  const effects: CommitEffects = {
    beforeCommit(check) { registerEffect(() => commitEffects.beforeCommit(check)); },
    afterCommit(apply, uncertain) { registerEffect(() => commitEffects.afterCommit(apply, uncertain)); }
  };
  const { systems, bindings, links, validate } = systemRepositories(run, owner, role, commitEffects);
  const catalog = catalogRepository(execute, clock);
  const scoped = <T>(candidate: string, action: () => Promise<T>): Promise<T> => execute(async () => {
    if (candidate !== owner) throw new OwnedError("NOT_FOUND");
    return action();
  });
  const games: OwnedTransaction["games"] = {
    create: (candidate, name, systemRef) => scoped(candidate, async () => { if (!systemRef) throw new SystemError("VALIDATION"); await bindings.newGame(systemRef); return catalog.create(owner, name, systemRef); }),
    find: (candidate, key) => scoped(candidate, () => catalog.find(owner, key)),
    list: (candidate, page) => scoped(candidate, () => catalog.list(owner, page)),
    update: (candidate, key, patch, revision) => scoped(candidate, () => catalog.update(owner, key, patch, revision)),
    delete: (candidate, key, revision) => scoped(candidate, () => catalog.delete(owner, key, revision))
  };
  const resources: OwnedTransaction["resources"] = {
    async get(kind, key) { check(kind, key); return execute(async c => { const row = (await c.query("SELECT * FROM owned_resources WHERE owner_id=$1 AND kind=$2 AND id=$3", [owner, kind, key])).rows[0]; return row ? record(kind, row) : null; }); },
    async list(kind, page = {}) {
      check(kind, "list"); const parsed = pageSchema.safeParse(page); if (!parsed.success) throw new OwnedError("VALIDATION");
      const { limit, offset, text } = parsed.data;
      const needle = text.trim().normalize("NFC").toLowerCase();
      // POSITION/INSTR differences stay in infrastructure; LIKE uses literal escaped wildcard and normalized text.
      const pattern = "%" + needle.replace(/[\\%_]/g, c => "\\" + c) + "%";
      return execute(async c => {
        const where = "owner_id=$1 AND kind=$2 AND search_text LIKE $3 ESCAPE '\\'";
        const values = [owner, kind, pattern];
        const result = await c.query(`SELECT * FROM owned_resources WHERE ${where} ORDER BY updated_at DESC,sort_id ASC LIMIT $4 OFFSET $5`, [...values, limit, offset]);
        const total = Number((await c.query(`SELECT COUNT(*) AS total FROM owned_resources WHERE ${where}`, values)).rows[0].total);
        return { items: result.rows.map(row => record(kind, row)), total };
      });
    },
    async put(kind, value, revision, requestedBindings) {
      if (kind === "templates") throw new SystemError("IMMUTABLE");
      check(kind, value.id); expected(revision, true); const normalized = resourceRecord(kind, value);
      const bound = await bindings.write(kind, value.id, normalized, requestedBindings);
      const name = "name" in normalized ? normalized.name : normalized.characterName;
      const created = "createdAt" in normalized ? normalized.createdAt : normalized.updatedAt;
      return execute(async c => {
        if (revision === 0) {
          const result = await c.query("INSERT INTO owned_resources(owner_id,kind,id,name,search_text,sort_id,created_at,updated_at,revision,body,bindings) VALUES($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10) ON CONFLICT(owner_id,kind,id) DO NOTHING", [owner, kind, value.id, name, searchText(kind, normalized), Buffer.from(value.id).toString("hex"), created, normalized.updatedAt, JSON.stringify(normalized), JSON.stringify(bound)]);
          if (!result.changes) throw new OwnedError("CONFLICT");
        } else {
          const current = (await c.query("SELECT * FROM owned_resources WHERE owner_id=$1 AND kind=$2 AND id=$3", [owner, kind, value.id])).rows[0];
          if (!current) throw new OwnedError("NOT_FOUND"); record(kind, current);
          if (kind !== "templates" && created !== current.created_at) throw new OwnedError("VALIDATION");
          const result = await c.query("UPDATE owned_resources SET name=$1,search_text=$2,updated_at=$3,body=$4,bindings=$5,revision=revision+1 WHERE owner_id=$6 AND kind=$7 AND id=$8 AND revision=$9", [name, searchText(kind, normalized), normalized.updatedAt, JSON.stringify(normalized), JSON.stringify(bound), owner, kind, value.id, revision]);
          if (!result.changes) throw new OwnedError("CONFLICT");
        }
        return { value: normalized, revision: revision + 1, bindings: bound };
      });
    },
    async remove(kind, key, revision) {
      if (kind === "templates") throw new SystemError("IMMUTABLE");
      check(kind, key); expected(revision);
      const current = await resources.get(kind, key);
      if (!current) throw new OwnedError("NOT_FOUND");
      if (current.revision !== revision) throw new OwnedError("CONFLICT");
      await execute(async c => { const result = await c.query("DELETE FROM owned_resources WHERE owner_id=$1 AND kind=$2 AND id=$3 AND revision=$4", [owner, kind, key, revision]); if (!result.changes) throw new OwnedError("CONFLICT"); });
    }
  };
  const assets: OwnedTransaction["assets"] = {
    async get(key) { if (!z.uuid().safeParse(key).success) throw new OwnedError("VALIDATION"); return execute(async c => { const row = (await c.query("SELECT mime,bytes,sha256,byte_length FROM owned_assets WHERE owner_id=$1 AND id=$2", [owner, key])).rows[0]; if (!row) return null; if (!(row.bytes instanceof Uint8Array) || !["image/png", "image/jpeg", "image/webp"].includes(String(row.mime)) || row.bytes.length !== row.byte_length || createHash("sha256").update(row.bytes).digest("hex") !== row.sha256) throw new OwnedError("CORRUPT"); return { mime: String(row.mime), bytes: row.bytes }; }); },
    async has(key) { if (!z.uuid().safeParse(key).success) return false; return execute(async c => (await c.query("SELECT id FROM owned_assets WHERE owner_id=$1 AND id=$2", [owner, key])).rows.length > 0); },
    async create(key, mime, bytes) {
      if (!z.uuid().safeParse(key).success || !["image/png", "image/jpeg", "image/webp"].includes(mime) || bytes.length < 1 || bytes.length > 20 * 1024 * 1024) throw new OwnedError("VALIDATION");
      await execute(async c => { const result = await c.query("INSERT INTO owned_assets(owner_id,id,mime,bytes,sha256,byte_length) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(owner_id,id) DO NOTHING", [owner, key, mime, bytes, createHash("sha256").update(bytes).digest("hex"), bytes.length]); if (!result.changes) throw new OwnedError("CONFLICT"); });
    }
  };
  const ownGame = async (key: string) => { const game = await games.find(owner, key); if (!game) throw new OwnedError("NOT_FOUND"); return game; };
  const openings: OwnedTransaction["openings"] = {
    async current(gameId) { await ownGame(gameId); return execute(async c => { const row = (await c.query(`SELECT ${openingColumns} FROM game_openings WHERE game_id=$1 ORDER BY generation DESC LIMIT 1`, [gameId])).rows[0]; return row ? opening(row) : null; }); },
    async start(gameId, revision) {
      expected(revision); const game = await ownGame(gameId); if (game.state !== "ready" || game.revision !== revision) throw new OwnedError("CONFLICT");
      const previous = await openings.current(gameId); await openings.invalidate(gameId);
      const at = clock.now(), result: Opening = { id: clock.id(), gameId, generation: (previous?.generation ?? 0) + 1, state: "open", hostAccountId: owner, hostSessionId: sessionId, createdAt: at.toISOString(), closedAt: null, lastHeartbeatAt: at.toISOString(), leaseExpiresAt: new Date(at.getTime() + 150000).toISOString(), revision: 1 };
      await execute(c => c.query("INSERT INTO game_openings(id,game_id,generation,state,host_account_id,host_session_id,created_at,closed_at,last_heartbeat_at,lease_expires_at,revision) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)", [result.id, gameId, result.generation, result.state, owner, sessionId, result.createdAt, null, result.lastHeartbeatAt, result.leaseExpiresAt, 1])); return result;
    },
    async renew(gameId, key, generation) {
      const game = await ownGame(gameId); const current = await openings.current(gameId); const at = clock.now();
      if (game.state !== "ready" || !current || current.id !== key || current.generation !== generation || current.state !== "open" || current.leaseExpiresAt <= at.toISOString()) throw new OwnedError("CONFLICT");
      const acceptedAt = new Date(Math.max(at.getTime(), Date.parse(current.lastHeartbeatAt)));
      const next = { ...current, hostSessionId: sessionId, lastHeartbeatAt: acceptedAt.toISOString(), leaseExpiresAt: new Date(acceptedAt.getTime() + 150000).toISOString() };
      await execute(async c => { const result = await c.query("UPDATE game_openings SET last_heartbeat_at=$1,lease_expires_at=$2,host_session_id=$3 WHERE id=$4 AND game_id=$5 AND generation=$6 AND state='open' AND lease_expires_at>$7", [next.lastHeartbeatAt, next.leaseExpiresAt, sessionId, key, gameId, generation, at.toISOString()]); if (!result.changes) throw new OwnedError("CONFLICT"); }); return next;
    },
    async close(gameId, key, generation, revision) {
      expected(revision); await ownGame(gameId);
      await execute(async c => { const result = await c.query("UPDATE game_openings SET state='closed',closed_at=$1,revision=revision+1 WHERE game_id=$2 AND id=$3 AND generation=$4 AND revision=$5 AND state='open'", [clock.now().toISOString(), gameId, key, generation, revision]); if (!result.changes) throw new OwnedError("CONFLICT"); });
    },
    async invalidate(gameId) { await ownGame(gameId); await execute(c => c.query("UPDATE game_openings SET state='closed',closed_at=$1,revision=revision+1 WHERE game_id=$2 AND state='open'", [clock.now().toISOString(), gameId])); }
  };
  let operationUsed = false;
  const validateBudget = async () => {
    if (!operationUsed) return;
    await run(async c => { const budget = (await c.query("SELECT COUNT(*) AS count,COALESCE(SUM(result_bytes),0) AS bytes,MAX(expires_at) AS retry_at FROM owned_operations WHERE owner_id=$1",[owner])).rows[0]; if (Number(budget.count)>1000 || Number(budget.bytes)>64*1024*1024) throw new OwnedError("OPERATION_BUDGET",String(budget.retry_at)); });
  };
  commitEffects.beforeCommit(validateBudget);
  const invitations = hostInvitationRepository(execute, owner, clock);
  const result: OwnedTransaction = { invitations, games, resources, assets, openings, systems, links, effects,
    async operation(operationId, context, content, work) {
      operationUsed = true;
      if (!z.uuid().safeParse(operationId).success || !context || context.length > 300) throw new OwnedError("VALIDATION");
      const hash = fingerprint(content), now = clock.now();
      return run(async c => {
        await c.query("DELETE FROM owned_operations WHERE owner_id=$1 AND expires_at<=$2", [owner, now.toISOString()]);
        const prior = (await c.query("SELECT fingerprint,result,expires_at FROM owned_operations WHERE owner_id=$1 AND context=$2 AND operation_id=$3", [owner, context, operationId])).rows[0];
        if (prior && String(prior.expires_at) > now.toISOString()) {
          if (prior.fingerprint !== hash) throw new OwnedError("OPERATION_CONTENT_CONFLICT");
          try { return JSON.parse(String(prior.result)) as Awaited<ReturnType<typeof work>>; } catch { throw new OwnedError("CORRUPT"); }
        }
        if (prior) await c.query("DELETE FROM owned_operations WHERE owner_id=$1 AND context=$2 AND operation_id=$3", [owner, context, operationId]);
        const budget = (await c.query("SELECT COUNT(*) AS count,COALESCE(SUM(result_bytes),0) AS bytes,MAX(expires_at) AS retry_at FROM owned_operations WHERE owner_id=$1", [owner])).rows[0];
        if (Number(budget.count) >= 1000 || Number(budget.bytes) >= 64 * 1024 * 1024) throw new OwnedError("OPERATION_BUDGET", String(budget.retry_at));
        const result = await work(), resultJson = JSON.stringify(result ?? null), resultBytes = Buffer.byteLength(resultJson);
        if (resultBytes > 64 * 1024 * 1024) throw new OwnedError("RESULT_TOO_LARGE");
        if (Number(budget.bytes) + resultBytes > 64 * 1024 * 1024) throw new OwnedError("OPERATION_BUDGET", String(budget.retry_at));
        await c.query("INSERT INTO owned_operations(owner_id,context,operation_id,fingerprint,result,expires_at,result_bytes) VALUES($1,$2,$3,$4,$5,$6,$7)", [owner, context, operationId, hash, resultJson, new Date(now.getTime() + 24 * 3600000).toISOString(), resultBytes]); return result;
      });
    }
  };
  // Registrar el método completo, no solo sus queries: incluye validaciones y await previos.
  const tracked = <T extends object>(port: T, privatePort = false): T => new Proxy(port, { get(target, key, receiver) {
    const method: unknown = Reflect.get(target, key, receiver);
    return typeof method === "function" ? (...args: unknown[]) => run(async () => { if (privatePort) requireDm(); return Promise.resolve(Reflect.apply(method, target, structuredClone(args))); }) : method;
  } });
  return { ...result, verifyInvariants: async () => { await validate(); await validateBudget(); }, invitations: tracked(invitations, true), games: tracked(games, true), resources: tracked(resources, true), assets: tracked(assets, true), openings: tracked(openings, true), systems: tracked(systems), links: tracked(links, true), operation: (...args) => run(() => result.operation(...args)) };
}
