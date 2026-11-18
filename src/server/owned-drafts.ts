import { createDefaultSceneMap } from "../domain/sessions/scene-maps";
import { resourceBindingsSchema } from "../domain/systems/system-catalog";
import { z } from "zod";
import { OwnedError, type OwnedTransaction } from "../application/services/owned-store";
import { DRAFT_LIMITS, draftContextSchema, draftPutSchema, detachedScene, type DraftContext } from "../domain/drafts/draft";
import { OwnedSceneService } from "./owned-scene-service";
import { HttpError, missing, invalid } from "./errors";
import { parse, routeId, query, numberQuery } from "./schemas";
import { gameNameSchema } from "../domain/games/game-metadata";
export async function ownedDraftRoute(tx: OwnedTransaction, owner: string, url: URL, method: string, payload: unknown, expected: number | undefined, key: string | undefined, now: ()=>number) {
  const parts=url.pathname.slice('/api/v1/dm/'.length).split('/');
  const revision=()=>parse(z.number().int().nonnegative(),expected);
  async function contextValid(context: DraftContext) {
    const game=await tx.games.find(owner,context.gameId);if(!game)throw missing();
    if(game.state!=="ready")throw new OwnedError("CAMPAIGN_INACTIVE");
    const config=await tx.links.resolve(game.id);
    if(config.hash!==context.systemHash||config.ref.systemId!==context.systemRef.systemId||config.ref.version!==context.systemRef.version)throw new HttpError(409,"DRAFT_CONTEXT_CHANGED","El contexto de la partida cambió. Conserva el borrador y elige un destino compatible.");
    if(context.sceneId&&!await tx.resources.get("scenes",context.sceneId))throw missing();
  }
  if(parts[0]==="draft-definitions"&&parts.length===1&&method==="POST"){
    query(url,[]);const bindings=parse(resourceBindingsSchema,payload);
    const refs=Object.entries(bindings.monsters);if(refs.length>5000)throw invalid("Demasiadas definiciones en el borrador.");
    const definitions:Record<string,Awaited<ReturnType<typeof tx.systems.definition>>>={};
    for(const [id,ref] of refs)definitions[id]=await tx.systems.definition(ref);
    return {value:{ok:true,definitions}};
  }
  if(parts[0]==="draft-capabilities"&&parts.length===1&&method==="GET"){
    query(url,[]);return {value:{ok:true,version:1,instanceId:await tx.drafts.instance(),limits:DRAFT_LIMITS}};
  }
  if(parts[0]==="games"&&parts.length===3&&parts[2]==="drafts"&&method==="POST"){
    query(url,[]);const context=parse(draftContextSchema,payload);if(context.gameId!==routeId(parts[1]))throw invalid();await contextValid(context);
    return {status:201,value:{ok:true,draft:await tx.drafts.create(context)}};
  }
  if(parts[0]!=="drafts")return undefined;
  if(parts.length===1&&method==="GET"){
    query(url,["gameId","offset"]);const gameId=url.searchParams.get("gameId")??undefined;if(gameId)routeId(gameId);
    return {value:{ok:true,...await tx.drafts.list(gameId,numberQuery(url,"offset",0,0,Number.MAX_SAFE_INTEGER))}};
  }
  const id=routeId(parts[1]);
  if(parts.length===2&&method==="GET"){
    query(url,["revision"]);return {value:await tx.drafts.get(id,url.searchParams.has("revision")?numberQuery(url,"revision",1,1,Number.MAX_SAFE_INTEGER):undefined)};
  }
  query(url,[]);
  if(parts.length===2&&method==="PUT"){
    const input=parse(draftPutSchema,payload), current=await tx.drafts.get(id);
    const config=await tx.links.resolve(current.draft.context.gameId);
    if(config.hash!==current.draft.context.systemHash)throw new HttpError(409,"DRAFT_CONTEXT_CHANGED","El sistema de la partida cambió.");
    // Se permite retener una escena fuente borrada; nunca usarla para confirmar sin nueva validación.
    if(input.sceneId!==current.draft.context.sceneId&&input.sceneId&&!await tx.resources.get("scenes",input.sceneId))throw missing();
    return {value:{ok:true,draft:await tx.drafts.put(id,revision(),parse(z.uuid(),key),input)}};
  }
  if(parts.length===2&&method==="DELETE"){
    parse(z.strictObject({}),payload);await tx.drafts.remove(id,revision());return {value:{ok:true}};
  }
  if(parts.length===3&&parts[2]==="confirm"&&method==="POST"){
    const input=parse(z.strictObject({name:gameNameSchema,mode:z.enum(["update","copy"]),sceneRevision:z.number().int().nonnegative(),targetGameId:z.uuid(),targetArcId:z.uuid().optional()}),payload);
    if(input.mode==="copy"&&input.sceneRevision!==0)throw invalid("Una copia nueva debe partir de revisión cero.");
    const {draft,content}=await tx.drafts.get(id);if(!content||draft.revision!==revision())throw new HttpError(409,"CONFLICT","El borrador cambió antes de confirmar.");
    await contextValid({...draft.context,gameId:input.targetGameId,sceneId:input.mode==="copy"?null:draft.context.sceneId});
    if(input.mode==="update"&&(input.targetGameId!==draft.context.gameId||input.sceneRevision!==draft.context.baseRevision))throw new HttpError(409,"CONFLICT","La revisión base cambió. Recupera como copia.");
    let targetArc;
    if(input.targetArcId!==undefined)targetArc=await tx.campaigns.resolveSceneArc(input.targetGameId,input.targetArcId);
    else if(draft.context.sceneId){
      // Las confirmaciones antiguas no guardaban arco. Copiar conserva el arco
      // de la fuente cuando todavía pertenece inequívocamente a esta campaña;
      // sólo una fuente ausente/no asociada vuelve al arco inicial.
      try{targetArc=await tx.campaigns.findSceneArc(input.targetGameId,draft.context.sceneId);}
      catch(error){if(!(error instanceof OwnedError)||error.code!=="CONFLICT")throw error;targetArc=await tx.campaigns.resolveSceneArc(input.targetGameId);}
    }else targetArc=await tx.campaigns.resolveSceneArc(input.targetGameId);
    if(input.mode==="update"&&draft.context.sceneId)await tx.campaigns.assertSceneParent(draft.context.sceneId,input.targetGameId,targetArc.id);
    const scenes=new OwnedSceneService(tx,now);
    let snapshot={...content.scene,camera:content.view.camera,editorView:{sidebar:content.view.sidebar,aside:content.view.aside,selectedId:content.view.selectedId}};
    if(!snapshot.maps.length){const map=createDefaultSceneMap({...snapshot,id:"map-1",name:"Lienzo"});snapshot={...snapshot,id:map.id,name:map.name,activeMapId:map.id,maps:[map]};}
    const saved=await scenes.save(input.name,input.mode==="copy"?detachedScene(snapshot):snapshot,input.mode==="update"?draft.context.sceneId??undefined:undefined,input.sceneRevision,content.bindings);
    await tx.campaigns.linkScene(input.targetGameId,targetArc.id,saved.id);
    await tx.drafts.confirmed(id,draft.revision,saved.id,saved.revision);
    return {value:{ok:true,sceneId:saved.id,sceneRevision:saved.revision,draftRevision:draft.revision,sequence:draft.sequence}};
  }
  throw missing();
}
