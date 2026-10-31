import { afterEach, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseEnv } from "node:util";

const folders: string[] = [];
afterEach(() => folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true })));
function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-env-")));
  folders.push(root);
  mkdirSync(join(root, "scripts"));
  copyFileSync(resolve("scripts/setup-env.sh"), join(root, "scripts/setup-env.sh"));
  writeFileSync(join(root, "package.json"), '{"private":true}');
  const data = join(root, "datos privados");
  const run = () => spawnSync("bash", ["scripts/setup-env.sh"], {
    cwd: root, encoding: "utf8", env: { ...process.env, TTRPG_DATA_DIR: data }
  });
  return { root, data, run };
}

it("prepara claves persistentes y permisos privados sin sobrescribir configuraciones", () => {
  const { root, data, run } = fixture();
  const result = run();
  expect(result.status, result.stderr).toBe(0);
  const original = readFileSync(join(root, ".env"), "utf8");
  const api = parseEnv(original);
  expect(api.TTRPG_DATA_DIR).toBe(data);
  expect(api.TTRPG_AUTH_SECRET).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(api.TTRPG_DM_KEY).toBeUndefined();expect(api.TTRPG_PLAYER_KEY).toBeUndefined();
  expect(result.stdout).not.toContain(api.TTRPG_AUTH_SECRET);
  expect(result.stdout).toContain("No se crearon cuentas");
  expect(result.stdout).toContain("pnpm start:api");
  for(const directory of [".local",".local/service/data",".local/service/logs",".local/service/backups"])expect(statSync(join(root,directory)).mode&0o777).toBe(0o700);
  const custom = original.replace("TTRPG_PORT=8787", "TTRPG_PORT=8989");
  writeFileSync(join(root, ".env"), custom);
  writeFileSync(join(root, ".env.electron"), "TTRPG_ELECTRON_MODE=local\n");
  expect(run().status).toBe(0);
  expect(readFileSync(join(root, ".env"), "utf8")).toBe(custom);
  expect(readFileSync(join(root, ".env.electron"), "utf8")).toBe("TTRPG_ELECTRON_MODE=local\n");
  expect(statSync(join(root, ".env")).mode & 0o777).toBe(0o600);
  expect(statSync(join(root, ".env.electron")).mode & 0o777).toBe(0o600);
  expect(statSync(data).mode & 0o777).toBe(0o700);
});

it("carga el archivo del cliente sin secretos API y respeta variables explícitas del proceso", () => {
  const { root, run } = fixture();
  expect(run().status).toBe(0);
  const env: NodeJS.ProcessEnv = { ...process.env, TTRPG_ELECTRON_MODE: "local" };
  delete env.TTRPG_DM_KEY; delete env.TTRPG_PLAYER_KEY; delete env.TTRPG_SERVICE_URL;
  const result = spawnSync(process.execPath, ["--env-file=.env.electron", "-e",
    'console.log(JSON.stringify({mode:process.env.TTRPG_ELECTRON_MODE,url:process.env.TTRPG_SERVICE_URL,dm:process.env.TTRPG_DM_KEY,player:process.env.TTRPG_PLAYER_KEY}))'],
  { cwd: root, env, encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({ mode: "local", url: "http://127.0.0.1:8787" });
});

it("rechaza enlaces simbólicos de configuración sin modificar el destino", () => {
  const { root, run } = fixture();
  const target = join(root, "ajeno");
  writeFileSync(target, "contenido existente");
  symlinkSync(target, join(root, ".env"));
  expect(run().status).not.toBe(0);
  expect(readFileSync(target, "utf8")).toBe("contenido existente");
});

it("configuración PostgreSQL existente no crea directorio SQLite ni cambia URL privada", () => {
  const { root, data, run } = fixture();
  const configuration = "TTRPG_DEPLOYMENT=production\nTTRPG_DB_DRIVER=postgres\nTTRPG_DATABASE_URL=postgresql://user:synthetic-secret@localhost/test\n";
  writeFileSync(join(root, ".env"), configuration, { mode: 0o600 });
  const result = run(); expect(result.status).toBe(1);
  expect(readFileSync(join(root, ".env"), "utf8")).toBe(configuration);
  expect(() => statSync(data)).toThrow();
  expect(result.stdout + result.stderr).not.toContain("synthetic-secret");
  expect(result.stderr).toContain("Configuración anterior incompleta");
  expect(result.stdout).not.toMatch(/start:api|start:service|claves de acceso/);
  expect(readFileSync(join(root, ".env.electron"), "utf8")).not.toContain("DATABASE");
});
