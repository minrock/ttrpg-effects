import { afterEach, expect, it } from "vitest";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { cleanup, fixture } from "./fixtures";
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) it(`artefacto compilado009 y pnpm db:migrate ${kind}`, async () => {
  const config = await fixture(kind, 4);
  const env = { ...process.env, TTRPG_DB_DRIVER: config.driver, TTRPG_DEPLOYMENT: config.deployment, ...(config.driver === "sqlite" ? { TTRPG_DATA_DIR: config.dataDir } : { TTRPG_DATABASE_URL: config.url, TTRPG_DB_CA_FILE: config.caFile }) };
  const migration = await promisify(execFile)("pnpm", ["db:migrate"], { env }); expect(migration.stdout).toContain("migraciones 5 aplicadas");
  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["src/infrastructure/server/invitations/test-fixtures/compiled-smoke.mjs"], { stdio: ["pipe", "pipe", "pipe"] }); let stdout = "", stderr = "";
    child.stdout.on("data", value => stdout += value); child.stderr.on("data", value => stderr += value); child.on("error", reject); child.on("exit", code => resolve({ code, stdout, stderr })); child.stdin.end(JSON.stringify(config));
  });
  expect(result.code, result.stderr).toBe(0); expect(result.stdout).toContain("API compilada009: emitir/canjear/rotar/viejo/nuevo/sesión/cierre PASS");
  const invalidate = await promisify(execFile)("pnpm", ["invitations:invalidate"], { env }); expect(invalidate.stdout).toContain("Acceso invitado invalidado");
});
