import type { SceneDocument } from "../../domain/sessions/scene-document";
export const API_PREFIX = "/api/v1";
export type ServiceRole = "dm" | "player";
export interface SessionDto { readonly ok: true; readonly role: ServiceRole; readonly expiresAt: string }
export interface ApiFailure { readonly ok: false; readonly error: { readonly code: string; readonly message: string; readonly retryAt?: string } }
export interface SceneSummary { readonly id: string; readonly name: string; readonly createdAt: string; readonly updatedAt: string }
export interface ServiceWarning { readonly code: "scene-format-outdated" | "external-link-unresolved"; readonly message: string }
export interface MissingImage { readonly reference: string; readonly locations: readonly string[] }
export interface SceneResource extends SceneSummary {
  readonly scene: SceneDocument; readonly warnings: readonly ServiceWarning[]; readonly missingImages: readonly MissingImage[];
}
export interface AssetDto {
  readonly id: string; readonly reference: string; readonly url: string; readonly mimeType: string; readonly byteLength: number;
}
