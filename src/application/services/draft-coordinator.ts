import { sceneContentHash, canonical, contentHash, type DraftCheckpoint, type DraftContent, type DraftContext, type DraftHead, type DraftConfirmation } from "../../domain/drafts/draft";
import type { DraftRemote } from "./draft-store";
export interface DraftLocal {
  write(value:DraftCheckpoint):Promise<void>;
  enabled(ownerId:string):Promise<boolean>;
}
export interface DraftStatus { ready?:boolean; local:string; remote:string; confirmed:string; error:string; enabled:boolean; available:boolean|null }
export interface DraftRestoreOptions { confirmed?:boolean }
interface Snapshot { content:DraftContent; context:DraftContext }
const message=(e:unknown)=>e instanceof Error?e.message:"No se pudo respaldar el borrador.";
/** Dos destinos independientes. Solo referencias al último candidato y al envío incierto. */
export class DraftCoordinator {
  private listeners=new Set<()=>void>();
  private state:DraftStatus={ready:false,local:"Sin cambios pendientes",remote:"Comprobando autoguardado…",confirmed:"Escena sin confirmar",error:"",enabled:true,available:null};
  private snapshot:(()=>Snapshot)|null=null;
  private current:DraftCheckpoint|null=null;
  private persisted:DraftCheckpoint|null=null;
  private generations=new WeakMap<DraftCheckpoint,number>();
  private localTimer:ReturnType<typeof setTimeout>|undefined;
  private remoteTimer:ReturnType<typeof setTimeout>|undefined;
  private localStart:number|null=null; private remoteStart:number|null=null;
  private localFlight:Promise<void>|null=null; private remoteFlight:Promise<void>|null=null;
  private changed=0; private captured=0; private contentChanged=0; private remoteCaptured=0;
  private active=false; private disposed=false; private failures=0; private instanceId:string|null=null;
  private capabilityFlight:Promise<void>|null=null;
  private restoreListeners=new Set<(value:DraftCheckpoint,options?:DraftRestoreOptions)=>Promise<void>>();
  constructor(readonly ownerId:string, readonly origin:string, private readonly local:DraftLocal, readonly remote:DraftRemote, readonly writerId=crypto.randomUUID(), private readonly hash:(content:DraftContent)=>Promise<string>=contentHash) {}
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  getStatus=()=>this.state;
  get checkpoint(){return this.current;}
  private status(patch:Partial<DraftStatus>){if(this.disposed)return;this.state={...this.state,...patch};for(const listener of this.listeners)listener();}
  setEnabled(enabled:boolean){this.persisted=null;this.status({enabled,local:enabled?"Respaldo local activado":"Respaldo local desactivado"});}
  setActive(active:boolean){this.active=active;if(!active){clearTimeout(this.remoteTimer);return;}if(this.state.available===null)void this.negotiate();else if(this.remoteStart!==null)this.scheduleRemote();}
  private async negotiate(){
    if(this.capabilityFlight)return this.capabilityFlight;
    this.capabilityFlight=(async()=>{try{
      const enabled=await this.local.enabled(this.ownerId).catch(()=>true);this.status({enabled});
      const caps=await this.remote.capabilities();if(this.disposed)return;this.instanceId=caps?.instanceId??null;
      this.status({available:!!caps,remote:caps?"Sin cambios pendientes":"Autoguardado remoto no disponible"});
      if(caps&&this.remoteStart!==null)this.scheduleRemote();
    }catch(e){this.status({error:message(e),remote:"No se pudo comprobar autoguardado"});}finally{this.capabilityFlight=null;}})();return this.capabilityFlight;
  }
  update(snapshot:()=>Snapshot, content=true){
    if(this.disposed)return;this.snapshot=snapshot;this.changed++;
    if(this.state.enabled)this.status({local:"Guardando en este dispositivo…"});
    if(content){this.contentChanged++;this.remoteStart??=Date.now();this.status({remote:this.state.available===false?"Autoguardado remoto no disponible":"Cambios pendientes de sincronizar",confirmed:"Cambios sin confirmar"});this.scheduleRemote();}
    this.localStart??=Date.now();clearTimeout(this.localTimer);
    this.localTimer=setTimeout(()=>{void this.flushLocal().catch(()=>{});},Math.max(0,Math.min(1000,5000-(Date.now()-this.localStart))));
  }
  private scheduleRemote(delay?:number){
    if(!this.active||this.disposed||this.state.available!==true)return;clearTimeout(this.remoteTimer);
    const wait=delay??Math.max(0,Math.min(5000,30000-(Date.now()-(this.remoteStart??Date.now()))));
    this.remoteTimer=setTimeout(()=>{void this.flushRemote().catch(()=>{});},wait);
  }
  private async persist(value:DraftCheckpoint) {
    if(!this.state.enabled)return;
    try{await this.local.write(value);}catch(e){this.status({local:"Respaldo local pendiente",error:message(e)});}
  }
  private async capture(){
    if(!this.snapshot||this.changed===this.captured)return;
    const generation=this.changed, contentGeneration=this.contentChanged, value=this.snapshot(), hash=await this.hash(value.content);
    if(this.disposed)return;
    const prior=this.current;
    const sameDocument=prior&&prior.content.scene.id===value.content.scene.id;
    // Cambiar de documento retiene su respaldo independiente.
    const previous=sameDocument?prior:null;
    if(previous?.hash===hash&&previous.context.sceneId===value.context.sceneId&&previous.context.baseRevision===value.context.baseRevision){
      this.captured=generation;this.generations.set(previous,contentGeneration);await this.refreshConfirmation(previous);return;
    }
    const next:DraftCheckpoint={schemaVersion:1,localDraftId:previous?.localDraftId??crypto.randomUUID(),ownerId:this.ownerId,origin:this.origin,instanceId:this.instanceId,
      context:{...value.context,writerId:this.writerId,parentDraftId:previous?.context.parentDraftId??null},remote:previous?.remote??null,sequence:(previous?.sequence??0)+1,hash,updatedAt:new Date().toISOString(),content:value.content,
      pending:previous?.pending??null,confirmation:previous?.confirmation??null,createKey:previous?.createKey??crypto.randomUUID(),confirmedHash:previous?.confirmedHash??null,confirmedSceneHash:previous?.confirmedSceneHash??null};
    this.current=next;this.captured=generation;this.generations.set(next,contentGeneration);await this.refreshConfirmation(next);
  }
  private async refreshConfirmation(value:DraftCheckpoint){
    const clean=value.confirmedSceneHash
      ? value.confirmedSceneHash===await sceneContentHash(value.content)
      : value.confirmedHash===value.hash;
    if(this.current===value)this.status({confirmed:clean?"Escena guardada":"Cambios sin confirmar"});
  }
  async flushLocal():Promise<void>{
    if(this.localFlight){await this.localFlight;if(this.changed!==this.captured)return this.flushLocal();return;}
    if(this.disposed)return;clearTimeout(this.localTimer);
    this.localFlight=(async()=>{try{await this.capture();const value=this.current;
      if(value&&this.state.enabled){if(this.persisted!==value){await this.local.write(value);this.persisted=value;}this.status({local:`Guardado en este dispositivo · ${new Date().toLocaleTimeString()}`,error:""});}
      if(this.changed===this.captured)this.localStart=null;
    }catch(e){this.status({local:"Respaldo local pendiente",error:message(e)});throw e;}finally{this.localFlight=null;}})();
    return this.localFlight;
  }
  async flushRemote():Promise<void>{
    if(this.remoteFlight){await this.remoteFlight;if(this.contentChanged!==this.remoteCaptured)return this.flushRemote();return;}
    if(!this.active||this.disposed)throw new Error("Recupera tu cuenta para sincronizar el borrador.");
    if(this.state.available===null)await this.negotiate();
    if(!this.state.available)return;
    clearTimeout(this.remoteTimer);
    this.remoteFlight=(async()=>{try{
      // Un fallo local no impide salvar en el servidor, salvo journal incierto que debe preservarse en memoria.
      await this.flushLocal().catch(()=>{});
      let value=this.current;if(!value)return;
      if(value.instanceId&&value.instanceId!==this.instanceId)throw Object.assign(new Error("El respaldo pertenece a otra instancia del servicio. Expórtalo y elige un destino explícito."),{status:409});
      value.instanceId=this.instanceId;
      if(value.confirmation)throw Object.assign(new Error("Hay un guardado manual pendiente. Reintenta Guardar escena antes de sincronizar cambios nuevos."),{status:409});
      if(!value.remote){
        value.remote=await this.remote.create(value.context,value.createKey);
        // Una nueva ventana reutiliza el último respaldo: continúa su secuencia sin duplicarlo.
        value.sequence=Math.max(value.sequence,value.remote.sequence+1);
        if(this.current?.localDraftId===value.localDraftId){this.current.remote=value.remote;this.current.sequence=Math.max(this.current.sequence,value.sequence);}
        await this.persist(this.current?.localDraftId===value.localDraftId?this.current:value);
      }
      if(!this.active||this.disposed)return;
      if(value.pending){
        const ack=await this.remote.put(value.remote!.id,value.pending.revision,value.pending.key,value.pending.put);
        value.remote=ack;value.pending=null;
        if(this.current?.localDraftId===value.localDraftId){this.current.remote=ack;this.current.pending=null;}
        await this.persist(this.current?.localDraftId===value.localDraftId?this.current:value);
      }
      if(!this.active||this.disposed)return;
      if(this.current?.localDraftId!==value.localDraftId)return;
      value=this.current;
      const pendingContent=this.generations.get(value)??0;
      if(value.remote!.hash!==value.hash){
        value.pending={key:crypto.randomUUID(),revision:value.remote!.revision,put:{sequence:value.sequence,hash:value.hash,content:value.content,sceneId:value.context.sceneId,baseRevision:value.context.baseRevision}};
        if(this.current?.localDraftId===value.localDraftId)this.current.pending=value.pending;
        await this.persist(this.current?.localDraftId===value.localDraftId?this.current:value);
        if(!this.active||this.disposed)return;
        const ack=await this.remote.put(value.remote!.id,value.pending.revision,value.pending.key,value.pending.put);
        // Otra captura puede haber sustituido el objeto durante el envío; solo avanza sus metadatos.
        const latest=this.current;
        if(latest?.localDraftId===value.localDraftId){latest.remote=ack;latest.pending=null;await this.persist(latest);}
        value.remote=ack;value.pending=null;
      }
      this.remoteCaptured=pendingContent;this.failures=0;
      if(this.contentChanged===pendingContent&&this.current?.localDraftId===value.localDraftId){this.remoteStart=null;this.status({remote:`Borrador sincronizado · ${new Date().toLocaleTimeString()}`});}
    }catch(e){this.status({remote:"Sincronización pendiente",error:message(e)});
      const status=(e as {status?:number}).status??0;
      if(this.active&&(status===0||status===429||status>=500))this.scheduleRemote(status===429?Math.max(1000,((e as {retryAfter?:number}).retryAfter??1)*1000):Math.min(30000,1000*2**this.failures++)*(0.9+Math.random()*0.2));
      throw e;
    }finally{this.remoteFlight=null;}})();return this.remoteFlight;
  }
  async prepare(snapshot:()=>Snapshot):Promise<DraftHead|null>{
    const expectedHash=await this.hash(snapshot().content);
    this.update(snapshot);await this.flushLocal().catch(()=>{});await this.flushRemote();
    if(this.current?.hash!==expectedHash)throw new Error("El documento cambió durante el guardado. Sus cambios se conservan; vuelve a confirmar la escena.");
    if(this.current?.pending)throw new Error("El envío anterior no está confirmado. Reintenta antes de guardar la escena.");return this.current?.remote??null;
  }
  async pendingConfirmation(value:DraftConfirmation) { if(!this.current)throw new Error("Falta el borrador de la confirmación.");this.current.confirmation=value;await this.persist(this.current); }
  async confirmed(sceneId:string,revision:number,hash:string,savedContent?:DraftContent){
    await this.flushLocal().catch(()=>{});
    if(this.current){
      const saved=savedContent??(this.current.hash===hash?this.current.content:null);
      const clean=this.current.hash===hash;
      const content=clean&&saved?saved:this.current.content;
      this.current={...this.current,content,hash:await this.hash(content),confirmation:null,
        context:{...this.current.context,sceneId,baseRevision:revision},sequence:this.current.sequence+1,
        confirmedHash:clean?await this.hash(content):hash,
        confirmedSceneHash:saved?await sceneContentHash(saved):this.current.confirmedSceneHash,
        updatedAt:new Date().toISOString()};
      await this.persist(this.current);
      this.status({confirmed:clean?"Escena guardada":"Escena guardada; hay cambios posteriores"});
    }
  }
  onRestore(listener:(value:DraftCheckpoint,options?:DraftRestoreOptions)=>Promise<void>){this.restoreListeners.add(listener);this.status({ready:true});return()=>{this.restoreListeners.delete(listener);this.status({ready:this.restoreListeners.size>0});};}
  async restore(value:DraftCheckpoint,options?:DraftRestoreOptions){
    if(!this.restoreListeners.size)throw new Error("El editor aún se está preparando. Vuelve a intentar recuperar.");
    if(value.ownerId!==this.ownerId||value.origin!==this.origin)throw new Error("El borrador pertenece a otra cuenta u origen.");
    if(value.instanceId&&this.instanceId&&value.instanceId!==this.instanceId)throw new Error("El borrador pertenece a otra instancia. Exporta una copia antes de recuperarlo.");
    await this.flushLocal().catch(()=>{});if(this.remoteFlight)await this.remoteFlight.catch(()=>{});
    // Resolver el envío incierto antes de reutilizar el respaldo, sin cambiar su cuerpo.
    if(value.pending&&value.remote){await this.remote.put(value.remote!.id,value.pending.revision,value.pending.key,value.pending.put);value={...value,pending:null};}
    for(const listener of this.restoreListeners)await listener(value,options);
    this.current={...value,confirmedHash:options?.confirmed?await this.hash(value.content):value.confirmedHash,confirmedSceneHash:options?.confirmed?await sceneContentHash(value.content):value.confirmedSceneHash,hash:await this.hash(value.content),updatedAt:new Date().toISOString(),localDraftId:crypto.randomUUID(),createKey:crypto.randomUUID(),sequence:1,remote:null,pending:null,context:{...value.context,writerId:this.writerId,parentDraftId:null}};
    this.snapshot=null;this.captured=this.changed;
    this.generations.set(this.current,this.contentChanged);
    clearTimeout(this.localTimer);clearTimeout(this.remoteTimer);this.localStart=null;this.remoteStart=null;
    await this.persist(this.current);
    this.status({error:"",remote:"Sin cambios pendientes",confirmed:options?.confirmed?"Escena guardada cargada":"Borrador recuperado; confirma para guardar la escena"});
  }
  async stop(){this.active=false;clearTimeout(this.localTimer);clearTimeout(this.remoteTimer);await Promise.allSettled([this.flushLocal(),this.remoteFlight]);this.disposed=true;this.listeners.clear();this.restoreListeners.clear();}
  dispose(){this.active=false;clearTimeout(this.localTimer);clearTimeout(this.remoteTimer);this.disposed=true;this.listeners.clear();this.restoreListeners.clear();}
  /** Comparación de contenido solo para pruebas/confirmación, fuera del render. */
  sameContent(value:DraftContent){return this.current?canonical(this.current.content)===canonical(value):false;}
}
