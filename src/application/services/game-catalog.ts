import type { SystemRef } from "../../domain/systems/system-catalog";
import type { GameMetadata, GameState } from "../../domain/games/game-metadata";

export type CatalogErrorCode = "VALIDATION" | "REVISION_CONFLICT" | "CONFLICT" | "CORRUPT" | "UNAVAILABLE" | "MIGRATION_REQUIRED" | "SCHEMA_INCOMPATIBLE" | "CLOSED" | "TRANSACTION_SCOPE";
const messages: Record<CatalogErrorCode, string> = {
  VALIDATION: "Los metadatos o parámetros del catálogo no son válidos.",
  REVISION_CONFLICT: "La partida cambió. Conserva tus cambios pendientes y vuelve a leerla antes de reintentar.",
  CONFLICT: "El identificador de partida ya existe.",
  CORRUPT: "El catálogo contiene un registro inválido.",
  UNAVAILABLE: "No se pudo acceder al almacenamiento. Comprueba conexión, TLS, permisos y exclusión.",
  MIGRATION_REQUIRED: "El catálogo necesita migraciones. Ejecuta pnpm db:migrate.",
  SCHEMA_INCOMPATIBLE: "El esquema o historial de migraciones no es compatible. No se modificaron datos ajenos.",
  CLOSED: "El catálogo está cerrado o cerrándose.",
  TRANSACTION_SCOPE: "Usa solo los repositorios de la transacción activa; no se admiten transacciones anidadas."
};
export class CatalogError extends Error {
  constructor(readonly code: CatalogErrorCode) { super(messages[code]); this.name = "CatalogError"; }
}
export interface GameCatalog {
  create(ownerId: string, name: string, systemRef?: SystemRef): Promise<GameMetadata>;
  find(ownerId: string, id: string): Promise<GameMetadata | null>;
  list(ownerId: string, page?: { limit?: number; offset?: number }): Promise<{ games: GameMetadata[]; total: number }>;
  update(ownerId: string, id: string, patch: { name?: string; state?: GameState }, expectedRevision?: number): Promise<GameMetadata | null>;
  delete(ownerId: string, id: string, expectedRevision?: number): Promise<boolean>;
}
export interface CatalogTransaction { readonly games: GameCatalog }
export interface CatalogDatabase extends CatalogTransaction {
  transaction<T>(work: (tx: CatalogTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
