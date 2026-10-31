import { Mutations } from "./mutations";
import { resourceBindingsSchema, type ResourceBindings, type ResolvedSystem, type SystemVersion } from "../../domain/systems/system-catalog";
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
import { HttpTransport, ServiceError, result } from "./http";
import { downloadScene, selectBrowserFile } from "./files";

const ok = z.literal(true);
const id = z.uuid();
const timestamp = z.string().datetime();
const summary = z.object({ id, name: z.string(), createdAt: timestamp, updatedAt: timestamp });
const sceneSchema = z.unknown().transform((value, ctx) => { try { return parseSceneDocument(value); } catch { ctx.addIssue({ code: "custom", message: "Escena inválida" }); return z.NEVER; } });
const resource = summary.extend({ revision:z.number().int().positive().optional(), bindings:resourceBindingsSchema.optional(), scene: sceneSchema, warnings: z.array(z.object({ code: z.enum(["scene-format-outdated", "external-link-unresolved"]), message: z.string() })), missingImages: z.array(z.object({ reference: z.string(), locations: z.array(z.string()) })) });
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
export function createBrowserClient(http: HttpTransport, dialogs: BrowserDialogs, chooseFile = selectBrowserFile, owned?: { gameId:string; configuration:ResolvedSystem; version:SystemVersion; table:BrowserTableClient }) {
  const names = new Map<string, string>();
  const table = owned?.table ?? new BrowserTableClient(http);
  const mutations = new Mutations(http);
  const uploads = new Map<string,string>();
  const versions = new Map<string,{revision:number;bindings?:ResourceBindings}>();
  let currentResource: string | undefined;
  let currentBindings:ResourceBindings|undefined;
  const urlFor = (reference:string) => { const legacy=assetUrl(reference); return legacy && owned ? legacy.replace("/api/v1/assets/","/api/v1/dm/assets/") : legacy; };
  function binding(templateId:string|null) { if(!owned)throw new Error("Falta configuración de sistema.");return {scope:"catalog" as const,...owned.configuration.ref,templateId:templateId??"generic-markdown"}; }
  function sceneBindings(scene:SceneDocument,previous?:ResourceBindings):ResourceBindings {
    return {monsters:Object.fromEntries(scene.sceneAside.monsters.map(m=>[m.id,previous?.monsters[m.id]?.templateId===(m.templateId??"generic-markdown")?previous.monsters[m.id]:binding(m.templateId??null)]))};
  }
  function remember(key:string,item:{revision?:number;bindings?:ResourceBindings}) { if(item.revision)versions.set(key,{revision:item.revision,bindings:item.bindings}); }
  async function mutate<T>(path:string,schema:z.ZodType<T>,method:string,payload:unknown,revision?:number) { return owned?mutations.send(path,schema,method,payload,revision):http.json(path,schema,method,payload); }
  const retainedTemplates = new Map<string,z.infer<typeof template>>();
  async function definitions(kind:string,id:string) {
    if(!owned)return;
    const r=await http.request(`/definitions/${kind}/${id}`,templates.extend({monsters:z.record(z.string(),z.number().int().nonnegative())}));if(kind==="scenes"){retainedTemplates.clear();for(const [id,index] of Object.entries(r.monsters)){const value=r.templates[index];if(!value)throw new Error("Definición retenida inválida.");retainedTemplates.set(id,value);}}
  }

  const ensureActive = (signal: AbortSignal) => { if (signal.aborted) throw new Error("Operación de una sesión anterior descartada."); };
  async function selectScene() { const signal=http.sessionSignal;const selected=await dialogs.selectScene();ensureActive(signal);return selected; }
  const resolveUrl = async (reference: string): Promise<string | null> => {
    if (!assetUrl(reference)) return null;
    const reply = await http.json("/assets/resolve", z.object({ ok, assets: z.array(z.object({ reference: z.string(), url: z.string().nullable() })) }), "POST", { references: [reference] });
    const url = reply.assets.find(a => a.reference === reference)?.url ?? null;
    if (url !== null && url !== urlFor(reference)) throw new Error("Referencia de imagen inválida.");
    return url;
  };
  async function hydrate(item: z.infer<typeof resource>): Promise<Extract<SceneOperationResult, {ok:true}>> {
    names.set(sceneReference(item.id), item.name); remember(`scenes/${item.id}`,item); if(currentResource!==item.id)table.setSceneResource(undefined);currentResource=item.id;currentBindings=item.bindings;
    if(owned)await definitions("scenes",item.id);
    const refs = [...new Set(item.scene.maps.flatMap(m => [m.map.imagePath, ...m.tokens.map(t => t.imagePath)]).filter((r): r is string => !!r && !!assetUrl(r)))];
    const urls = new Map<string,string>();
    for (let i=0; i<refs.length; i+=200) {
      const reply = await http.json("/assets/resolve", z.object({ ok, assets: z.array(z.object({ reference:z.string(),url:z.string().nullable() })) }), "POST", { references:refs.slice(i,i+200) });
      for (const entry of reply.assets) if (entry.url && entry.url === urlFor(entry.reference)) urls.set(entry.reference,entry.url);
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
    const key=reference?`scenes/${sceneId(reference)}`:undefined;
    if(owned&&key&&!versions.has(key))throw new Error("Vuelve a abrir la escena para conocer su revisión antes de guardar.");
    const reply = await mutate(reference ? `/scenes/${sceneId(reference)}` : "/scenes", resourceReply, reference ? "PUT":"POST", {name,scene:JSON.parse(serializeSceneDocument(scene)),...(owned?{bindings:sceneBindings(scene,key?versions.get(key)?.bindings:currentBindings)}:{})},key?versions.get(key)?.revision:undefined);
    return hydrate(reply.resource);
  }
  async function upload() {
    const signal=http.sessionSignal;
    const file = await chooseFile("image/png,image/jpeg,image/webp",signal);
    ensureActive(signal);
    if (!file) return null;
    if (!["image/png","image/jpeg","image/webp"].includes(file.type)) throw new Error("Formato no admitido. Elige PNG, JPEG o WebP estático; convierte HEIC antes de subirlo.");
    if(file.size>20*1024*1024) throw new Error("La imagen supera el límite de 20 MiB.");
    let fingerprint="",key="";
    if(owned){const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());ensureActive(signal);fingerprint=file.type+":"+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");key=uploads.get(fingerprint)??crypto.randomUUID();uploads.set(fingerprint,key);}
    let reply:z.infer<typeof asset>;
    try {reply = await http.request("/assets",asset,{method:"POST",headers:{"Content-Type":file.type,...(owned?{"Idempotency-Key":key}:{})},body:file});uploads.delete(fingerprint);}
    catch(error){if(error instanceof ServiceError&&![0,429,503].includes(error.status))uploads.delete(fingerprint);throw error;}
    if(reply.asset.url!==urlFor(reply.asset.reference) || reply.asset.reference!==`asset:${reply.asset.id}`) throw new Error("Referencia de imagen inválida.");
    return {ok:true as const,imagePath:reply.asset.reference,imageUrl:reply.asset.url};
  }
  const openImage = () => result(async()=>await upload() ?? {ok:false as const,error:"Selección cancelada."});
  function library<T extends {id:string}>(kind:string, schema:z.ZodType<T>) {
    const enriched=schema.and(z.object({revision:z.number().optional(),bindings:resourceBindingsSchema.optional()}));
    return {
      search:(query:{text:string;limit?:number})=>result(async()=>{const r=await http.request(`/libraries/${kind}?${new URLSearchParams({text:query.text,limit:String(query.limit??50)})}`,z.object({ok,entries:z.array(enriched)}));for(const e of r.entries)remember(`${kind}/${e.id}`,e);return r;}),
      get:(value:string)=>result(async()=>{const r=await http.request(`/libraries/${kind}/${id.parse(value)}`,z.object({ok,entry:enriched}));remember(`${kind}/${value}`,r.entry);if(kind==="monsters")await definitions(kind,value);return r;}),
      save:(input:{readonly id?:string|null})=>result(async()=>{const {id:value,...entry}=input;const previous=value?versions.get(`${kind}/${value}`):undefined;if(owned&&value&&!previous)throw new Error("Abre la ficha antes de editarla; falta su revisión.");const templateId=(entry as {templateId?:string|null}).templateId??null;
        const bindings=kind==="monsters"?{monsters:{},root:previous?.bindings?.root?.templateId===(templateId??"generic-markdown")?previous.bindings.root:owned?binding(templateId):undefined}:undefined;
        const r=await mutate(`/libraries/${kind}${value?`/${id.parse(value)}`:""}`,z.object({ok,entry:enriched}),value?"PUT":"POST",{entry,...(owned?{bindings}: {})},previous?.revision);remember(`${kind}/${r.entry.id}`,r.entry);return r;})
    };
  }
  async function linkMutation<T>(path:string,schema:z.ZodType<T>,request:unknown) {
    if(!owned)return http.json(path,schema,"POST",request);
    const input=request as {sourceScenePath?:string;scenePath?:string;targetScenePath?:string;sourceMarkerId?:string;markerId?:string};
    const refs=new Set([input.sourceScenePath??input.scenePath,input.targetScenePath].filter((v):v is string=>!!v));
    const sourceRef=input.sourceScenePath??input.scenePath!;
    const source=(await http.request(`/scenes/${sceneId(sourceRef)}`,resourceReply)).resource;
    const marker=source.scene.maps.flatMap(m=>m.mapAnnotations.sceneLinks).find(m=>m.id===(input.sourceMarkerId??input.markerId));
    if(marker?.connection)refs.add(marker.connection.peer.scenePath);
    const expectedRevisions:Record<string,number>={};
    for(const ref of refs){const key=sceneId(ref);if(!versions.has(`scenes/${key}`)){const current=(await http.request(`/scenes/${key}`,resourceReply)).resource;remember(`scenes/${key}`,current);}expectedRevisions[key]=versions.get(`scenes/${key}`)!.revision;}
    const response=await mutations.send(path,schema,"POST",{...request as object,expectedRevisions});
    const confirmed=(response as {revisions?:Record<string,number>}).revisions;if(!confirmed)throw new Error("No se confirmó la revisión de los enlaces. Vuelve a abrir la escena.");for(const [id,revision] of Object.entries(confirmed)){const old=versions.get(`scenes/${id}`);versions.set(`scenes/${id}`,{...old,revision});}
    return response;
  }
  const monsters=library("monsters",monster), npcs=library("npcs",npc), characters=library("player-characters",character);
  const api:TtrpgApi = {
    getAppInfo:()=>({name:"TTRPG Effects",version,status:"Bootstrap listo"}),
    saveScene:(scene,options)=>result(()=>save(scene,options?.suggestedFilePath)), saveSceneToPath:(scene,path)=>result(()=>save(scene,path)),
    loadScene:()=>result(async()=>{const selected=await selectScene();return selected ? load(selected):{ok:false as const,error:"Carga cancelada."};}),
    importSceneAsMap:(scene)=>result(async()=>{const selected=await selectScene();if(!selected)return {ok:false as const,error:"Importación cancelada."};const source=await http.request(`/scenes/${sceneId(selected)}`,resourceReply);const previousResource=currentResource,previousBindings=currentBindings,previousDefinitions=new Map(retainedTemplates);const loaded=await hydrate(source.resource);currentResource=previousResource;currentBindings=previousBindings;retainedTemplates.clear();for(const [id,definition] of previousDefinitions)retainedTemplates.set(id,definition);table.setSceneResource(undefined);return composeImportedSceneMap(scene,{...loaded,mapImageUrls:loaded.mapImageUrls??{},tokenImageUrls:loaded.tokenImageUrls??{}},selected);}),
    selectSceneLinkTargetFile:()=>result(async()=>({ok:true as const,filePath:await selectScene()})),
    listSceneLinkCandidates:path=>result(async()=>{if(owned){const r=(await http.request(`/scenes/${sceneId(path)}`,resourceReply)).resource;remember(`scenes/${r.id}`,r);}return http.request(`/scenes/${sceneId(path)}/links/candidates`,z.object({ok,candidate:z.object({filePath:z.string(),markers:z.array(z.object({id:z.string(),name:z.string(),position:z.object({x:z.number(),y:z.number()}),available:z.boolean()}))})}));}),
    connectSceneLink:request=>result(()=>linkMutation("/scene-links/connect",z.object({ok,mapAnnotations:mapAnnotationsSchema,warning:z.string().optional(),revisions:z.record(z.string(),z.number()).optional()}),request)),
    disconnectSceneLink:request=>result(()=>linkMutation("/scene-links/disconnect",z.object({ok,mapAnnotations:mapAnnotationsSchema,warning:z.string().optional(),revisions:z.record(z.string(),z.number()).optional()}),request)),
    validateSceneLinks:request=>result(()=>http.json("/scene-links/validate",z.object({ok,statuses:z.record(z.string(),z.discriminatedUnion("state",[z.object({state:z.literal("unlinked")}),z.object({state:z.literal("valid")}),z.object({state:z.literal("validating")}),z.object({state:z.literal("broken"),reason:z.enum(["file-missing","scene-invalid","marker-missing","connection-mismatch","read-failed"]),message:z.string()})]))}),"POST",request)),
    loadSceneLinkTarget:request=>result(async()=>{const reply=await http.json("/scene-links/navigate",z.object({ok,resource,entryPoint:z.object({x:z.number(),y:z.number()})}),"POST",request);return {ok:true as const,sceneResult:await hydrate(reply.resource),entryPoint:reply.entryPoint};}),
    listMonsterTemplates:()=>result(async()=>owned?{ok:true as const,templates:owned.configuration.definition.presentations.filter(t=>owned.configuration.availability==="enabled"&&owned.version.templates[t.id]?.availability==="enabled")}:http.request("/monster-templates",templates)),saveMonsterTemplate:value=>result(()=>{if(owned)throw new Error("Las plantillas se administran en el catálogo por un administrador.");return http.json(`/monster-templates/${encodeURIComponent(value.id)}`,templates,"PUT",{template:value});}),deleteMonsterTemplate:value=>result(()=>{if(owned)throw new Error("No se permite borrar plantillas del servicio.");return http.json(`/monster-templates/${encodeURIComponent(value)}`,templates,"DELETE");}),
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
    client:createClient(api,{scenes:true,images:true,libraries:true,templateAdministration:!owned,player:true,dice:true,nativeMenus:false},"service",owned?{
      forMonster:(id,templateId,available)=>{const retained=retainedTemplates.get(id);return retained&&retained.id===templateId?[retained,...available.filter(t=>t.id!==retained.id)]:available;},
      validateLibraryUse:async(id)=>{const entry=await monsters.get(id);if(!entry.ok)throw new Error(entry.error);const ref=versions.get(`monsters/${id}`)?.bindings?.root;if(!ref||ref.scope!=="catalog"||ref.systemId!==owned.configuration.ref.systemId||ref.version!==owned.configuration.ref.version||owned.configuration.availability!=="enabled"||owned.version.templates[ref.templateId]?.availability!=="enabled")throw new Error("Esta ficha conserva una presentación privada, deshabilitada o de otra versión. Puedes editar su instancia existente, pero no crear un vínculo nuevo en esta partida.");}
    }:undefined),
    listScenes:async(offset=0)=>{const reply=await http.request(`/scenes?limit=50&offset=${offset}`,z.object({ok,scenes:z.array(summary),total:z.number().int().nonnegative()}));for(const scene of reply.scenes)names.set(sceneReference(scene.id),scene.name);return reply;},
    name:(reference:string)=>names.get(reference)??"Escena del servicio",
    importFile:()=>result(async()=>{const signal=http.sessionSignal;const file=await chooseFile(".ttrpgscene,application/json",signal);ensureActive(signal);if(!file)return {ok:false as const,error:"Importación cancelada."};if(file.size>10*1024*1024)throw new Error("La escena supera el límite de 10 MiB.");const scene=parseSceneJson(await file.text());ensureActive(signal);const reply=await mutate("/scenes/import",resourceReply,"POST",{name:file.name.replace(/\.ttrpgscene$/i,"").slice(0,200)||"Escena importada",scene:JSON.parse(serializeSceneDocument(scene)),...(owned?{bindings:sceneBindings(scene)}:{})});return hydrate(reply.resource);}),
    exportFile:async(scene:SceneDocument,reference:string|null)=>downloadScene(serializeSceneDocument(scene),reference?names.get(reference)??"escena":"escena"),
    revalidate:async()=>{if(!owned)return;for(const [key,stored] of versions){const [kind,id]=key.split("/");const path=kind==="scenes"?`/scenes/${id}`:`/libraries/${kind}/${id}`;const value=await http.request(path,z.object({ok,resource:z.object({revision:z.number()}).optional(),entry:z.object({revision:z.number()}).optional()}));if((value.resource??value.entry)?.revision!==stored.revision)throw new ServiceError("REVISION_CONFLICT","Los recursos cambiaron mientras la sesión estaba cerrada. Conserva tu borrador; descártalo explícitamente o vuelve a abrir la escena antes de guardar.",409);}},
    associateCurrent:async()=>{if(!owned||!currentResource)throw new Error("Guarda o abre la escena antes de asociarla a esta partida.");await mutations.send(`/games/${owned.gameId}/resources`,z.object({ok}),"POST",{kind:"scenes",resourceId:currentResource});table.setSceneResource(currentResource);},
    clear:()=>{table.clear();http.invalidate();names.clear();versions.clear();retainedTemplates.clear();mutations.clear();uploads.clear();}
  };
}
export type BrowserClient = ReturnType<typeof createBrowserClient>;
