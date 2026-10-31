import { afterEach, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { fixture, cleanup, secret, http } from "./fixtures";
import { postgresPool } from "../database/driver";
import type { DatabaseConfig } from "../database/config";
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
async function child(database: DatabaseConfig) {
  const process = spawn(globalThis.process.execPath, ["src/infrastructure/server/moderation/test-fixtures/runtime-child.mjs"], { stdio: ["pipe", "pipe", "pipe"] });
  const exited = new Promise<void>(resolve => process.on("exit", () => resolve()));
  cleanup.push(async () => { if (process.exitCode === null && process.signalCode === null) { process.stdin.end("close\n"); await exited; } });
  const ready = new Promise<{ ready?: boolean; unavailable?: boolean; port: number }>((resolve, reject) => {
    let buffer = ""; process.stdout.on("data", data => { buffer += data; const end = buffer.indexOf("\n"); if (end >= 0) resolve(JSON.parse(buffer.slice(0, end))); }); process.on("error", reject);
    process.on("exit", () => { if (!buffer) reject(new Error("Subproceso sin resultado")); });
  });
  process.stdin.write(JSON.stringify({ database, secret }) + "\n"); return { process, ready: await ready, exited };
}
for (const kind of ["sqlite", "postgres"] as const) it(`exclusión de procesos compilados, cierre limpio y caída abrupta ${kind}`, async () => {
  const config = await fixture(kind), first = await child(config); expect(first.ready.ready).toBe(true);
  const blocked = await child(config); expect(blocked.ready.unavailable).toBe(true); await blocked.exited;
  first.process.stdin.end("close\n"); await first.exited;
  const second = await child(config); expect(second.ready.ready).toBe(true); second.process.kill("SIGKILL"); await second.exited;
  if (config.driver === "sqlite") {
    const stale = await child(config); expect(stale.ready.unavailable).toBe(true); await stale.exited;
    // Reparación del operador en fixture propia, solo tras waitpid confirmado; nunca por antigüedad.
    await unlink(join(config.dataDir, "control.lock"));
  }
  const recovered = await child(config); expect(recovered.ready.ready).toBe(true);
});
it("pérdida del canal PG detiene al emisor anterior y permite dueño nuevo", async () => {
  const config = await fixture("postgres"); if (config.driver !== "postgres") throw new Error();
  const first = await child(config); const pool = postgresPool(config);
  try { const result = await pool.query("SELECT pg_terminate_backend(pid) AS stopped FROM pg_locks WHERE locktype='advisory' AND classid=0 AND objid=783496103 AND objsubid=1 AND granted"); expect(result.rows).toEqual([{ stopped: true }]); } finally { await pool.end(); }
  expect((await http(first.ready.port, "/api/v1/dm/games", "")).status).toBe(503);
  const next = await child(config); expect(next.ready.ready).toBe(true);
  expect((await http(first.ready.port, "/api/v1/dm/games", "")).status).toBe(503);
});
