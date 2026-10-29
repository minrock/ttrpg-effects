import { BrowserTableClient } from "./table-client";
import { z } from "zod";
import { version } from "../../../package.json";
import { createClient } from "../../shared/api/client";
import type { TtrpgApi } from "../../shared/api/ttrpg-api";
import type { SceneDocument, SceneOperationResult } from "../../domain/sessions/scene-document";
import { parseSceneDocument, parseSceneJson, serializeSceneDocument } from "../../domain/sessions/scene-schema";
import { sceneDocumentV1Schema } from "../../domain/sessions/scene-schema";
const mapAnnotationsSchema = sceneDocumentV1Schema.shape.mapAnnotations;
import { composeImportedSceneMap } from "../../application/use-cases/compose-imported-scene-map";
import { assetUrl, sceneId, sceneReference } from "../../shared/contracts/service-references";
import { HttpTransport, result } from "./http";
import { downloadScene, selectBrowserFile } from "./files";

const ok = z.literal(true);
const id = z.uuid();
const timestamp = z.string().datetime();
const summary = z.object({ id, name: z.string(), createdAt: timestamp, updatedAt: timestamp });
const sceneSchema = z.unknown().transform((value, ctx) => { try { return parseSceneDocument(value); } catch { ctx.addIssue({ code: "custom", message: "Escena inválida" }); return z.NEVER; } });
const resource = summary.extend({ scene: sceneSchema, warnings: z.array(z.object({ code: z.enum(["scene-format-outdated", "external-link-unresolved"]), message: z.string() })), missingImages: z.array(z.object({ reference: z.string(), locations: z.array(z.string()) })) });
const resourceReply = z.object({ ok, resource });
const template = z.object({ id: z.string(), name: z.string(), system: z.string(), markdown: z.string(), css: z.string(), builtIn: z.boolean(), updatedAt: z.string() });
const templates = z.object({ ok, templates: z.array(template) });
const commonEntry = { id, imagePath: z.string().nullable(), createdAt: timestamp, updatedAt: timestamp };
const monster = z.object({ ...commonEntry, name: z.string(), system: z.string(), contentMarkdown: z.string(), templateId: z.string().nullable() });
const npc = z.object({ ...commonEntry, name: z.string(), notes: z.string() });
const character = z.object({ ...commonEntry, characterName: z.string(), playerName: z.string(), level: z.string(), species: z.string(), classes: z.string(), stats: z.object({ strength:z.string(),constitution:z.string(),dexterity:z.string(),intelligence:z.string(),wisdom:z.string(),charisma:z.string() }), initiative:z.string(),armorClass:z.string(),passivePerception:z.string(),hitPoints:z.string(),spellSaveDc:z.string(),speeds:z.string(),notes:z.string() });
const asset = z.object({ ok, asset: z.object({ id, reference: z.string(), url: z.string(), mimeType: z.string(), byteLength: z.number() }) });
const inactive = () => () => {};
export interface BrowserDialogs {
  selectScene(): Promise<string | null>;
  sceneName(initial: string): Promise<string | null>;
}
export function createBrowserClient(http: HttpTransport, dialogs: BrowserDialogs, chooseFile = selectBrowserFile) {
  const names = new Map<string, string>();
  const table = new BrowserTableClient(http);
  const ensureActive = (signal: AbortSignal) => { if (signal.aborted) throw new Error("Operación de una sesión anterior descartada."); };
  async function selectScene() { const signal=http.sessionSignal;const selected=await dialogs.selectScene();ensureActive(signal);return selected; }
  const resolveUrl = async (reference: string): Promise<string | null> => {
    if (!assetUrl(reference)) return null;
    const reply = await http.json("/assets/resolve", z.object({ ok, assets: z.array(z.object({ reference: z.string(), url: z.string().nullable() })) }), "POST", { references: [reference] });
    const url = reply.assets.find(a => a.reference === reference)?.url ?? null;
    if (url !== null && url !== assetUrl(reference)) throw new Error("Referencia de imagen inválida.");
    return url;
  };
  async function hydrate(item: z.infer<typeof resource>): Promise<Extract<SceneOperationResult, {ok:true}>> {
    names.set(sceneReference(item.id), item.name);
    const refs = [...new Set(item.scene.maps.flatMap(m => [m.map.imagePath, ...m.tokens.map(t => t.imagePath)]).filter((r): r is string => !!r && !!assetUrl(r)))];
    const urls = new Map<string,string>();
    for (let i=0; i<refs.length; i+=200) {
      const reply = await http.json("/assets/resolve", z.object({ ok, assets: z.array(z.object({ reference:z.string(),url:z.string().nullable() })) }), "POST", { references:refs.slice(i,i+200) });
      for (const entry of reply.assets) if (entry.url && entry.url === assetUrl(entry.reference)) urls.set(entry.reference,entry.url);
    }
    const mapImageUrls = Object.fromEntries(item.scene.maps.flatMap(m => { const url = urls.get(m.map.imagePath ?? ""); return url ? [[m.id,url]] : []; }));
    const tokenImageUrls = Object.fromEntries(item.scene.tokens.flatMap(t => { const url = urls.get(t.imagePath); return url ? [[t.id,url]] : []; }));
    return { ok:true, scene:item.scene, filePath:sceneReference(item.id), mapImageUrl:mapImageUrls[item.scene.activeMapId ?? ""], mapImageUrls, tokenImageUrls,
      warnings:[...item.warnings.map(w => ({ code:w.code==="external-link-unresolved"?"scene-link-unresolved" as const:"scene-format-outdated" as const, message:w.message,path:"" })), ...item.missingImages.map(m => ({ code:"map-image-missing" as const,path:m.reference,message:`Imagen ausente: ${m.locations.join(", ")}. Usa Reemplazar imagen o el selector del token/ficha. Referencia: ${m.reference}` }))] };
  }
  async function load(reference: string) { return hydrate((await http.request(`/scenes/${sceneId(reference)}`,resourceReply)).resource); }
  async function save(scene: SceneDocument, reference?: string | null) {
    const signal=http.sessionSignal;
    const name = reference ? names.get(reference) ?? (await http.request(`/scenes/${sceneId(reference)}`,resourceReply)).resource.name : await dialogs.sceneName("Nueva escena");
    ensureActive(signal);
    if (name === null) return {ok:false as const,error:"Guardado cancelado."};
    const reply = await http.json(reference ? `/scenes/${sceneId(reference)}` : "/scenes", resourceReply, reference ? "PUT":"POST", {name,scene:JSON.parse(serializeSceneDocument(scene))});
    return hydrate(reply.resource);
  }
  async function upload() {
    const signal=http.sessionSignal;
    const file = await chooseFile("image/png,image/jpeg,image/webp",signal);
    ensureActive(signal);
    if (!file) return null;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type)) throw new Error("Formato no admitido. Elige PNG, JPEG o WebP estático; convierte HEIC antes de subirlo.");
    if(file.size>20*1024*1024) throw new Error("La imagen supera el límite de 20 MiB.");
    const reply = await http.request("/assets",asset,{method:"POST",headers:{"Content-Type":file.type},body:file});
    if(reply.asset.url!==assetUrl(reply.asset.reference) || reply.asset.reference!==`asset:${reply.asset.id}`) throw new Error("Referencia de imagen inválida.");
    return {ok:true as const,imagePath:reply.asset.reference,imageUrl:reply.asset.url};
  }
  const openImage = () => result(async()=>await upload() ?? {ok:false as const,error:"Selección cancelada."});
  function library<T>(kind:string, schema:z.ZodType<T>) {
    return {
      search:(query:{text:string;limit?:number})=>result(()=>http.request(`/libraries/${kind}?${new URLSearchParams({text:query.text,limit:String(query.limit ?? 50)})}`,z.object({ok,entries:z.array(schema)}))),
      get:(value:string)=>result(()=>http.request(`/libraries/${kind}/${id.parse(value)}`,z.object({ok,entry:schema}))),
      save:(input:{readonly id?:string|null})=>result(()=> { const {id:value,...entry}=input; return http.json(`/libraries/${kind}${value ? `/${id.parse(value)}`:""}`,z.object({ok,entry:schema}),value?"PUT":"POST",{entry}); })
    };
  }
  const monsters=library("monsters",monster), npcs=library("npcs",npc), characters=library("player-characters",character);
  const api:TtrpgApi = {
    getAppInfo:()=>({name:"TTRPG Effects",version,status:"Bootstrap listo"}),
    saveScene:(scene,options)=>result(()=>save(scene,options?.suggestedFilePath)), saveSceneToPath:(scene,path)=>result(()=>save(scene,path)),
    loadScene:()=>result(async()=>{const selected=await selectScene();return selected ? load(selected):{ok:false as const,error:"Carga cancelada."};}),
    importSceneAsMap:(scene)=>result(async()=>{const selected=await selectScene();if(!selected)return {ok:false as const,error:"Importación cancelada."};const loaded=await load(selected);return composeImportedSceneMap(scene,{...loaded,mapImageUrls:loaded.mapImageUrls??{},tokenImageUrls:loaded.tokenImageUrls??{}},selected);}),
    selectSceneLinkTargetFile:()=>result(async()=>({ok:true as const,filePath:await selectScene()})),
    listSceneLinkCandidates:path=>result(()=>http.request(`/scenes/${sceneId(path)}/links/candidates`,z.object({ok,candidate:z.object({filePath:z.string(),markers:z.array(z.object({id:z.string(),name:z.string(),position:z.object({x:z.number(),y:z.number()}),available:z.boolean()}))})}))),
    connectSceneLink:request=>result(()=>http.json("/scene-links/connect",z.object({ok,mapAnnotations:mapAnnotationsSchema,warning:z.string().optional()}),"POST",request)),
    disconnectSceneLink:request=>result(()=>http.json("/scene-links/disconnect",z.object({ok,mapAnnotations:mapAnnotationsSchema,warning:z.string().optional()}),"POST",request)),
    validateSceneLinks:request=>result(()=>http.json("/scene-links/validate",z.object({ok,statuses:z.record(z.string(),z.discriminatedUnion("state",[z.object({state:z.literal("unlinked")}),z.object({state:z.literal("valid")}),z.object({state:z.literal("validating")}),z.object({state:z.literal("broken"),reason:z.enum(["file-missing","scene-invalid","marker-missing","connection-mismatch","read-failed"]),message:z.string()})]))}),"POST",request)),
    loadSceneLinkTarget:request=>result(async()=>{const reply=await http.json("/scene-links/navigate",z.object({ok,resource,entryPoint:z.object({x:z.number(),y:z.number()})}),"POST",request);return {ok:true as const,sceneResult:await hydrate(reply.resource),entryPoint:reply.entryPoint};}),
    listMonsterTemplates:()=>result(()=>http.request("/monster-templates",templates)),saveMonsterTemplate:value=>result(()=>http.json(`/monster-templates/${encodeURIComponent(value.id)}`,templates,"PUT",{template:value})),deleteMonsterTemplate:value=>result(()=>http.json(`/monster-templates/${encodeURIComponent(value)}`,templates,"DELETE")),
    searchMonsterLibrary:monsters.search,getMonsterLibraryEntry:monsters.get,saveMonsterLibraryEntry:monsters.save,
    searchNpcLibrary:npcs.search,getNpcLibraryEntry:npcs.get,saveNpcLibraryEntry:npcs.save,
    searchPlayerCharacterLibrary:characters.search,getPlayerCharacterLibraryEntry:characters.get,savePlayerCharacterLibraryEntry:characters.save,
    openMapImage:openImage,openTokenImage:openImage,openAsideImage:openImage,resolveMapUrl:resolveUrl,resolveTokenUrl:resolveUrl,resolveAsideUrl:resolveUrl,
    selectReplacementMapImage:async()=>{try {const selected=await upload();return selected?{status:"ready",imagePath:selected.imagePath,imageUrl:selected.imageUrl}:{status:"cancelled"};}catch(error){return {status:"error",error:error instanceof Error?error.message:"No se pudo subir la imagen."};}},
    onRecentSceneOpen:inactive,onOpenMonsterTemplateManager:inactive,
    ...table.api
  };
  return {
    table,
    client:createClient(api,{scenes:true,images:true,libraries:true,player:true,dice:true,nativeMenus:false},"service"),
    listScenes:async(offset=0)=>{const reply=await http.request(`/scenes?limit=50&offset=${offset}`,z.object({ok,scenes:z.array(summary),total:z.number().int().nonnegative()}));for(const scene of reply.scenes)names.set(sceneReference(scene.id),scene.name);return reply;},
    name:(reference:string)=>names.get(reference)??"Escena del servicio",
    importFile:()=>result(async()=>{const signal=http.sessionSignal;const file=await chooseFile(".ttrpgscene,application/json",signal);ensureActive(signal);if(!file)return {ok:false as const,error:"Importación cancelada."};if(file.size>10*1024*1024)throw new Error("La escena supera el límite de 10 MiB.");const scene=parseSceneJson(await file.text());ensureActive(signal);const reply=await http.json("/scenes/import",resourceReply,"POST",{name:file.name.replace(/\.ttrpgscene$/i,"").slice(0,200)||"Escena importada",scene:JSON.parse(serializeSceneDocument(scene))});return hydrate(reply.resource);}),
    exportFile:async(scene:SceneDocument,reference:string|null)=>downloadScene(serializeSceneDocument(scene),reference?names.get(reference)??"escena":"escena"),
    clear:()=>{table.clear();http.invalidate();names.clear();}
  };
}
export type BrowserClient = ReturnType<typeof createBrowserClient>;
