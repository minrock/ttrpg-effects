import { afterEach, expect, it } from "vitest";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { fixture, cleanup, snapshot, png } from "./fixtures";
import { defaultDiceDraft } from "../../../domain/dice/dice";
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) it(`humo HTTP/SSE del artefacto compilado010 y migración5→6 ${kind}`, async () => {
  const config = await fixture(kind, 5), env = { ...process.env, TTRPG_DB_DRIVER: config.driver, TTRPG_DEPLOYMENT: config.deployment, ...(config.driver === "sqlite" ? { TTRPG_DATA_DIR: config.dataDir } : { TTRPG_DATABASE_URL: config.url, TTRPG_DB_CA_FILE: config.caFile }) };
  expect((await promisify(execFile)("pnpm", ["db:migrate"], { env })).stdout).toContain("migraciones 6 aplicadas");
  const asset = randomUUID();
  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ["src/infrastructure/server/moderation/test-fixtures/compiled-smoke.mjs"], { stdio: ["pipe", "pipe", "pipe"] }); let stdout = "", stderr = "";
    child.stdout.on("data", value => stdout += value); child.stderr.on("data", value => stderr += value); child.on("error", reject); child.on("exit", code => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify({ config, asset, snapshot: snapshot(asset), png: png.toString("base64"), draft: { ...defaultDiceDraft(), visibility: "open", groups: [{ id: "f", damageType: "fire", dice: { d6: 1 } }] }, simulation: { values: [{ id: "f:d6:0", value: 4 }], replay: { frameCount: 2, stepMs: 1000 / 30, durationMs: 1000 / 30, frames: [0, 0, 1, 0, 0, 0, 1, 0, 0, .5, 0, 0, 0, 1] } } }));
  });
  expect(result.code, result.stderr).toBe(0); expect(result.stdout).toContain("API compilada010: mapa/dado/SSE/kick/401/supervivientes/enlaces/restart PASS");
});
