import { createHash } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DraftCoordinator } from "./draft-coordinator";
import type { DraftRemote } from "./draft-store";
import { canonical, contentHash, type DraftCheckpoint, type DraftContent, type DraftContext, type DraftHead } from "../../domain/drafts/draft";
import { createDefaultScene } from "../../domain/sessions/default-scene";
const id=()=>crypto.randomUUID();
const context:DraftContext={gameId:id(),writerId:id(),parentDraftId:null,sceneId:null,baseRevision:0,systemRef:{systemId:'generic',version:1},systemHash:'hash'};
function setup(){
  let content:DraftContent={scene:createDefaultScene(),bindings:{monsters:{}},view:{camera:{x:0,y:0,zoom:1},sidebar:true,aside:true,selectedId:null}};
  let head:DraftHead={id:id(),context,revision:0,sequence:0,hash:'',updatedAt:new Date().toISOString(),confirmedSequence:0};
  const put=vi.fn<DraftRemote['put']>(async(_id,revision,_key,input)=>{head={...head,id:_id,revision:revision+1,sequence:input.sequence,hash:input.hash};return head;});
  const remote:DraftRemote={capabilities:async()=>({instanceId:id()}),create:vi.fn(async()=>head),put,list:async()=>({drafts:[],total:0}),get:vi.fn(),remove:vi.fn()};
  const writes:DraftCheckpoint[]=[];
  const local={enabled:async()=>true,write:vi.fn(async(v:DraftCheckpoint)=>{writes.push(structuredClone(v));})};
  const co=new DraftCoordinator('owner','https://vtt.test',local,remote,id(),async content=>createHash('sha256').update(canonical(content)).digest('hex'));
  const snapshot=()=>({context,content});
  const update=(name:string,camera=false)=>{content=camera?{...content,view:{...content.view,camera:{x:Number(name),y:0,zoom:2}}}:{...content,scene:{...content.scene,name}};co.update(snapshot,!camera);};
  co.setActive(true);
  return {co,remote,put,local,writes,snapshot,update};
}
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
it('respalda a 1/5 s, remoto a 5/30 s; idle y cámara no crean guardados remotos',async()=>{
  const t=setup();await vi.advanceTimersByTimeAsync(0);t.update('primero');
  await vi.advanceTimersByTimeAsync(999);expect(t.writes).toHaveLength(0);
  await vi.advanceTimersByTimeAsync(1);await t.co.flushLocal();expect(t.writes).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(4000);expect(t.put).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(60000);expect(t.put).toHaveBeenCalledTimes(1);
  t.update('12',true);await vi.advanceTimersByTimeAsync(10000);await t.co.flushLocal();expect(t.put).toHaveBeenCalledTimes(1);expect(t.co.checkpoint?.content.view.camera.x).toBe(12);t.co.dispose();
});
it('edición continua acota temporizadores y conserva solo la última candidata',async()=>{
  const t=setup();await vi.advanceTimersByTimeAsync(0);
  for(let i=0;i<60;i++){t.update(String(i));await vi.advanceTimersByTimeAsync(500);}
  expect(t.writes.length).toBeGreaterThanOrEqual(6);expect(t.put).toHaveBeenCalledTimes(1);expect(t.co.checkpoint?.content.scene.name).toBe('59');t.co.dispose();
});
it('respuesta perdida reutiliza cuerpo/clave/revisión y no borra cambios posteriores',async()=>{
  const t=setup();await vi.advanceTimersByTimeAsync(0);t.update('A');
  t.put.mockRejectedValueOnce(new Error('red'));
  await expect(t.co.flushRemote()).rejects.toThrow('red');
  const uncertain=structuredClone(t.co.checkpoint?.pending);expect(uncertain).not.toBeNull();
  t.update('B');await t.co.flushLocal();await t.co.flushRemote();
  expect(t.put.mock.calls[1].slice(1)).toEqual(t.put.mock.calls[0].slice(1));
  expect(t.co.checkpoint?.content.scene.name).toBe('B');expect(t.co.checkpoint?.pending).toBeNull();expect(t.co.checkpoint?.remote?.hash).toBe(await contentHash(t.snapshot().content));t.co.dispose();
});
it('no escribe ni reintenta remoto mientras la identidad está caducada',async()=>{
  const t=setup();await vi.advanceTimersByTimeAsync(0);t.update('retener');t.co.setActive(false);
  await vi.advanceTimersByTimeAsync(60000);expect(t.put).not.toHaveBeenCalled();expect(t.writes).toHaveLength(1);
  t.co.setActive(true);await vi.advanceTimersByTimeAsync(5000);expect(t.put).toHaveBeenCalledTimes(1);t.co.dispose();
});
it('ACK atrasado no marca sincronizados cambios hechos durante la petición',async()=>{
  const t=setup();await vi.advanceTimersByTimeAsync(0);
  let resolve!:(v:DraftHead)=>void;t.put.mockImplementationOnce(async(_id,rev,_key,input)=>new Promise(r=>{resolve=r;void input;void rev;}));
  t.update('A');const flight=t.co.flushRemote();await vi.advanceTimersByTimeAsync(0);
  t.update('B');await t.co.flushLocal();
  const sent=t.put.mock.calls[0][3];resolve({id:t.co.checkpoint!.remote!.id,context,revision:1,sequence:sent.sequence,hash:sent.hash,updatedAt:new Date().toISOString(),confirmedSequence:0});
  await flight;expect(t.co.checkpoint?.content.scene.name).toBe('B');expect(t.co.getStatus().remote).toContain('pendientes');
  await t.co.flushRemote();expect(t.co.checkpoint?.remote?.hash).toBe(await contentHash(t.snapshot().content));t.co.dispose();
});
it('fallo local no impide respaldar remoto y no finge éxito local',async()=>{
 const t=setup();await vi.advanceTimersByTimeAsync(0);t.local.write.mockRejectedValue(new Error('cuota'));t.update('proteger');await t.co.flushRemote();expect(t.put).toHaveBeenCalledTimes(1);expect(t.co.getStatus()).toMatchObject({local:'Respaldo local pendiente',error:'cuota'});t.co.dispose();
});
it('crear rama mientras llega otro cambio conserva el mismo ID remoto',async()=>{
 const t=setup();await vi.advanceTimersByTimeAsync(0);let resolve!:(value:DraftHead)=>void;
 t.remote.create=vi.fn(async()=>new Promise<DraftHead>(r=>{resolve=r;}));t.update('A');const flight=t.co.flushRemote();await vi.advanceTimersByTimeAsync(0);
 t.update('B');await t.co.flushLocal();const head:DraftHead={id:id(),context,revision:0,sequence:0,hash:'',updatedAt:new Date().toISOString(),confirmedSequence:0};resolve(head);await flight;
 await t.co.flushRemote();expect(t.remote.create).toHaveBeenCalledTimes(1);expect(t.co.checkpoint?.remote?.id).toBe(head.id);expect(t.co.checkpoint?.remote?.hash).toBe(await contentHash(t.snapshot().content));t.co.dispose();
});

it('no repite checkpoints idénticos y el fallback antiguo no sondea 404',async()=>{
 const t=setup();await vi.advanceTimersByTimeAsync(0);t.update('igual');await t.co.flushLocal();const sequence=t.co.checkpoint!.sequence;t.update('igual');await t.co.flushLocal();expect(t.co.checkpoint!.sequence).toBe(sequence);expect(t.local.write).toHaveBeenCalledTimes(1);t.co.dispose();
 const legacy=setup();await vi.advanceTimersByTimeAsync(0);legacy.co.dispose();legacy.remote.capabilities=vi.fn(async()=>null);
 const co=new DraftCoordinator('owner','https://vtt.test',legacy.local,legacy.remote);co.setActive(true);await vi.advanceTimersByTimeAsync(0);co.update(legacy.snapshot);await co.flushRemote();await vi.advanceTimersByTimeAsync(60000);expect(legacy.remote.capabilities).toHaveBeenCalledTimes(1);expect(legacy.put).not.toHaveBeenCalled();expect(co.getStatus().available).toBe(false);co.dispose();
});
it('confirmar la generación enviada deja pendientes los cambios posteriores',async()=>{
 const t=setup();await vi.advanceTimersByTimeAsync(0);t.update('enviada');await t.co.flushRemote();const sent=t.co.checkpoint!;
 await t.co.pendingConfirmation({hash:sent.hash,key:id(),revision:sent.remote!.revision,sequence:sent.sequence,draftId:sent.remote!.id,payload:{name:'Guardada',mode:'copy',sceneRevision:0,targetGameId:context.gameId}});
 t.update('edición posterior');await t.co.flushLocal();await expect(t.co.flushRemote()).rejects.toThrow('manual pendiente');expect(t.co.checkpoint?.confirmation?.hash).toBe(sent.hash);
 await t.co.confirmed(id(),1,sent.hash);expect(t.co.checkpoint?.content.scene.name).toBe('edición posterior');expect(t.co.getStatus().confirmed).toContain('cambios posteriores');t.co.dispose();
});

it('salir del editor antes del debounce conserva el último cambio local',async()=>{
 const t=setup();await vi.advanceTimersByTimeAsync(0);t.update('figura recién creada');
 await t.co.stop();expect(t.writes).toHaveLength(1);expect(t.writes[0].content.scene.name).toBe('figura recién creada');
 await vi.advanceTimersByTimeAsync(60000);expect(t.put).not.toHaveBeenCalled();
});

it('no resuelve Guardar antes de persistir la confirmación local',async()=>{
 const t=setup();await vi.advanceTimersByTimeAsync(0);t.update('guardada');await t.co.flushRemote();
 let release!:()=>void;t.local.write.mockImplementationOnce(()=>new Promise<void>(resolve=>{release=resolve;}));
 let finished=false;const saving=t.co.confirmed(id(),1,t.co.checkpoint!.hash).then(()=>{finished=true;});
 await vi.advanceTimersByTimeAsync(0);expect(finished).toBe(false);expect(release).toBeDefined();release();await saving;
 expect(t.co.checkpoint!.confirmedHash).toBe(t.co.checkpoint!.hash);expect(t.co.checkpoint!.confirmedSceneHash).toBeTruthy();t.co.dispose();
});

it('restaurar una escena y guardar sin editar nunca envía secuencia cero',async()=>{
 const t=setup();await vi.advanceTimersByTimeAsync(0);t.update('guardada');await t.co.flushLocal();
 const saved=t.co.checkpoint!;t.co.onRestore(async()=>{});
 await t.co.restore(saved,{confirmed:true});
 await t.co.prepare(t.snapshot);
 expect(t.put.mock.calls[0][3].sequence).toBeGreaterThan(0);
 expect(t.co.checkpoint?.pending).toBeNull();expect(t.co.getStatus().confirmed).toBe('Escena guardada');
 expect(t.writes.every(v=>!v.pending||v.pending.put.sequence>0)).toBe(true);
 t.update('figura nueva');await t.co.flushRemote();
 expect(t.co.getStatus().confirmed).toBe('Cambios sin confirmar');
 expect(t.put.mock.calls.at(-1)![3].sequence).toBeGreaterThan(t.put.mock.calls[0][3].sequence);t.co.dispose();
});
