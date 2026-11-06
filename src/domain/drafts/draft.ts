import { z } from "zod";
import { sceneDocumentV2Schema, parseSceneDocument } from "../sessions/scene-schema";
import { resourceBindingsSchema, systemRefSchema } from "../systems/system-catalog";
import type { SceneDocument } from "../sessions/scene-document";

export const DRAFT_LIMITS = { bytes: 10 * 1024 * 1024, localBytes: 50 * 1024 * 1024, remoteBytes: 256 * 1024 * 1024, branches: 20, generations: 3 } as const;
export const draftContextSchema = z.strictObject({
  gameId: z.uuid(), writerId: z.uuid(), parentDraftId: z.uuid().nullable(),
  sceneId: z.uuid().nullable(), baseRevision: z.number().int().nonnegative(),
  systemRef: systemRefSchema, systemHash: z.string().min(1).max(128)
});
export const draftContentSchema = z.strictObject({
  scene: sceneDocumentV2Schema,
  bindings: resourceBindingsSchema,
  view: z.strictObject({ camera: z.strictObject({ x: z.number().finite(), y: z.number().finite(), zoom: z.number().finite().positive() }),
    sidebar: z.boolean(), aside: z.boolean(), selectedId: z.string().max(256).nullable() })
}).superRefine((content,ctx)=>{
  const refs=[...content.scene.maps.flatMap(m=>[m.map.imagePath,...m.tokens.map(t=>t.imagePath)]),...content.scene.sceneAside.monsters.map(v=>v.imagePath),...content.scene.sceneAside.npcs.map(v=>v.imagePath),...content.scene.sceneAside.playerCharacters.map(v=>v.imagePath)];
  if(refs.some(ref=>ref!==null&&(ref.length>2048||/^(?:data|blob):/i.test(ref)))||content.scene.sceneAside.notes.some(n=>/!\[[^\]]*\]\((?:data|blob):/i.test(n.content)))ctx.addIssue({code:"custom",message:"El respaldo solo admite referencias persistentes de imágenes, sin bytes ni URLs temporales."});
});
export const draftPutSchema = z.strictObject({
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  hash: z.string().regex(/^[a-f0-9]{64}$/), content: draftContentSchema,
  sceneId: z.uuid().nullable(), baseRevision: z.number().int().nonnegative()
});
export const draftHeadSchema = z.strictObject({
  id: z.uuid(), context: draftContextSchema, revision: z.number().int().nonnegative(), sequence: z.number().int().nonnegative(),
  hash: z.string(), updatedAt: z.string(), confirmedSequence: z.number().int().nonnegative()
});
export const draftVersionSchema = z.object({ revision: z.number().int().positive(), sequence: z.number().int().positive(), updatedAt: z.string() });
export const draftReplySchema = z.object({ ok: z.literal(true), draft: draftHeadSchema, content: draftContentSchema.nullable(), versions: z.array(draftVersionSchema) });
export type DraftContext = z.infer<typeof draftContextSchema>;
export type DraftContent = z.infer<typeof draftContentSchema>;
export type DraftPut = z.infer<typeof draftPutSchema>;
export type DraftHead = z.infer<typeof draftHeadSchema>;
export type DraftReply = z.infer<typeof draftReplySchema>;
export const draftConfirmationSchema = z.strictObject({hash:z.string().regex(/^[a-f0-9]{64}$/),key:z.uuid(),revision:z.number().int().positive(),sequence:z.number().int().positive(),draftId:z.uuid(),
  payload:z.strictObject({name:z.string().min(1).max(200),mode:z.enum(["update","copy"]),sceneRevision:z.number().int().nonnegative(),targetGameId:z.uuid()})});
export type DraftConfirmation=z.infer<typeof draftConfirmationSchema>;
export interface DraftCheckpoint {
  schemaVersion: 1; localDraftId: string; ownerId: string; origin: string; instanceId: string | null;
  context: DraftContext; remote: DraftHead | null; sequence: number; hash: string; updatedAt: string;
  content: DraftContent; pending: { key: string; revision: number; put: DraftPut } | null;
  confirmation?: DraftConfirmation | null;
  createKey: string; confirmedHash: string | null;
}
export const checkpointSchema = z.strictObject({
  schemaVersion: z.literal(1), localDraftId: z.uuid(), ownerId: z.string().min(1).max(128), origin: z.string().max(2048), instanceId: z.uuid().nullable(),
  confirmation:draftConfirmationSchema.nullable().optional(),
  context: draftContextSchema, remote: draftHeadSchema.nullable(), sequence: z.number().int().nonnegative(), hash: z.string(), updatedAt: z.string(),
  content: draftContentSchema, pending: z.strictObject({ key: z.uuid(), revision: z.number().int().nonnegative(), put: draftPutSchema }).nullable(), createKey: z.uuid(), confirmedHash: z.string().nullable()
});
export function encodedBytes(value: unknown): number { return new TextEncoder().encode(JSON.stringify(value)).byteLength; }
/** Estable también después de normalizar JSON recibido. No acepta credenciales ni estado de render. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return "{" + Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+":"+canonical(v)).join(",") + "}";
  return JSON.stringify(value) ?? "null";
}
export async function contentHash(content: DraftContent): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(content));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), b=>b.toString(16).padStart(2,"0")).join("");
}
/** Copiar no puede conservar reciprocidad con una escena ajena a la copia. */
export function detachedScene(scene: SceneDocument): SceneDocument {
  const detach = (annotations: SceneDocument["mapAnnotations"]) => ({ ...annotations, sceneLinks: annotations.sceneLinks.map(link=>({...link, connection:null})) });
  return parseSceneDocument({ ...scene, id: crypto.randomUUID(), mapAnnotations: detach(scene.mapAnnotations), maps: scene.maps.map(map=>({...map,mapAnnotations:detach(map.mapAnnotations)})) });
}
