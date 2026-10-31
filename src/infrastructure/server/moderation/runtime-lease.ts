import { postgresPool } from "../database/driver";
import type { DatabaseConfig } from "../database/config";
import { InvitationError } from "../../../application/services/invitations";
export interface RuntimeLease { check(): Promise<void>; assert(): void; onLost(action: () => void): void; close(): Promise<void> }
const sqliteOwners = new Set<string>();
/** Lock de sesión dedicado; jamás se devuelve al pool mientras exista un emisor. */
export async function runtimeLease(config: DatabaseConfig): Promise<RuntimeLease> {
  let live = true; const listeners = new Set<() => void>();
  const fail = () => { if (!live) return; live = false; for (const listener of listeners) listener(); };
  const assert = () => { if (!live) throw new InvitationError("UNAVAILABLE"); };
  if (config.driver === "sqlite") {
    if (sqliteOwners.has(config.dataDir)) throw new InvitationError("UNAVAILABLE");
    sqliteOwners.add(config.dataDir);
    return { assert, async check() { assert(); }, onLost: action => { listeners.add(action); }, async close() { if (!live) return; fail(); sqliteOwners.delete(config.dataDir); } };
  }
  const pool = postgresPool(config); const client = await pool.connect().catch(async () => { await pool.end(); throw new InvitationError("UNAVAILABLE"); });
  client.on("error", fail); client.on("end", fail);
  try { if (!(await client.query("SELECT pg_try_advisory_lock(783496103) AS owned")).rows[0].owned) throw new Error(); }
  catch { client.release(true); await pool.end(); throw new InvitationError("UNAVAILABLE"); }
  let closed = false, checking: Promise<void> | undefined;
  return {
    assert, onLost(action) { listeners.add(action); },
    async check() { assert(); if (checking) return checking; checking = (async () => { try { const result = await client.query("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=pg_backend_pid() AND locktype='advisory' AND classid=0 AND objid=783496103 AND objsubid=1 AND granted) AS owned"); if (!result.rows[0].owned) throw new Error(); assert(); } catch { fail(); throw new InvitationError("UNAVAILABLE"); } })().finally(() => { checking = undefined; }); return checking; },
    async close() { if (closed) return; closed = true; fail(); client.release(true); await pool.end(); }
  };
}
