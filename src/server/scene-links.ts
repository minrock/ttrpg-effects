import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createReciprocalSceneLinkMarkers, disconnectSceneLinkMarker, validateReciprocalSceneLink, type MapSceneLinkMarker, type SceneLinkValidationStatus } from "../domain/annotations/scene-navigation-links";
import { mapSceneLinkMarkerSchema } from "../domain/sessions/scene-schema";
import { syncActiveMapFromRuntimeFields, syncRuntimeFieldsFromActiveMap, setActiveSceneMap } from "../domain/sessions/scene-maps";
import type { SceneDocument } from "../domain/sessions/scene-document";
import { sceneId, sceneReference } from "../shared/contracts/service-references";
import type { SceneService } from "./scene-service";
import type { ServiceStore } from "../infrastructure/server/service-store";
import { invalid } from "./errors";
export const serviceSceneReferenceSchema = z.string().refine(value=>{try{sceneId(value);return true;}catch{return false;}});
const markerId = z.string().min(1).max(200);
export const connectSchema = z.strictObject({sourceScenePath:serviceSceneReferenceSchema,sourceMarkerId:markerId,targetScenePath:serviceSceneReferenceSchema,targetMarkerId:markerId});
export const linkSchema = z.strictObject({scenePath:serviceSceneReferenceSchema,markerId});
export const validateLinksSchema = z.strictObject({scenePath:serviceSceneReferenceSchema,markers:z.array(mapSceneLinkMarkerSchema).max(1000)});
export class SceneLinksService {
  constructor(private readonly scenes:SceneService,private readonly store:ServiceStore) {}
  private read(reference:string) { try {return this.scenes.get(sceneId(reference));} catch {throw invalid("La escena enlazada no existe o su referencia no pertenece al servicio.");} }
  private marker(scene:SceneDocument,id:string):MapSceneLinkMarker {const found=scene.maps.flatMap(m=>m.mapAnnotations.sceneLinks).filter(m=>m.id===id);if(found.length!==1)throw invalid("El marcador no existe o su identidad es ambigua.");return found[0];}
  private replace(scene:SceneDocument, marker:MapSceneLinkMarker):SceneDocument {
    const synced=syncActiveMapFromRuntimeFields(scene);
    const maps=synced.maps.map(map=>({...map,mapAnnotations:{...map.mapAnnotations,sceneLinks:map.mapAnnotations.sceneLinks.map(item=>item.id===marker.id?marker:item)}}));
    return syncRuntimeFieldsFromActiveMap({...synced,maps});
  }
  candidates(reference:string) {const scene=this.read(reference).scene;return {ok:true as const,candidate:{filePath:reference,markers:scene.maps.flatMap(map=>map.mapAnnotations.sceneLinks.map(marker=>({id:marker.id,name:`${map.name} · ${marker.name}`,position:marker.position,available:marker.connection===null&&!marker.locked})))}};}
  connect(request:z.infer<typeof connectSchema>) {
    if(request.sourceScenePath===request.targetScenePath)throw invalid("Usa el enlace interno entre mapas de la misma escena.");
    const source=this.read(request.sourceScenePath),target=this.read(request.targetScenePath);
    const a=this.marker(source.scene,request.sourceMarkerId),b=this.marker(target.scene,request.targetMarkerId);
    if(a.connection?.peer.mapId!==undefined||b.connection?.peer.mapId!==undefined)throw invalid("Usa Desligar para liberar la conexión interna antes de conectar otra escena.");
    if(a.locked||b.locked)throw invalid("No se puede conectar un marcador bloqueado.");
    if(b.connection && !validateReciprocalSceneLink(a,request.sourceScenePath,b,request.targetScenePath))throw invalid("El destino ya está conectado. Desconéctalo primero.");
    const updates=new Map<string,{name:string;scene:SceneDocument}>();
    let warning:string|undefined;
    if(a.connection) {
      const peer=a.connection.peer;
      if(peer.scenePath!==request.targetScenePath||peer.markerId!==b.id){
        let old:ReturnType<SceneLinksService["read"]>|undefined;
        try {old=this.read(peer.scenePath);} catch {warning="Se reparó el destino ausente. Su referencia anterior no pudo actualizarse.";}
        if(old){const oldMarker=this.marker(old.scene,peer.markerId);if(!validateReciprocalSceneLink(a,request.sourceScenePath,oldMarker,peer.scenePath))throw invalid("Repara o desconecta el enlace anterior antes de conectar.");updates.set(old.id,{name:old.name,scene:this.replace(old.scene,disconnectSceneLinkMarker(oldMarker))});}
      }
    }
    const [nextA,nextB]=createReciprocalSceneLinkMarkers(a,request.sourceScenePath,b,request.targetScenePath,randomUUID());
    const nextSource=this.replace(updates.get(source.id)?.scene??source.scene,nextA);
    updates.set(source.id,{name:source.name,scene:nextSource});updates.set(target.id,{name:target.name,scene:this.replace(updates.get(target.id)?.scene??target.scene,nextB)});
    this.store.transaction(()=>{for(const [id,item] of updates)this.scenes.save(item.name,item.scene,id);});
    return {ok:true as const,mapAnnotations:nextSource.mapAnnotations,warning};
  }
  disconnect(request:z.infer<typeof linkSchema>) {
    const source=this.read(request.scenePath);const marker=this.marker(source.scene,request.markerId);if(marker.locked)throw invalid("El marcador está bloqueado.");
    const next=this.replace(source.scene,disconnectSceneLinkMarker(marker));let remote:ReturnType<SceneLinksService["read"]>|undefined;let nextRemote:SceneDocument|undefined;let warning:string|undefined;
    if(marker.connection){try {remote=this.read(marker.connection.peer.scenePath);const peer=this.marker(remote.scene,marker.connection.peer.markerId);if(validateReciprocalSceneLink(marker,request.scenePath,peer,marker.connection.peer.scenePath))nextRemote=this.replace(remote.scene,disconnectSceneLinkMarker(peer));else warning="Se desligó el marcador local; el destino no tenía una conexión recíproca válida.";}catch{warning="Se desligó el marcador local. El destino ausente permanece sin resolver.";}}
    this.store.transaction(()=>{this.scenes.save(source.name,next,source.id);if(remote&&nextRemote)this.scenes.save(remote.name,nextRemote,remote.id);});
    return {ok:true as const,mapAnnotations:next.mapAnnotations,warning};
  }
  validate(request:z.infer<typeof validateLinksSchema>) {
    const current=this.read(request.scenePath);const statuses:Record<string,SceneLinkValidationStatus>={};
    for(const marker of request.markers){if(!marker.connection){statuses[marker.id]={state:"unlinked"};continue;}try{const peer=marker.connection.peer;if(peer.mapId){const map=current.scene.maps.find(m=>m.id===peer.mapId);if(!map?.mapAnnotations.sceneLinks.some(m=>m.id===peer.markerId))throw invalid();}else{const remote=this.read(peer.scenePath);if(!validateReciprocalSceneLink(marker,request.scenePath,this.marker(remote.scene,peer.markerId),peer.scenePath))throw invalid();}statuses[marker.id]={state:"valid"};}catch{statuses[marker.id]={state:"broken",reason:"connection-mismatch",message:"El destino no se puede resolver. Selecciona una escena y marcador del servicio para repararlo."};}}
    return {ok:true as const,statuses};
  }
  navigate(request:z.infer<typeof linkSchema>) {
    const source=this.read(request.scenePath);const marker=this.marker(source.scene,request.markerId);if(!marker.connection)throw invalid("El marcador no está conectado.");
    const peer=marker.connection.peer;const target=this.read(peer.scenePath);const remote=this.marker(target.scene,peer.markerId);
    if(!validateReciprocalSceneLink(marker,request.scenePath,remote,peer.scenePath))throw invalid("La conexión ya no es válida. Selecciona de nuevo el destino.");
    const map=target.scene.maps.find(m=>m.mapAnnotations.sceneLinks.some(m=>m.id===remote.id))!;
    return {ok:true as const,resource:{...target,scene:setActiveSceneMap(target.scene,map.id)},entryPoint:remote.position};
  }
}
export { sceneReference };
