import { restoreDialogFocus } from "../renderer/src/client/dialog-focus";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BrowserClient, BrowserDialogs } from "../infrastructure/browser/browser-client";
import { sceneReference } from "../shared/contracts/service-references";
import type { SceneSummary } from "../shared/contracts/http-api";
export type DialogRequest = {kind:"scene"|"name"|"leave"|"discard";initial?:string;resolve:(value:string|null)=>void};
export class DialogBroker implements BrowserDialogs {
  current:DialogRequest|null=null;
  private notify:()=>void=()=>{};
  subscribe(notify:()=>void) {this.notify=notify;return ()=>{this.notify=()=>{};};}
  private open(kind:DialogRequest["kind"],initial?:string):Promise<string|null>{this.finish(null);return new Promise(resolve=>{this.current={kind,initial,resolve};this.notify();});}
  selectScene=()=>this.open("scene");
  sceneName=(initial:string)=>this.open("name",initial);
  leave=()=>this.open("leave");
  discard=()=>this.open("discard");
  finish(value:string|null){const previous=this.current;this.current=null;previous?.resolve(value);this.notify();}
}
export function ServiceDialog({title,onCancel,children}:{title:string;onCancel:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const trigger=document.querySelector("[data-dialog-return-focus]") ?? document.activeElement;ref.current?.showModal();return()=>{ref.current?.close();restoreDialogFocus(trigger);};},[]);
  return <dialog className="service-dialog" ref={ref} aria-label={title} onCancel={event=>{event.preventDefault();onCancel();}} onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()}>
    <h2>{title}</h2>{children}
  </dialog>;
}
function ScenePicker({browser,finish}:{browser:BrowserClient;finish:(value:string|null)=>void}) {
  const [entries,setEntries]=useState<readonly SceneSummary[]>([]),[selected,setSelected]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(true),[retry,setRetry]=useState(0),[page,setPage]=useState(0),[total,setTotal]=useState(0);
  useEffect(()=>{let live=true;setBusy(true);setError("");setSelected("");void browser.listScenes(page*50).then(reply=>{if(live){setEntries(reply.scenes);setTotal(reply.total);}}).catch(error=>{if(live)setError(error.message);}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};},[browser,page,retry]);
  return <ServiceDialog title="Escenas guardadas en el servicio" onCancel={()=>finish(null)}>
    {busy?<p role="status">Cargando escenas…</p>:error?<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Reintentar</button></p>:entries.length===0?<p>No hay escenas guardadas. Agrega un mapa y guarda tu primera escena.</p>:<label>Escena<select aria-label="Escena guardada" size={Math.min(entries.length+1,8)} value={selected} onChange={e=>setSelected(e.target.value)}><option value="" disabled>Selecciona una escena</option>{entries.map(entry=><option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>}
    {selected&&<p className="service-selected-scene" aria-live="polite"><strong>Escena seleccionada</strong><br/>{entries.find(entry=>entry.id===selected)?.name}</p>}
    {total>50&&<nav aria-label="Páginas de escenas"><button disabled={page===0||busy} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page+1}</span><button disabled={(page+1)*50>=total||busy} onClick={()=>setPage(p=>p+1)}>Siguiente</button></nav>}
    <footer><button onClick={()=>finish(null)}>Cancelar</button><button disabled={!selected||busy||!!error} onClick={()=>finish(sceneReference(selected))}>Abrir escena</button></footer>
  </ServiceDialog>;
}
function NameDialog({request,finish}:{request:DialogRequest;finish:(value:string|null)=>void}) {
  const [name,setName]=useState(request.initial??"");
  return <ServiceDialog title="Guardar escena en el servicio" onCancel={()=>finish(null)}><form onSubmit={e=>{e.preventDefault();if(name.trim())finish(name.trim());}}><label>Nombre de escena<input autoFocus value={name} maxLength={200} required onChange={e=>setName(e.target.value)}/></label><footer><button type="button" onClick={()=>finish(null)}>Cancelar</button><button disabled={!name.trim()}>Guardar</button></footer></form></ServiceDialog>;
}
export function DialogHost({broker,browser}:{broker:DialogBroker;browser:BrowserClient}) {
  const [,render]=useState(0);useEffect(()=>broker.subscribe(()=>render(n=>n+1)),[broker]);const request=broker.current;
  if(!request)return null;
  if(request.kind==="scene")return <ScenePicker browser={browser} finish={value=>broker.finish(value)}/>;
  if(request.kind==="name")return <NameDialog request={request} finish={value=>broker.finish(value)}/>;
  if(request.kind==="discard")return <ServiceDialog title="Descartar cambios" onCancel={()=>broker.finish(null)}><p>Para guardar, cancela y vuelve a acceder como DM. Descartar retira los cambios que permanecen en memoria.</p><footer><button onClick={()=>broker.finish(null)}>Cancelar</button><button onClick={()=>broker.finish("discard")}>Descartar y cerrar sesión</button></footer></ServiceDialog>;
  return <ServiceDialog title="Cambios sin guardar" onCancel={()=>broker.finish(null)}><p>Guarda los cambios antes de continuar, o descártalos.</p><footer><button onClick={()=>broker.finish(null)}>Cancelar</button><button onClick={()=>broker.finish("discard")}>Descartar</button><button onClick={()=>broker.finish("save")}>Guardar y continuar</button></footer></ServiceDialog>;
}
