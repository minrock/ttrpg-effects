import { z } from "zod";
import { CatalogError, type GameCatalog } from "../../../application/services/game-catalog";
import { gameIdSchema, gameMetadataSchema, gameNameSchema, gameStateSchema, ownerIdSchema, type GameMetadata } from "../../../domain/games/game-metadata";
import type { Row, SqlConnection } from "./driver";

export type Execute = <T>(work: (connection: SqlConnection) => Promise<T>) => Promise<T>;
export interface CatalogClock { now(): Date; id(): string }
const columns = 'id,owner_id AS "ownerId",name,state,created_at AS "createdAt",updated_at AS "updatedAt",revision,system_id,system_version';
function input<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new CatalogError("VALIDATION");
  return parsed.data;
}
function read(row: Row): GameMetadata {
  const { system_id, system_version, ...fields } = row;
  const parsed = gameMetadataSchema.safeParse({ ...fields, systemRef: { systemId: system_id, version: system_version } });
  if (!parsed.success || parsed.data.name !== row.name) throw new CatalogError("CORRUPT");
  return parsed.data;
}
function identity(ownerId: string, id: string): void { input(ownerIdSchema, ownerId); input(gameIdSchema, id); }
export function catalogRepository(execute: Execute, clock: CatalogClock): GameCatalog {
  const findOn = async (connection: SqlConnection, ownerId: string, id: string) => {
    const result = await connection.query(`SELECT ${columns} FROM ttrpg_games WHERE owner_id=$1 AND id=$2 AND deleted_at IS NULL`, [ownerId, id]);
    return result.rows.length ? read(result.rows[0]) : null;
  };
  return {
    async create(ownerId, name, systemRef) {
      input(ownerIdSchema, ownerId); const normalized = input(gameNameSchema, name);
      const timestamp = clock.now().toISOString();
      const game = input(gameMetadataSchema, { systemRef, id: clock.id(), ownerId, name: normalized, state: "ready", createdAt: timestamp, updatedAt: timestamp });
      return execute(async connection => {
        try { await connection.query("INSERT INTO ttrpg_games(id,owner_id,name,state,created_at,updated_at,system_id,system_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [game.id, game.ownerId, game.name, game.state, game.createdAt, game.updatedAt, game.systemRef.systemId, game.systemRef.version]); }
        catch (error) {
          const e = error as { code?: string; errcode?: number };
          if (e.code === "23505" || e.errcode === 1555 || e.errcode === 2067) throw new CatalogError("CONFLICT");
          throw error;
        }
        return game;
      });
    },
    async find(ownerId, id) { identity(ownerId, id); return execute(connection => findOn(connection, ownerId, id)); },
    async list(ownerId, page = {}) {
      input(ownerIdSchema, ownerId);
      const { limit, offset } = input(z.object({ limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).default(0) }).strict(), page);
      return execute(async connection => {
        // La página lleva su conteo; si está vacía se consulta el total del propietario.
        const result = await connection.query(`SELECT ${columns},COUNT(*) OVER() AS total FROM ttrpg_games WHERE owner_id=$1 AND deleted_at IS NULL ORDER BY updated_at DESC,id ASC LIMIT $2 OFFSET $3`, [ownerId, limit, offset]);
        const total = result.rows.length ? Number(result.rows[0].total) : Number((await connection.query("SELECT COUNT(*) AS total FROM ttrpg_games WHERE owner_id=$1 AND deleted_at IS NULL", [ownerId])).rows[0].total);
        if (!Number.isSafeInteger(total) || total < 0) throw new CatalogError("CORRUPT");
        return { games: result.rows.map(row => { const copy = { ...row }; delete copy.total; return read(copy); }), total };
      });
    },
    async update(ownerId, id, patch, expectedRevision) {
      identity(ownerId, id);
      const fields = input(z.object({ name: gameNameSchema.optional(), state: gameStateSchema.optional() }).strict().refine(p => p.name !== undefined || p.state !== undefined), patch);
      return execute(async connection => {
        const current = await findOn(connection, ownerId, id);
        if (!current) return null;
        if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)) throw new CatalogError("VALIDATION");
        if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new CatalogError("REVISION_CONFLICT");
        const updatedAt = new Date(Math.max(clock.now().getTime(), Date.parse(current.updatedAt))).toISOString();
        const assignments: string[] = ["updated_at=$1", "revision=revision+1"];
        const values: string[] = [updatedAt];
        if (fields.name !== undefined) { values.push(fields.name); assignments.push(`name=$${values.length}`); }
        if (fields.state !== undefined) { values.push(fields.state); assignments.push(`state=$${values.length}`); }
        values.push(ownerId, id, String(current.revision));
        const rows = (await connection.query(`UPDATE ttrpg_games SET ${assignments.join(",")} WHERE owner_id=$${values.length - 2} AND id=$${values.length - 1} AND revision=$${values.length} AND deleted_at IS NULL RETURNING ${columns}`, values)).rows;
        if (!rows.length) throw new CatalogError("REVISION_CONFLICT");
        return read(rows[0]);
      });
    },
    async delete(ownerId, id, expectedRevision) {
      identity(ownerId, id);
      return execute(async connection => {
        const current = await findOn(connection, ownerId, id);
        if (!current) return false;
        if (expectedRevision !== undefined && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)) throw new CatalogError("VALIDATION");
        if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new CatalogError("REVISION_CONFLICT");
        const changed = await connection.query("UPDATE ttrpg_games SET deleted_at=$1,revision=revision+1 WHERE owner_id=$2 AND id=$3 AND revision=$4 AND deleted_at IS NULL", [clock.now().toISOString(), ownerId, id, current.revision]);
        if (!changed.changes) throw new CatalogError("REVISION_CONFLICT");
        return true;
      });
    }
  };
}
