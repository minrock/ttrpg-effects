import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";
import type { Availability, DefinitionRef, ResolvedSystem, ResourceBindings, SystemDefinition, SystemRef, SystemVersion } from "../../domain/systems/system-catalog";
import type { ResourceKind } from "./owned-store";
import { ApplicationError } from "./application-error";
export type SystemCode = "FORBIDDEN" | "VALIDATION" | "NOT_FOUND" | "CONFLICT" | "IMMUTABLE" | "DISABLED" | "INCOMPATIBLE" | "CORRUPT";
export class SystemError extends ApplicationError {
  constructor(readonly code: SystemCode) { super(({ FORBIDDEN: "Tu cuenta no tiene permiso para esta operación del catálogo.", VALIDATION: "La definición o referencia no es válida.", NOT_FOUND: "No se encontró la definición solicitada.", CONFLICT: "La definición cambió. Conserva tus cambios y vuelve a leerla.", IMMUTABLE: "La definición se conserva sin cambios. Publica una versión nueva o cambia su disponibilidad.", DISABLED: "Esta definición está deshabilitada para usos nuevos. Elige una versión y plantilla habilitadas.", INCOMPATIBLE: "El recurso y la partida deben usar el mismo sistema y versión.", CORRUPT: "La definición guardada es incompatible o está dañada." })[code]); }
}
export interface SystemCatalog {
  create(systemId: string, name: string): Promise<void>;
  list(): Promise<Array<{ systemId: string; name: string; versions: SystemVersion[] }>>;
  selectable(): Promise<Array<{ ref: SystemRef; name: string; templates: Array<{ id: string; name: string }> }>>;
  get(ref: SystemRef): Promise<SystemVersion>;
  draft(ref: SystemRef, definition: SystemDefinition, revision: number): Promise<SystemVersion>;
  publish(ref: SystemRef, revision: number): Promise<SystemVersion>;
  availability(ref: SystemRef, value: Availability, revision: number, templateId?: string): Promise<SystemVersion>;
  resolve(ref: SystemRef): Promise<ResolvedSystem>;
  definition(ref: DefinitionRef): Promise<MonsterTemplate>;
}
export interface ResourceGameLinks {
  link(gameId: string, kind: Exclude<ResourceKind, "templates">, resourceId: string): Promise<void>;
  validate(gameId: string, kind: Exclude<ResourceKind, "templates">, resourceId: string): Promise<void>;
  resolve(gameId: string): Promise<ResolvedSystem>;
}
export interface BindingPolicy {
  read(kind: ResourceKind, id: string): Promise<ResourceBindings>;
  write(kind: ResourceKind, id: string, value: unknown, bindings?: ResourceBindings): Promise<ResourceBindings>;
  newGame(ref: SystemRef): Promise<void>;
}
