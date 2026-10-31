import type { DatabaseConfig } from "../database/config";
import { identityDatabase } from "../identity/database";
/** Operación explícita offline: nunca se ejecuta automáticamente al reiniciar. */
export async function invalidateRestoredAccess(config: DatabaseConfig): Promise<void> {
  const unit = await identityDatabase(config);
  try { await unit.transaction(async c => {
    const now = new Date().toISOString();
    await c.query("UPDATE game_openings SET state='closed',closed_at=$1,revision=revision+1 WHERE state='open'", [now]);
    await c.query("UPDATE guest_credentials SET revoked_at=$1 WHERE revoked_at IS NULL", [now]);
    await c.query("UPDATE guest_participants SET state='revoked' WHERE state='admitted'");
  }); } finally { await unit.close(); }
}
