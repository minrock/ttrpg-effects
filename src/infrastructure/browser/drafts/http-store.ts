import { z } from "zod";
import type { DraftRemote } from "../../../application/services/draft-store";
import { draftHeadSchema, draftReplySchema } from "../../../domain/drafts/draft";
import { HttpTransport, ServiceError } from "../http";
import { Mutations } from "../mutations";
const ok=z.literal(true), head=z.object({ok,draft:draftHeadSchema});
export function httpDraftStore(http:HttpTransport, prefix=""):DraftRemote {
  const mutations=new Mutations(http);
  const request=<T>(path:string,schema:z.ZodType<T>,init?:RequestInit)=>http.request(prefix+path,schema,init);
  return {
    capabilities:async()=>{try{return await request('/draft-capabilities',z.object({ok,version:z.literal(1),instanceId:z.uuid()}));}catch(error){if(error instanceof ServiceError&&error.status===404)return null;throw error;}},
    list:(gameId,offset=0)=>request(`/drafts?${new URLSearchParams({...(gameId?{gameId}:{}),offset:String(offset)})}`,z.object({ok,drafts:z.array(draftHeadSchema),total:z.number()})),
    get:(id,revision)=>request(`/drafts/${z.uuid().parse(id)}${revision?`?revision=${revision}`:''}`,draftReplySchema),
    create:async(context,key)=>(await request(`/games/${context.gameId}/drafts`,head,{method:'POST',body:JSON.stringify(context),headers:{'Content-Type':'application/json','Idempotency-Key':key}})).draft,
    put:async(id,revision,key,input)=>(await request(`/drafts/${id}`,head,{method:'PUT',body:JSON.stringify(input),headers:{'Content-Type':'application/json','Idempotency-Key':key,'If-Match':String(revision)}})).draft,
    remove:async(id,revision)=>{await mutations.send(`${prefix}/drafts/${id}`,z.object({ok}),'DELETE',{},revision);}
  };
}
