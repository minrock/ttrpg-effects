import { createDefaultScene } from "../../domain/sessions/default-scene";
import { createDefaultSceneMap, syncActiveMapFromRuntimeFields } from "../../domain/sessions/scene-maps";
import type { PlayerWindowSnapshot } from "../../domain/player/player-window";
import type { SceneToken } from "../../domain/sessions/scene-document";
export const refs = Array.from({ length: 8 }, (_, n) => `asset:10000000-0000-4000-8000-${String(n).padStart(12,"0")}`);
export function privateFixture(): PlayerWindowSnapshot {
  const token: SceneToken = { id:"token-visible",name:"Héroe",type:"token",imagePath:refs[1],position:{x:50,y:80},size:"medium",footprintCells:1,selectionColor:"#ffffff",badgeNumber:1,order:1,visible:true };
  const source = createDefaultScene();
  const scene = syncActiveMapFromRuntimeFields({ ...source, map:{...source.map,imagePath:refs[0]}, camera:{x:9811,y:2222,zoom:3},
    tokens:[token,{...token,id:"SECRET-token-id",name:"SECRET-token-name",imagePath:refs[2],visible:false}],
    lights:[{id:"SECRET-light",kind:"point",position:{x:9,y:9},radius:100,color:"#ffffff",intensity:1,opacity:1,angle:90,direction:0,visible:false,snapToGrid:false}],
    effects:[{id:"SECRET-effect",kind:"magical-darkness",position:{x:0,y:0},radius:100,opacity:1,visible:false}],
    labels:[{id:"SECRET-label",type:"label",text:"SECRET-label-text",position:{x:0,y:0},fontFamily:"Arial, sans-serif",color:"#ffffff",opacity:1,shadow:{enabled:false,color:"#000000",blur:0}}],
    mapAnnotations:{pins:[{id:"SECRET-pin",kind:"room-pin",position:{x:0,y:0},title:"SECRET-title",content:`<img src="${refs[7]}">SECRET-html`,locked:false}],areas:[],sceneLinks:[]},
    sceneAside:{monsters:[{id:"visible-monster",name:"Ogro",imagePath:refs[3],visibleToPlayer:true,notes:"SECRET-monster-note",templateId:"SECRET-template"},{id:"SECRET-monster",name:"SECRET-monster-name",imagePath:refs[4],visibleToPlayer:false,notes:"SECRET-hidden-note"}],npcs:[{id:"npc",name:"Guía",imagePath:refs[3],visibleToPlayer:true,notes:"SECRET-npc-note"}],playerCharacters:[{id:"SECRET-pc",characterName:"SECRET-character",playerName:"SECRET-player",level:"SECRET-level",species:"SECRET-species",classes:"SECRET-class",imagePath:refs[7],stats:{strength:"SECRET-str",constitution:"SECRET-con",dexterity:"SECRET-dex",intelligence:"SECRET-int",wisdom:"SECRET-wis",charisma:"SECRET-cha"},initiative:"SECRET-init",armorClass:"12",passivePerception:"SECRET-perception",hitPoints:"SECRET-hp",spellSaveDc:"SECRET-dc",speeds:"SECRET-speed",notes:"SECRET-pc-notes"}],notes:[{id:"SECRET-note",parentId:null,name:"SECRET-note-name",content:`![SECRET-markdown](${refs[7]})`}]},
    combatTracker:{active:true,currentParticipantId:"combatant",round:2,participants:[{id:"combatant",entityId:"SECRET-entity-id",entityType:"playerCharacter",name:"Guerrero",imagePath:refs[5],initiative:12,defeated:false,enteredRound:0,activeFromRound:0}]},
    counters:[{id:"public-counter",label:"SECRET-counter-label",mode:"progress",kind:"dynamic",value:3,isVisibleToPlayers:true,isLabelVisibleToPlayers:false},{id:"SECRET-counter",label:"SECRET-counter",mode:"progress",kind:"dynamic",value:9981,isVisibleToPlayers:false,isLabelVisibleToPlayers:false}]
  });
  return {scene:{...scene,maps:[...scene.maps,createDefaultSceneMap({id:"SECRET-map-id",name:"SECRET-map-name",map:{imagePath:refs[6],position:{x:0,y:0},scale:1}})]},camera:{center:{x:20,y:30},zoom:1},mapImageUrl:"file:///SECRET-path",tokenImageUrls:{"SECRET-key":"https://SECRET-external"},showDmFogOverlay:true};
}
