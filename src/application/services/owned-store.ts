import type { InvitationRepository } from "./invitations";
import type { ResourceBindings, SystemRef } from "../../domain/systems/system-catalog";
import type { SystemCatalog, ResourceGameLinks } from "./system-catalog";
import type { CatalogTransaction, GameCatalog } from "./game-catalog";
import type { GameMetadata } from "../../domain/games/game-metadata";
import type { SceneResource } from "../../shared/contracts/http-api";
import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";
import type { MonsterLibraryEntry } from "../../domain/monster-library/monster-library";
import type { NpcLibraryEntry, PlayerCharacterLibraryEntry } from "../../domain/entity-library/entity-library";
export type OwnedCode = "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "OPERATION_CONTENT_CONFLICT" | "OPERATION_BUDGET" | "RESULT_TOO_LARGE" | "TEMPLATE_REFERENCED" | "CORRUPT" | "UNAVAILABLE";
export class OwnedError extends Error {
  constructor(readonly code: OwnedCode, readonly retryAt?: string) { super(({ FORBIDDEN: "Esta operación requiere una cuenta DM.", OPERATION_CONTENT_CONFLICT: "La clave de operación ya tiene otro contenido. Usa una clave nueva para una operación distinta.", OPERATION_BUDGET: "La operación no se confirmó: se agotó el presupuesto temporal. Espera hasta la fecha indicada y reintenta; recargar no libera espacio.", RESULT_TOO_LARGE: "La operación no se confirmó: su resultado excede el límite. Reduce el contenido antes de reintentar.", TEMPLATE_REFERENCED: "La plantilla está referenciada por un monstruo. Cambia o retira esa referencia antes de eliminarla.", VALIDATION: "Los datos o la revisión no son válidos.", NOT_FOUND: "No se encontró el recurso.", CONFLICT: "El recurso cambió o la operación ya tiene otro contenido. Recarga antes de reintentar.", CORRUPT: "Los datos guardados están dañados o son incompatibles.", UNAVAILABLE: "No se pudo completar la operación de almacenamiento." })[code]); }
}
export interface ResourceBodies {
  scenes: Omit<SceneResource, "missingImages">;
  templates: MonsterTemplate;
  monsters: MonsterLibraryEntry;
  npcs: NpcLibraryEntry;
  "player-characters": PlayerCharacterLibraryEntry;
}
export type ResourceKind = keyof ResourceBodies;
export interface Versioned<T> { readonly value: T; readonly revision: number; readonly bindings?: ResourceBindings }
export interface ResourceRepository {
  get<K extends ResourceKind>(kind: K, id: string): Promise<Versioned<ResourceBodies[K]> | null>;
  list<K extends ResourceKind>(kind: K, page?: { limit?: number; offset?: number; text?: string }): Promise<{ items: Versioned<ResourceBodies[K]>[]; total: number }>;
  put<K extends ResourceKind>(kind: K, value: ResourceBodies[K], expectedRevision: number, bindings?: ResourceBindings): Promise<Versioned<ResourceBodies[K]>>;
  remove(kind: ResourceKind, id: string, expectedRevision: number): Promise<void>;
}
export interface AssetRepository {
  get(id: string): Promise<{ mime: string; bytes: Uint8Array } | null>;
  has(id: string): Promise<boolean>;
  create(id: string, mime: string, bytes: Uint8Array): Promise<void>;
}
export interface Opening {
  id: string; gameId: string; generation: number; state: "open" | "closed"; hostAccountId: string; hostSessionId: string;
  createdAt: string; closedAt: string | null; lastHeartbeatAt: string; leaseExpiresAt: string; revision: number;
}
export interface OpeningRepository {
  current(gameId: string): Promise<Opening | null>;
  start(gameId: string, expectedGameRevision: number): Promise<Opening>;
  renew(gameId: string, id: string, generation: number): Promise<Opening>;
  close(gameId: string, id: string, generation: number, expectedRevision: number): Promise<void>;
  invalidate(gameId: string): Promise<void>;
}
export interface CommitEffects {
  beforeCommit(check: () => Promise<void>): void;
  afterCommit(apply: () => void, uncertain: () => void): void;
}
export interface OwnedTransaction extends CatalogTransaction {
  readonly systems: SystemCatalog;
  readonly links: ResourceGameLinks;
  readonly effects: CommitEffects;
  readonly resources: ResourceRepository;
  readonly assets: AssetRepository;
  readonly openings: OpeningRepository;
  readonly invitations: InvitationRepository;
  /** Idempotencia persistida en la misma transacción y ámbito del principal. */
  operation<T>(id: string, context: string, content: unknown, work: () => Promise<T>): Promise<T>;
}
export interface OwnedGameCatalog {
  create(name: string, systemRef: SystemRef): Promise<GameMetadata>;
  find(id: string): Promise<GameMetadata | null>;
  list(page?: Parameters<GameCatalog["list"]>[1]): ReturnType<GameCatalog["list"]>;
  update(id: string, patch: Parameters<GameCatalog["update"]>[2], revision: number): Promise<GameMetadata>;
  delete(id: string, revision: number): Promise<void>;
}
