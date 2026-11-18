import { z } from "zod";
import { sceneDocumentV2Schema, parseSceneDocument } from "../sessions/scene-schema";
import { resourceBindingsSchema, systemRefSchema } from "../systems/system-catalog";
import type { SceneDocument } from "../sessions/scene-document";

// branches limita ramas pendientes; las confirmadas siguen computando en remoteBytes.
export const DRAFT_LIMITS = { bytes: 10 * 1024 * 1024, localBytes: 50 * 1024 * 1024, remoteBytes: 256 * 1024 * 1024, branches: 20, generations: 1 } as const;
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
  payload:z.strictObject({name:z.string().min(1).max(200),mode:z.enum(["update","copy"]),sceneRevision:z.number().int().nonnegative(),targetGameId:z.uuid(),targetArcId:z.uuid().optional()})});
export type DraftConfirmation=z.infer<typeof draftConfirmationSchema>;
export interface DraftCheckpoint {
  schemaVersion: 1; localDraftId: string; ownerId: string; origin: string; instanceId: string | null;
  context: DraftContext; remote: DraftHead | null; sequence: number; hash: string; updatedAt: string;
  content: DraftContent; pending: { key: string; revision: number; put: DraftPut } | null;
  confirmation?: DraftConfirmation | null;
  createKey: string; confirmedHash: string | null; confirmedSceneHash?: string | null;
}
export const checkpointSchema = z.strictObject({
  schemaVersion: z.literal(1), localDraftId: z.uuid(), ownerId: z.string().min(1).max(128), origin: z.string().max(2048), instanceId: z.uuid().nullable(),
  confirmation:draftConfirmationSchema.nullable().optional(),
  context: draftContextSchema, remote: draftHeadSchema.nullable(), sequence: z.number().int().nonnegative(), hash: z.string(), updatedAt: z.string(),
  content: draftContentSchema, pending: z.strictObject({ key: z.uuid(), revision: z.number().int().nonnegative(), put: draftPutSchema }).nullable(), createKey: z.uuid(), confirmedHash: z.string().nullable(), confirmedSceneHash:z.string().nullable().optional()
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

/** El documento guardable, sin navegación ni selección: mover la cámara no requiere recuperación. */
export async function sceneContentHash(content:DraftContent):Promise<string>{
  const {camera,editorView,...scene}=content.scene;void camera;void editorView;
  const maps=scene.maps.map(({camera,...map})=>{void camera;return map;});
  const bytes=new TextEncoder().encode(canonical({scene:{...scene,maps},bindings:content.bindings}));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
}

/** Compatibilidad acotada con respaldos 3.22.2: el servidor nunca aceptó un PUT de secuencia cero. */
const zeroSequenceCheckpointSchema = checkpointSchema.extend({
  confirmation: z.null().optional(),
  remote: draftHeadSchema.extend({ revision: z.literal(0), sequence: z.literal(0), hash: z.literal("") }),
  pending: z.strictObject({
    key: z.uuid(), revision: z.literal(0),
    put: draftPutSchema.extend({ sequence: z.literal(0) })
  })
});

export async function readLocalCheckpoint(raw:unknown):Promise<DraftCheckpoint>{
  const parsed=checkpointSchema.safeParse(raw);
  if(parsed.success&&parsed.data.hash===await contentHash(parsed.data.content))return parsed.data;
  const legacy=zeroSequenceCheckpointSchema.safeParse(raw);
  if(legacy.success){
    const value=legacy.data;
    if(value.hash===await contentHash(value.content)&&value.pending.put.hash===await contentHash(value.pending.put.content)){
      // No se reescribe el original: sigue disponible para exportar y la recuperación crea otra rama.
      return {...value,sequence:Math.max(1,value.sequence),pending:null};
    }
  }
  throw new Error("El respaldo es incompatible o está dañado. Prueba otra generación o exporta el original.");
}

/** Una copia de recuperación por escena y partida; el lienzo sin guardar tiene su propio espacio. */
export function sameRecoverySlot(a: Pick<DraftContext,"gameId"|"sceneId">, b: Pick<DraftContext,"gameId"|"sceneId">): boolean {
  return a.gameId===b.gameId && a.sceneId===b.sceneId;
}
