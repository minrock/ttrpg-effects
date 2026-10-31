import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { InvitationError } from "../../../application/services/invitations";
import type { Opening } from "../../../application/services/owned-store";
import type { SqlConnection, Row } from "../database/driver";
import { readSystem } from "../owned/system-repository";
import { LEASE_MS, normalizeAlias } from "../../../domain/invitations/invitation";
import { canonicalUuid, secretSchema } from "../../../shared/contracts/invitations";
const integer = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const openingSchema = z.object({ id: canonicalUuid, gameId: canonicalUuid, generation: integer, state: z.enum(["open", "closed"]), hostAccountId: z.string().min(1).max(128), hostSessionId: z.string().min(1).max(128), createdAt: z.iso.datetime(), closedAt: z.iso.datetime().nullable(), lastHeartbeatAt: z.iso.datetime(), leaseExpiresAt: z.iso.datetime(), revision: integer }).strict();
export const openingColumns = 'id,game_id AS "gameId",generation,state,host_account_id AS "hostAccountId",host_session_id AS "hostSessionId",created_at AS "createdAt",closed_at AS "closedAt",last_heartbeat_at AS "lastHeartbeatAt",lease_expires_at AS "leaseExpiresAt",revision';
export function parse<T>(schema: z.ZodType<T>, value: unknown): T { const result = schema.safeParse(value); if (!result.success) throw new InvitationError("UNAVAILABLE"); return result.data; }
export async function latest(c: SqlConnection, gameId: string): Promise<Opening | null> { const row = (await c.query(`SELECT ${openingColumns} FROM game_openings WHERE game_id=$1 ORDER BY generation DESC LIMIT 1`, [gameId])).rows[0]; if (!row) return null;
  const value = parse(openingSchema, row);
  if (Date.parse(value.leaseExpiresAt) - Date.parse(value.lastHeartbeatAt) !== LEASE_MS || value.lastHeartbeatAt < value.createdAt || (value.state === "open") !== (value.closedAt === null)) throw new InvitationError("UNAVAILABLE");
  return value; }
export const invitationSchema = z.object({ opening_id: canonicalUuid, game_id: canonicalUuid, generation: integer, version: integer, secret_hash: z.string().regex(/^[a-f0-9]{64}$/), created_at: z.iso.datetime(), expires_at: z.iso.datetime() }).strict();
export async function invitation(c: SqlConnection, gameId: string, openingId: string) { const row = (await c.query("SELECT * FROM game_invitations WHERE game_id=$1 AND opening_id=$2", [gameId, openingId])).rows[0]; return row ? parse(invitationSchema, row) : null; }
export const metadata = (row: z.infer<typeof invitationSchema>) => ({ version: row.version, createdAt: row.created_at, expiresAt: row.expires_at });
export const generateSecret = () => randomBytes(32).toString("base64url");
export const digest = (domain: string, secret: string) => createHash("sha256").update(domain + "\0" + secret).digest("hex");
export const invitationDigest = (game: string, opening: string, version: number, secret: string) => digest(`invitation:${game}:${opening}:${version}`, secret);
export const tokenDigest = (game: string, token: string) => digest(`guest:${game}`, token);
export function matches(actual: string, expected: string): boolean { return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex")); }
export function alias(value: string): string { try { return normalizeAlias(value); } catch { throw new InvitationError("INVALID_INPUT"); } }
export function validToken(value: string | null): value is string { return secretSchema.safeParse(value).success; }
export async function sponsor(c: SqlConnection, opening: Opening, now: Date): Promise<boolean> {
  const row = (await c.query('SELECT s."expiresAt" AS expires,u.enabled,u.role,u."mustChangePassword" AS pending FROM identity_session s JOIN identity_user u ON u.id=s."userId" WHERE s.id=$1 AND u.id=$2', [opening.hostSessionId, opening.hostAccountId])).rows[0];
  return !!row && bool(row.enabled) && row.role === "dm" && !bool(row.pending) && new Date(row.expires as string | Date).getTime() > now.getTime();
}
export function bool(value: unknown): boolean { if (value === true || value === 1) return true; if (value === false || value === 0) return false; throw new InvitationError("UNAVAILABLE"); }
export async function gameContext(c: SqlConnection, opening: Opening, now: Date, code: "INVITATION_UNAVAILABLE" | "GUEST_UNAUTHORIZED") {
  if (opening.state !== "open" || now.toISOString() >= opening.leaseExpiresAt) throw new InvitationError(code);
  const game = (await c.query('SELECT g.*,u.enabled,u.role,u."mustChangePassword" AS pending FROM ttrpg_games g JOIN identity_user u ON u.id=g.owner_id WHERE g.id=$1', [opening.gameId])).rows[0];
  if (!game || game.state !== "ready" || game.deleted_at !== null || !bool(game.enabled) || game.role !== "dm" || bool(game.pending) || game.owner_id !== opening.hostAccountId) throw new InvitationError(code);
  const row = (await c.query("SELECT * FROM system_versions WHERE system_id=$1 AND version=$2", [String(game.system_id), Number(game.system_version)])).rows[0];
  if (!row) throw new InvitationError("UNAVAILABLE");
  const system = readSystem(row); if (system.state !== "published") throw new InvitationError("UNAVAILABLE");
  return { systemId: system.systemId, version: system.version };
}
export function readParticipant(row: Row) {
  const value = parse(z.object({ id: canonicalUuid, game_id: canonicalUuid, opening_id: canonicalUuid, generation: integer, alias: z.string(), discriminator: integer.max(1000), state: z.enum(["admitted", "left", "revoked"]), created_at: z.iso.datetime(), left_at: z.iso.datetime().nullable() }).strict(), row);
  try { if (normalizeAlias(value.alias) !== value.alias) throw new Error(); } catch { throw new InvitationError("UNAVAILABLE"); } return value;
}
