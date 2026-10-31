import { expect, it } from "vitest";
import { readDatabaseConfig } from "./config";
import { readConfig } from "../../../server/config";
import { createApi } from "../../../server/http";

it("defaults explícitos locales y selección independiente de NODE_ENV", () => {
  expect(readDatabaseConfig({ TTRPG_DATA_DIR: "/tmp/example", NODE_ENV: "production" })).toEqual({ driver: "sqlite", deployment: "local", dataDir: "/tmp/example" });
  expect(readDatabaseConfig({ TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://user:pass@localhost/db", TTRPG_DB_TLS: "disable" })).toMatchObject({ driver: "postgres", deployment: "local", tls: "disable" });
});
it.each([
  { TTRPG_DEPLOYMENT: "" }, { TTRPG_DEPLOYMENT: "prod" }, { TTRPG_DB_DRIVER: "" }, { TTRPG_DB_DRIVER: "other" },
  { TTRPG_DEPLOYMENT: "production" }, { TTRPG_DATABASE_URL: "postgres://user@localhost/db" }, { TTRPG_DB_TLS: "disable" },
  { TTRPG_DB_DRIVER: "postgres" },
  { TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u@host:0/db" },
  { TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u@host/db?sslmode=disable" },
  { TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u@host/db#x" },
  { TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://host/db" },
  { TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u@host/db", TTRPG_DB_TLS: "disable" },
  { TTRPG_DEPLOYMENT: "production", TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u@localhost/db", TTRPG_DB_TLS: "disable" },
  { TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u@localhost/db", TTRPG_DB_CA_FILE: "relative" },
  { TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u@localhost/db", TTRPG_DB_TLS: "disable", TTRPG_DB_CA_FILE: "/tmp/ca" }
])("rechaza configuración inválida sin divulgar valores: %#", fields => {
  expect(() => readDatabaseConfig({ TTRPG_DATA_DIR: "/tmp/example", ...fields })).toThrow(/TTRPG_/);
});
it("guard antes de claves/rutas legacy y también en composición directa", () => {
  expect(() => readConfig({ TTRPG_DB_DRIVER: "postgres", TTRPG_DATABASE_URL: "postgres://u:secret@localhost/db" })).toThrow(/Falta migrar/);
  expect(() => createApi({ host: "127.0.0.1", port: 0, dataDir: "/no-crear", publicOrigin: "", dmKey: "", playerKey: "", database: { deployment: "production", driver: "postgres", url: "postgres://u@localhost/db", tls: "verify-full" } }, { version: "test" })).toThrow(/Falta migrar/);
});
