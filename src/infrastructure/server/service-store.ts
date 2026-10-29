import { closeSync, constants, existsSync, lstatSync, mkdirSync, openSync, realpathSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { MonsterTemplateRepository } from "../../application/services/monster-template-repository";
import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";
import type { SceneSummary } from "../../shared/contracts/http-api";
import { SqliteMonsterLibraryRepository } from "../database/sqlite-monster-library-repository";
import { SqliteEntityLibraryRepository } from "../database/sqlite-entity-library-repository";

import { readStoredScene, readStoredTemplate, readSummary, type StoredScene } from "./persisted-records";
interface JsonRow { id: string; body: string }
export class ServiceStore implements MonsterTemplateRepository {
  readonly monsters: SqliteMonsterLibraryRepository;
  readonly entities: SqliteEntityLibraryRepository;
  private readonly db: DatabaseSync;
  private readonly lockPath: string;
  private readonly lockFd: number;
  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    if (lstatSync(dataDir).isSymbolicLink()) throw new Error("El directorio de datos no puede ser un enlace simbólico.");
    const root = realpathSync(dataDir);
    // Rechazar también ancestros enlazados; el operador debe indicar la ruta física.
    if (root !== resolve(dataDir)) throw new Error("TTRPG_DATA_DIR debe usar la ruta física, sin enlaces simbólicos.");
    this.lockPath = join(root, "service.lock");
    this.lockFd = openSync(this.lockPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    const opened: Array<{ close(): void }> = [];
    try {
      for (const name of ["service.sqlite", "monsters.sqlite", "entities.sqlite"]) {
        for (const suffix of ["", "-wal", "-shm", "-journal"]) {
          const file = join(root, name + suffix);
          if (existsSync(file) || (() => { try { return lstatSync(file).isSymbolicLink(); } catch { return false; } })()) {
            const stat = lstatSync(file);
            if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error("El almacenamiento contiene un archivo no seguro.");
          }
        }
      }
      this.db = new DatabaseSync(join(root, "service.sqlite")); opened.push(this.db);
      this.db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL");
      const version = (this.db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
      if (version > 1) throw new Error("Versión de almacenamiento no compatible.");
      if (version === 0) this.db.exec(`BEGIN;
        CREATE TABLE scenes(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, body TEXT NOT NULL);
        CREATE TABLE assets(id TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes BLOB NOT NULL);
        CREATE TABLE templates(id TEXT PRIMARY KEY, body TEXT NOT NULL);
        PRAGMA user_version=1; COMMIT;`);
      this.monsters = new SqliteMonsterLibraryRepository(join(root, "monsters.sqlite")); opened.push(this.monsters);
      this.entities = new SqliteEntityLibraryRepository(join(root, "entities.sqlite")); opened.push(this.entities);
    } catch (error) {
      for (const item of opened.reverse()) item.close();
      closeSync(this.lockFd); unlinkSync(this.lockPath); throw error;
    }
  }
  close(): void {
    this.monsters.close(); this.entities.close(); this.db.close(); closeSync(this.lockFd); unlinkSync(this.lockPath);
  }
  getScene(id: string): StoredScene | null {
    const row = this.db.prepare("SELECT id,name,created_at AS createdAt,updated_at AS updatedAt,body FROM scenes WHERE id=?").get(id);
    if (!row) return null;
    const { body, ...metadata } = row;
    if (typeof body !== "string") throw new Error("Registro inválido.");
    return readStoredScene(body, metadata);
  }
  listScenes(limit: number, offset: number): { scenes: SceneSummary[]; total: number } {
    const rows = this.db.prepare("SELECT id,name,created_at AS createdAt,updated_at AS updatedAt FROM scenes ORDER BY updated_at DESC, id ASC LIMIT ? OFFSET ?").all(limit, offset) as unknown as SceneSummary[];
    return { scenes: rows.map(readSummary), total: (this.db.prepare("SELECT count(*) AS total FROM scenes").get() as { total: number }).total };
  }
  saveScene(scene: StoredScene): void {
    this.db.prepare("INSERT INTO scenes(id,name,created_at,updated_at,body) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at,body=excluded.body").run(scene.id, scene.name, scene.createdAt, scene.updatedAt, JSON.stringify(scene));
  }
  transaction<T>(work: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try { const value = work(); this.db.exec("COMMIT"); return value; }
    catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  deleteScene(id: string): boolean { return this.db.prepare("DELETE FROM scenes WHERE id=?").run(id).changes > 0; }
  saveAsset(id: string, mime: string, bytes: Buffer): void { this.db.prepare("INSERT INTO assets(id,mime,bytes) VALUES(?,?,?)").run(id, mime, bytes); }
  hasAsset(id: string): boolean { return !!this.db.prepare("SELECT id FROM assets WHERE id=?").get(id); }
  getAsset(id: string): { mime: string; bytes: Uint8Array } | undefined {
    return this.db.prepare("SELECT mime,bytes FROM assets WHERE id=?").get(id) as { mime: string; bytes: Uint8Array } | undefined;
  }
  async listUserTemplates(): Promise<readonly MonsterTemplate[]> {
    return (this.db.prepare("SELECT id,body FROM templates ORDER BY id").all() as unknown as JsonRow[]).map((row) => readStoredTemplate(row.body, row.id));
  }
  async saveUserTemplate(template: MonsterTemplate): Promise<readonly MonsterTemplate[]> {
    await this.listUserTemplates();
    readStoredTemplate(JSON.stringify(template), template.id);
    this.db.prepare("INSERT INTO templates(id,body) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body").run(template.id, JSON.stringify(template));
    return this.listUserTemplates();
  }
  async deleteUserTemplate(id: string): Promise<readonly MonsterTemplate[]> { await this.listUserTemplates(); this.db.prepare("DELETE FROM templates WHERE id=?").run(id); return this.listUserTemplates(); }
}
