import { seedSystems } from "../owned/system-data";
import { backfillCampaignHierarchy } from "../owned/campaign-backfill";
import { backfillArcPreparations } from "../owned/arc-preparation-backfill";
import { createHash } from "node:crypto";
import { CatalogError } from "../../../application/services/game-catalog";
import type { SqlConnection, SqlDriver } from "./driver";

export interface Migration { readonly version: number; readonly name: string; readonly statements: readonly string[] }
export const migrations: readonly Migration[] = [{ version: 1, name: "catalogo-partidas", statements: [
  `CREATE TABLE ttrpg_games (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL CHECK(length(owner_id) BETWEEN 1 AND 128),
    name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
    state TEXT NOT NULL CHECK(state IN ('ready','archived')),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL CHECK(updated_at >= created_at)
  )`,
  "CREATE INDEX ttrpg_games_owner_updated ON ttrpg_games(owner_id,updated_at DESC,id ASC)"
] }, { version: 2, name: "identidad-better-auth-1.7.14", statements: [
  `CREATE TABLE identity_user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, "emailVerified" __BOOL__ NOT NULL, image TEXT, "createdAt" __TIME__ NOT NULL, "updatedAt" __TIME__ NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','dm')), enabled __BOOL__ NOT NULL, "mustChangePassword" __BOOL__ NOT NULL, "authVersion" INTEGER NOT NULL CHECK("authVersion">=0))`,
  `CREATE UNIQUE INDEX identity_one_admin ON identity_user(role) WHERE role='admin'`,
  `CREATE TABLE identity_account (id TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "providerId" TEXT NOT NULL, "userId" TEXT NOT NULL REFERENCES identity_user(id) ON DELETE CASCADE,
    "accessToken" TEXT, "refreshToken" TEXT, "idToken" TEXT, "accessTokenExpiresAt" __TIME__, "refreshTokenExpiresAt" __TIME__, scope TEXT, password TEXT,
    "createdAt" __TIME__ NOT NULL, "updatedAt" __TIME__ NOT NULL, UNIQUE("providerId","accountId"))`,
  `CREATE INDEX identity_account_user ON identity_account("userId")`,
  `CREATE TABLE identity_session (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, "userId" TEXT NOT NULL REFERENCES identity_user(id) ON DELETE CASCADE,
    "expiresAt" __TIME__ NOT NULL, "createdAt" __TIME__ NOT NULL, "updatedAt" __TIME__ NOT NULL, "ipAddress" TEXT, "userAgent" TEXT)`,
  `CREATE INDEX identity_session_user ON identity_session("userId")`,
  `CREATE TABLE identity_verification (id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL, "expiresAt" __TIME__ NOT NULL, "createdAt" __TIME__ NOT NULL, "updatedAt" __TIME__ NOT NULL)`,
  `CREATE INDEX identity_verification_identifier ON identity_verification(identifier)`,
  `CREATE TABLE identity_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE identity_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, target TEXT NOT NULL, action TEXT NOT NULL, at TEXT NOT NULL, result TEXT NOT NULL CHECK(result='success'))`
] }, { version: 3, name: "propiedad-recursos-aperturas", statements: [
  "ALTER TABLE ttrpg_games ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1)",
  "ALTER TABLE ttrpg_games ADD COLUMN deleted_at TEXT",
  `CREATE TABLE owned_resources (owner_id TEXT NOT NULL REFERENCES identity_user(id), kind TEXT NOT NULL CHECK(kind IN ('scenes','templates','monsters','npcs','player-characters')), id TEXT NOT NULL,
    name TEXT NOT NULL, search_text TEXT NOT NULL, sort_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=1), body TEXT NOT NULL,
    PRIMARY KEY(owner_id,kind,id))`,
  "CREATE INDEX owned_resources_page ON owned_resources(owner_id,kind,updated_at DESC,sort_id ASC)",
  `CREATE TABLE owned_assets (owner_id TEXT NOT NULL REFERENCES identity_user(id), id TEXT NOT NULL, mime TEXT NOT NULL CHECK(mime IN ('image/png','image/jpeg','image/webp')), bytes __BLOB__ NOT NULL, sha256 TEXT NOT NULL CHECK(length(sha256)=64), byte_length INTEGER NOT NULL CHECK(byte_length BETWEEN 1 AND 20971520), PRIMARY KEY(owner_id,id))`,
  "CREATE UNIQUE INDEX ttrpg_games_owner_id ON ttrpg_games(id,owner_id)",
  `CREATE TABLE game_openings (id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES ttrpg_games(id), generation INTEGER NOT NULL CHECK(generation>=1), state TEXT NOT NULL CHECK(state IN ('open','closed')),
    host_account_id TEXT NOT NULL REFERENCES identity_user(id), host_session_id TEXT NOT NULL, created_at TEXT NOT NULL, closed_at TEXT, last_heartbeat_at TEXT NOT NULL, lease_expires_at TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK(revision>=1), UNIQUE(game_id,generation), FOREIGN KEY(game_id,host_account_id) REFERENCES ttrpg_games(id,owner_id))`,
  "CREATE UNIQUE INDEX game_one_opening ON game_openings(game_id) WHERE state='open'",
  `CREATE TABLE owned_operations (owner_id TEXT NOT NULL REFERENCES identity_user(id), operation_id TEXT NOT NULL, context TEXT NOT NULL, fingerprint TEXT NOT NULL, result TEXT NOT NULL, expires_at TEXT NOT NULL, result_bytes INTEGER NOT NULL CHECK(result_bytes>=0), PRIMARY KEY(owner_id,context,operation_id))`,
  "CREATE TABLE owned_imports (fingerprint TEXT PRIMARY KEY, result TEXT NOT NULL, created_at TEXT NOT NULL)"
] }, { version: 4, name: "sistemas-versiones-retenidas", statements: [
  "CREATE TABLE system_catalog (system_id TEXT PRIMARY KEY, name TEXT NOT NULL)",
  "CREATE TABLE system_versions (system_id TEXT NOT NULL REFERENCES system_catalog(system_id), version INTEGER NOT NULL CHECK(version>=1), state TEXT NOT NULL CHECK(state IN ('draft','published')), created_at TEXT NOT NULL, published_at TEXT, revision INTEGER NOT NULL CHECK(revision>=1), availability TEXT NOT NULL CHECK(availability IN ('enabled','disabled')), definition TEXT NOT NULL, hash TEXT NOT NULL, templates TEXT NOT NULL, PRIMARY KEY(system_id,version))",
  "ALTER TABLE ttrpg_games ADD COLUMN system_id TEXT NOT NULL DEFAULT 'generic'",
  "ALTER TABLE ttrpg_games ADD COLUMN system_version INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE owned_resources ADD COLUMN bindings TEXT NOT NULL DEFAULT '{\"monsters\":{}}'",
  "CREATE TABLE retained_templates (owner_id TEXT NOT NULL REFERENCES identity_user(id), id TEXT NOT NULL, version INTEGER NOT NULL CHECK(version=1), hash TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(owner_id,id,version))",
  "CREATE TABLE game_resources (owner_id TEXT NOT NULL, game_id TEXT NOT NULL, kind TEXT NOT NULL, resource_id TEXT NOT NULL, PRIMARY KEY(owner_id,game_id,kind,resource_id), FOREIGN KEY(game_id,owner_id) REFERENCES ttrpg_games(id,owner_id), FOREIGN KEY(owner_id,kind,resource_id) REFERENCES owned_resources(owner_id,kind,id) ON DELETE CASCADE)"
] }, { version: 5, name: "invitaciones-participantes", statements: [
  "CREATE UNIQUE INDEX game_opening_context ON game_openings(id,game_id,generation)",
  `CREATE TABLE game_invitations (opening_id TEXT PRIMARY KEY, game_id TEXT NOT NULL, generation INTEGER NOT NULL, version INTEGER NOT NULL CHECK(version>=1), secret_hash TEXT NOT NULL CHECK(length(secret_hash)=64), created_at TEXT NOT NULL, expires_at TEXT NOT NULL CHECK(expires_at>created_at), FOREIGN KEY(opening_id,game_id,generation) REFERENCES game_openings(id,game_id,generation))`,
  `CREATE TABLE guest_participants (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, opening_id TEXT NOT NULL, generation INTEGER NOT NULL, alias TEXT NOT NULL CHECK(length(alias) BETWEEN 1 AND 160), discriminator INTEGER NOT NULL CHECK(discriminator BETWEEN 1 AND 1000), state TEXT NOT NULL CHECK(state IN ('admitted','left','revoked')), created_at TEXT NOT NULL, left_at TEXT, UNIQUE(opening_id,discriminator), UNIQUE(id,game_id,opening_id,generation), FOREIGN KEY(opening_id,game_id,generation) REFERENCES game_openings(id,game_id,generation))`,
  `CREATE TABLE guest_credentials (token_hash TEXT PRIMARY KEY CHECK(length(token_hash)=64), participant_id TEXT NOT NULL, game_id TEXT NOT NULL, opening_id TEXT NOT NULL, generation INTEGER NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, FOREIGN KEY(participant_id,game_id,opening_id,generation) REFERENCES guest_participants(id,game_id,opening_id,generation))`,
  "CREATE INDEX guest_credentials_participant ON guest_credentials(participant_id)",
  "CREATE INDEX guest_credentials_capacity ON guest_credentials(opening_id,expires_at)",
  `CREATE TABLE guest_operations (game_id TEXT NOT NULL, opening_id TEXT NOT NULL, generation INTEGER NOT NULL, operation_id TEXT NOT NULL, fingerprint TEXT NOT NULL CHECK(length(fingerprint)=64), participant_id TEXT NOT NULL, expires_at TEXT NOT NULL, result_bytes INTEGER NOT NULL CHECK(result_bytes BETWEEN 1 AND 1048576), PRIMARY KEY(game_id,opening_id,operation_id), FOREIGN KEY(participant_id,game_id,opening_id,generation) REFERENCES guest_participants(id,game_id,opening_id,generation))`,
  `CREATE TABLE invitation_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, game_id TEXT NOT NULL, opening_id TEXT NOT NULL, action TEXT NOT NULL CHECK(action IN ('start','reopen','rotate','admit','leave','close')), at TEXT NOT NULL, result TEXT NOT NULL CHECK(result='success'))`
] }, { version: 6, name: "moderacion-participantes", statements: [
  "CREATE TABLE moderation_audit (id TEXT PRIMARY KEY, actor TEXT NOT NULL, game_id TEXT NOT NULL, opening_id TEXT NOT NULL, participant_id TEXT NOT NULL, invitation_version INTEGER NOT NULL, at TEXT NOT NULL, result TEXT NOT NULL CHECK(result='revoked'))",
  "CREATE INDEX moderation_roster ON moderation_audit(opening_id)"
] }, { version: 7, name: "multiples-administradores-locales", statements: [
  "DROP INDEX identity_one_admin"
] }, { version: 8, name: "borradores-recuperables", statements: [
  "CREATE TABLE owned_drafts (owner_id TEXT NOT NULL REFERENCES identity_user(id) ON DELETE CASCADE, id TEXT NOT NULL, game_id TEXT NOT NULL, context TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, sequence INTEGER NOT NULL DEFAULT 0, hash TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, confirmed_sequence INTEGER NOT NULL DEFAULT 0, receipt_key TEXT, receipt_hash TEXT, receipt_result TEXT, PRIMARY KEY(owner_id,id), FOREIGN KEY(game_id,owner_id) REFERENCES ttrpg_games(id,owner_id))",
  "CREATE INDEX owned_drafts_page ON owned_drafts(owner_id,updated_at DESC,id)",
  "CREATE TABLE owned_draft_versions (owner_id TEXT NOT NULL, draft_id TEXT NOT NULL, revision INTEGER NOT NULL, sequence INTEGER NOT NULL, body TEXT NOT NULL, bytes INTEGER NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(owner_id,draft_id,revision), FOREIGN KEY(owner_id,draft_id) REFERENCES owned_drafts(owner_id,id) ON DELETE CASCADE)"
] }, { version: 9, name: "campanas-arcos-escenas", statements: [
  `CREATE TABLE campaign_details (
    owner_id TEXT NOT NULL, game_id TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', cover_asset_id TEXT,
    PRIMARY KEY(owner_id,game_id),
    FOREIGN KEY(game_id,owner_id) REFERENCES ttrpg_games(id,owner_id),
    FOREIGN KEY(owner_id,cover_asset_id) REFERENCES owned_assets(owner_id,id)
  )`,
  `CREATE TABLE campaign_arcs (
    owner_id TEXT NOT NULL, id TEXT NOT NULL, campaign_id TEXT NOT NULL, name TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 200),
    description TEXT NOT NULL DEFAULT '', cover_asset_id TEXT, revision INTEGER NOT NULL CHECK(revision>=1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL CHECK(updated_at>=created_at), initial_game_id TEXT,
    PRIMARY KEY(owner_id,id), UNIQUE(owner_id,initial_game_id),
    FOREIGN KEY(owner_id,campaign_id) REFERENCES campaign_details(owner_id,game_id),
    FOREIGN KEY(owner_id,cover_asset_id) REFERENCES owned_assets(owner_id,id)
  )`,
  `CREATE TABLE arc_scenes (
    owner_id TEXT NOT NULL, arc_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind='scenes'), scene_id TEXT NOT NULL,
    PRIMARY KEY(owner_id,arc_id,scene_id),
    FOREIGN KEY(owner_id,arc_id) REFERENCES campaign_arcs(owner_id,id) ON DELETE CASCADE,
    FOREIGN KEY(owner_id,kind,scene_id) REFERENCES owned_resources(owner_id,kind,id) ON DELETE CASCADE
  )`,
  `CREATE TABLE scene_covers (
    owner_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind='scenes'), scene_id TEXT NOT NULL, custom_cover_asset_id TEXT, revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
    PRIMARY KEY(owner_id,scene_id),
    FOREIGN KEY(owner_id,kind,scene_id) REFERENCES owned_resources(owner_id,kind,id) ON DELETE CASCADE,
    FOREIGN KEY(owner_id,custom_cover_asset_id) REFERENCES owned_assets(owner_id,id)
  )`,
  "CREATE INDEX campaign_arcs_page ON campaign_arcs(owner_id,campaign_id,updated_at DESC,id ASC)",
  "CREATE INDEX arc_scenes_scene ON arc_scenes(owner_id,scene_id,arc_id)",
  "CREATE INDEX campaign_details_cover ON campaign_details(owner_id,cover_asset_id)"
] }, { version: 10, name: "preparacion-arcos", statements: [
  `CREATE TABLE arc_preparations (
    owner_id TEXT NOT NULL, id TEXT NOT NULL, arc_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('npc','monster')),
    name TEXT NOT NULL, image_path TEXT, notes TEXT NOT NULL, template_id TEXT, binding TEXT,
    source_scene_id TEXT, source_kind TEXT CHECK(source_kind IN ('npc','monster')), source_entity_id TEXT,
    revision INTEGER NOT NULL CHECK(revision>=1), created_at TEXT NOT NULL, updated_at TEXT NOT NULL CHECK(updated_at>=created_at),
    PRIMARY KEY(owner_id,id), UNIQUE(owner_id,arc_id,source_scene_id,kind,source_entity_id),
    FOREIGN KEY(owner_id,arc_id) REFERENCES campaign_arcs(owner_id,id) ON DELETE CASCADE,
    CHECK((source_scene_id IS NULL AND source_kind IS NULL AND source_entity_id IS NULL) OR (source_scene_id IS NOT NULL AND source_kind IS NOT NULL AND source_entity_id IS NOT NULL AND source_kind=kind)),
    CHECK((kind='npc' AND template_id IS NULL AND binding IS NULL) OR (kind='monster' AND binding IS NOT NULL))
  )`,
  `CREATE TABLE scene_preparation_instances (
    owner_id TEXT NOT NULL, scene_kind TEXT NOT NULL CHECK(scene_kind='scenes'), scene_id TEXT NOT NULL, prepared_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('npc','monster')), entity_id TEXT NOT NULL, snapshot TEXT NOT NULL, binding TEXT,
    PRIMARY KEY(owner_id,scene_id,prepared_id),
    FOREIGN KEY(owner_id,scene_kind,scene_id) REFERENCES owned_resources(owner_id,kind,id) ON DELETE CASCADE,
    FOREIGN KEY(owner_id,prepared_id) REFERENCES arc_preparations(owner_id,id) ON DELETE CASCADE,
    CHECK((kind='npc' AND binding IS NULL) OR (kind='monster' AND binding IS NOT NULL))
  )`,
  "CREATE INDEX arc_preparations_page ON arc_preparations(owner_id,arc_id,updated_at DESC,id ASC)",
  "CREATE INDEX scene_preparation_instances_entity ON scene_preparation_instances(owner_id,scene_id,kind,entity_id)"
] }, { version: 11, name: "borrado-logico-preparacion-arcos", statements: [
  "ALTER TABLE arc_preparations ADD COLUMN deleted_at TEXT"
] }, { version: 12, name: "escenas-propias-por-arco", statements: [
  "CREATE UNIQUE INDEX arc_scenes_owner_scene_unique ON arc_scenes(owner_id,scene_id)",
  "CREATE UNIQUE INDEX game_resources_owner_scene_unique ON game_resources(owner_id,resource_id) WHERE kind='scenes'"
] }];
function checksum(migration: Migration): string { return createHash("sha256").update(JSON.stringify(migration)).digest("hex"); }
async function tableNames(connection: SqlConnection, kind: SqlDriver["kind"]): Promise<string[]> {
  const result = await connection.query(kind === "sqlite" ?
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'" :
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE'");
  return result.rows.map(row => String(row.name));
}
export async function verifySchema(connection: SqlConnection, kind: SqlDriver["kind"], expected = migrations, allowPending = false): Promise<number> {
  const tables = await tableNames(connection, kind);
  if (tables.some(name => !["ttrpg_control_migrations", "ttrpg_games", "identity_user", "identity_account", "identity_session", "identity_verification", "identity_audit", "identity_settings", "owned_resources", "owned_assets", "game_openings", "owned_operations", "owned_imports", "system_catalog", "system_versions", "retained_templates", "game_resources", "game_invitations", "guest_participants", "guest_credentials", "guest_operations", "invitation_audit", "moderation_audit", "owned_drafts", "owned_draft_versions", "campaign_details", "campaign_arcs", "arc_scenes", "scene_covers", "arc_preparations", "scene_preparation_instances"].includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (!tables.includes("ttrpg_control_migrations")) {
    if (tables.length) throw new CatalogError("SCHEMA_INCOMPATIBLE");
    if (allowPending) return 0;
    throw new CatalogError("MIGRATION_REQUIRED");
  }
  const rows = (await connection.query("SELECT version,name,checksum FROM ttrpg_control_migrations ORDER BY version")).rows;
  for (let index = 0; index < rows.length; index++) {
    const wanted = expected[index], row = rows[index];
    if (!wanted || Number(row.version) !== wanted.version || row.name !== wanted.name || row.checksum !== checksum(wanted)) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  }
  if (rows.length && !tables.includes("ttrpg_games")) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (rows.length >= 2 && ["identity_user", "identity_account", "identity_session", "identity_verification", "identity_audit", "identity_settings"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (rows.length >= 3 && ["owned_resources", "owned_assets", "game_openings", "owned_operations", "owned_imports"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (rows.length >= 4 && ["system_catalog", "system_versions", "retained_templates", "game_resources"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (rows.length >= 5 && ["game_invitations", "guest_participants", "guest_credentials", "guest_operations", "invitation_audit"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (rows.length >= 6 && !tables.includes("moderation_audit")) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (rows.length >= 8 && ["owned_drafts", "owned_draft_versions"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (rows.length >= 9 && ["campaign_details", "campaign_arcs", "arc_scenes", "scene_covers"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (rows.length >= 10 && ["arc_preparations", "scene_preparation_instances"].some(name => !tables.includes(name))) throw new CatalogError("SCHEMA_INCOMPATIBLE");
  if (!allowPending && rows.length !== expected.length) throw new CatalogError("MIGRATION_REQUIRED");
  return rows.length;
}
// Infraestructura interna: la lista inyectable permite probar fallo DDL sin publicar migraciones falsas.
export async function applyMigrations(driver: SqlDriver, expected = migrations): Promise<number[]> {
  const connection = await driver.acquire();
  let begun = false;
  try {
    await connection.query(driver.kind === "sqlite" ? "BEGIN IMMEDIATE" : "BEGIN"); begun = true;
    if (driver.kind === "postgres") await connection.query("SELECT pg_advisory_xact_lock(783496101)");
    const applied = await verifySchema(connection, driver.kind, expected, true);
    if (!applied) await connection.query("CREATE TABLE IF NOT EXISTS ttrpg_control_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL)");
    const result: number[] = [];
    for (const migration of expected.slice(applied)) {
      // La exclusividad no admite una elección silenciosa de propietario. Esta
      // comprobación ocurre dentro de la misma transacción que los índices.
      if (migration.version === 12) {
        const sharedArc = await connection.query("SELECT scene_id FROM arc_scenes GROUP BY owner_id,scene_id HAVING COUNT(*)>1 LIMIT 1");
        const sharedCampaign = await connection.query("SELECT resource_id FROM game_resources WHERE kind='scenes' GROUP BY owner_id,resource_id HAVING COUNT(*)>1 LIMIT 1");
        const missingCampaignLink = await connection.query("SELECT s.scene_id FROM arc_scenes s JOIN campaign_arcs a ON a.owner_id=s.owner_id AND a.id=s.arc_id LEFT JOIN game_resources g ON g.owner_id=s.owner_id AND g.game_id=a.campaign_id AND g.kind='scenes' AND g.resource_id=s.scene_id WHERE g.resource_id IS NULL LIMIT 1");
        const missingArcParent = await connection.query("SELECT g.resource_id FROM game_resources g LEFT JOIN arc_scenes s ON s.owner_id=g.owner_id AND s.scene_id=g.resource_id LEFT JOIN campaign_arcs a ON a.owner_id=s.owner_id AND a.id=s.arc_id WHERE g.kind='scenes' AND (s.scene_id IS NULL OR a.campaign_id<>g.game_id) LIMIT 1");
        if (sharedArc.rows.length || sharedCampaign.rows.length || missingCampaignLink.rows.length || missingArcParent.rows.length) throw new CatalogError("SCHEMA_INCOMPATIBLE");
      }
      for (const statement of migration.statements) await connection.query(statement.replaceAll("__BOOL__", driver.kind === "postgres" ? "BOOLEAN" : "INTEGER").replaceAll("__TIME__", driver.kind === "postgres" ? "TIMESTAMPTZ" : "TEXT").replaceAll("__BLOB__", driver.kind === "postgres" ? "BYTEA" : "BLOB"));
      if (migration.version === 4 && migration.name === "sistemas-versiones-retenidas") await seedSystems(connection);
      if (migration.version === 9 && migration.name === "campanas-arcos-escenas") await backfillCampaignHierarchy(connection);
      if (migration.version === 10 && migration.name === "preparacion-arcos") await backfillArcPreparations(connection);
      await connection.query("INSERT INTO ttrpg_control_migrations(version,name,checksum) VALUES($1,$2,$3)", [migration.version, migration.name, checksum(migration)]);
      result.push(migration.version);
    }
    await connection.query("COMMIT"); begun = false;
    return result;
  } catch (error) { if (begun) await connection.query("ROLLBACK").catch(() => undefined); throw error; }
  finally { connection.release(); }
}
