import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserTableClient } from "./table-client";
import { HttpTransport } from "./http";
import { TableSession } from "../../application/services/table-session";
import { createDefaultScene } from "../../domain/sessions/default-scene";
import { randomUUID } from "node:crypto";
import type { TableEvent } from "../../shared/contracts/table";
const clients:BrowserTableClient[]=[];
afterEach(()=>{clients.splice(0).forEach(c=>c.clear());vi.useRealTimers();});
function fixture(now=1000){
  const server=new TableSession(()=>now,randomUUID);const events:TableEvent[]=[];server.connect("player","player",e=>events.push(e));
  const controllers:ReadableStreamDefaultController<Uint8Array>[]=[];
  const fetcher=vi.fn(async()=>new Response(new ReadableStream<Uint8Array>({start(c){controllers.push(c);}}),{headers:{"content-type":"text/event-stream"}}));
  const http=new HttpTransport(fetcher),client=new BrowserTableClient(http);clients.push(client);
  const send=(event:TableEvent,index=controllers.length-1)=>controllers[index].enqueue(new TextEncoder().encode(`id: ${event.epoch}:player:${event.sequence}\nevent: table\ndata: ${JSON.stringify(event)}\n\n`));
  return {server,events,controllers,fetcher,http,client,send};
}
const flush=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
describe("adaptador SSE y ciclo de vida",()=>{
  it("un stream por cliente, desuscripción y rechazo de chunks tardíos tras logout/relogin",async()=>{
    const f=fixture(),handler=vi.fn();f.client.api.onPlayerScene(handler);f.client.start("player");await flush();expect(f.fetcher).toHaveBeenCalledTimes(1);
    f.send(f.events[0]);await flush();f.server.publish({scene:createDefaultScene(),mapImageUrl:null,tokenImageUrls:{},camera:{center:{x:1,y:2},zoom:1},showDmFogOverlay:false});
    const old=[...f.events].reverse().find(e=>e.type==="scene")!;
    // El reader resuelve después de invalidar: abort por sí solo no protege este caso.
    f.client.clear();f.http.invalidate();f.http.resume();f.client.start("player");await flush();f.send(old,0);await flush();expect(handler).not.toHaveBeenCalled();expect(f.client.getStatus().published).toBe(false);
    f.send({...f.events[0],sequence:99,state:f.server.state("player")},1);await flush();expect(handler).toHaveBeenCalledOnce();
  });
  it("no reinicia acciones duplicadas y compensa relojes desplazados",async()=>{
    vi.spyOn(Date,"now").mockReturnValue(9_000_000);const f=fixture(1000),pointer=vi.fn(),dice=vi.fn();f.client.api.onPlayerPointer(pointer);f.client.api.onDicePresentation(dice);f.client.start("player");await flush();f.send(f.events[0]);await flush();
    const event:TableEvent={...f.events[0],type:"pointer",state:undefined,sequence:5,payload:{value:{id:"p",position:{x:0,y:0},creatureSize:"medium",durationMs:5000},startedAt:0,expiresAt:3000}};
    f.send(event);f.send(event);await flush();expect(pointer).toHaveBeenCalledOnce();expect(pointer.mock.calls[0][0].durationMs).toBe(2000);
    f.send({...event,sequence:6,payload:{value:{id:"expired",position:{x:0,y:0},creatureSize:"medium",durationMs:5000},startedAt:0,expiresAt:900}});await flush();expect(pointer).toHaveBeenCalledOnce();
    const highlight=vi.fn();f.client.api.onPlayerInformationAreaHighlight(highlight);
    const area={...event,type:"highlight" as const,sequence:7,payload:{value:{id:"a",areaId:"area",areaType:"terrain",cells:[{x:0,y:0,size:50}],durationMs:5000},startedAt:0,expiresAt:3000}};
    f.send(area);f.send(area);await flush();expect(highlight).toHaveBeenCalledOnce();expect(highlight.mock.calls[0][0].durationMs).toBe(2000);
    f.send({...area,sequence:8,payload:{...area.payload,expiresAt:900}});await flush();expect(highlight).toHaveBeenCalledOnce();
    const envelope={revision:1,presentation:{rollId:"r",contextToken:"c",sceneId:"s",mapId:"m",dice:[],appearance:{color:"multi",material:"resin"},replay:{frameCount:2,stepMs:100,durationMs:100,frames:[]},result:null,critical:{dieId:"check:0"},startedAt:100,settledAt:200}};
    f.send({...event,type:"dice",sequence:9,payload:envelope});await flush();
    const shifted=dice.mock.calls.at(-1)![0].presentation;
    expect(shifted.settledAt).toBe(8_999_200);expect(shifted.startedAt).toBe(8_999_100);expect(shifted.replay).toEqual(envelope.presentation.replay);
    expect(Date.now()-shifted.settledAt).toBe(800); // El renderer recibe edad real, sin reiniciar replay/crítico.
    vi.restoreAllMocks();
  });
  it("StrictMode start/stop/start no mantiene el stream anterior ni ejecuta reportes viejos",async()=>{
    const f=fixture();const cleanup=f.client.start("player");await flush();cleanup();f.client.start("player");await flush();expect(f.fetcher).toHaveBeenCalledTimes(2);
    const state=f.events[0];f.send(state,0);await flush();expect(f.client.getStatus().phase).toBe("connecting");f.send(state,1);await flush();expect(f.client.getStatus().phase).toBe("connected");
    const unsub=f.client.api.onPlayerPointer(vi.fn());unsub();f.client.stop();expect((await f.client.api.notifyPlayerContentReady()).ok).toBe(false);
  });
});
