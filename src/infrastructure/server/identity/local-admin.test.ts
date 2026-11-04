import { randomBytes } from "node:crypto";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { IdentityService } from "../../../application/services/identity";
import { applyMigrations, migrations } from "../database/migrations";
import { createDriver } from "../database/driver";
import { openIdentity } from "./index";
import { passwordCodec } from "./password";

it("migra una base con administrador, permite varios y conserva credenciales y sesiones", async () => {
  const dataDir = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-local-admin-")));
  const config = { driver: "sqlite", deployment: "local", dataDir } as const;
  const password = "Prueba1234";
  let service: IdentityService | undefined;
  try {
    const driver = createDriver(config);
    try {
      await applyMigrations(driver, migrations.slice(0, 6));
      const c = await driver.acquire();
      const now = new Date().toISOString();
      try {
        await c.query('INSERT INTO identity_user(id,name,email,"emailVerified","createdAt","updatedAt",role,enabled,"mustChangePassword","authVersion") VALUES($1,$2,$3,0,$4,$5,$6,1,0,0)', ["old-admin", "Anterior", "old@example.test", now, now, "admin"]);
        await c.query('INSERT INTO identity_account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,$3,$4,$5,$6,$7)', ["old-credential", "old-admin", "credential", "old-admin", await passwordCodec.hash(password), now, now]);
      } finally { c.release(); }
      expect(await applyMigrations(driver)).toEqual([7]);
      expect(await applyMigrations(driver)).toEqual([]);
    } finally { await driver.close(); }
    service = await openIdentity(config, { secret: randomBytes(32).toString("base64url"), publicOrigin: "http://localhost:8787" });
    const original = await service.login("old@example.test", password, "local-test");
    const cookie = original.cookie.split(";")[0];
    const added = await Promise.all(["second", "third"].map(name => service!.createAdminLocal({ name, email: name + "@example.test", password })));
    for (const account of added) {
      expect(account).toMatchObject({ role: "admin", enabled: true, mustChangePassword: true });
      const login = await service.login(account.email, password, "new-admin");
      await expect(service.createDm(login.cookie.split(";")[0], { email: "dm@example.test", name: "DM", password })).rejects.toMatchObject({ code: "PASSWORD_CHANGE_REQUIRED" });
    }
    await expect(service.createAdminLocal({ email: " OLD@EXAMPLE.TEST ", name: "Duplicado", password })).rejects.toMatchObject({ code: "CONFLICT" });
    expect((await service.session(cookie)).account).toMatchObject({ id: "old-admin", name: "Anterior", mustChangePassword: false });
    await service.createDm(cookie, { email: "dm@example.test", name: "DM", password });
    await expect(service.createAdminLocal({ email: "dm@example.test", name: "No promover", password })).rejects.toMatchObject({ code: "CONFLICT" });
    const race = await Promise.allSettled([1, 2].map(() => service!.createAdminLocal({ email: "race@example.test", name: "Carrera", password }, { mustChangePassword: false })));
    expect(race.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(race.filter(result => result.status === "rejected")).toMatchObject([{ reason: { code: "CONFLICT" } }]);
    const manual = await service.login("race@example.test", password, "manual");
    expect(manual.identity.account.mustChangePassword).toBe(false);
    expect((await service.listDms(manual.cookie.split(";")[0], 10, 0)).total).toBe(1);
    await service.close(); service = undefined;
    const inspect = createDriver(config);
    try {
      const c = await inspect.acquire();
      try {
        expect((await c.query("SELECT COUNT(*) AS n FROM identity_user WHERE role='admin'")).rows[0].n).toBe(4);
        expect((await c.query("SELECT role FROM identity_user WHERE email='dm@example.test'")).rows[0].role).toBe("dm");
        expect((await c.query("SELECT COUNT(*) AS n FROM identity_audit WHERE action='create-admin-local'")).rows[0].n).toBe(3);
        expect((await c.query('SELECT password FROM identity_account WHERE "userId"=$1', ["old-admin"])).rows[0].password).not.toBe(password);
      } finally { c.release(); }
    } finally { await inspect.close(); }
  } finally { await service?.close(); rmSync(dataDir, { recursive: true, force: true }); }
}, 15000);
