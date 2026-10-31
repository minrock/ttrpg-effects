import { z } from "zod";
import { HttpTransport, ServiceError } from "./http";
/** Retains uncertain operation keys. Never changes payload/preconditions while retrying. */
export class Mutations {
  private uncertain = new Map<string,string>();
  constructor(readonly http:HttpTransport) {}
  async send<T>(path:string,schema:z.ZodType<T>,method:string,payload:unknown,revision?:number) {
    const fingerprint=JSON.stringify([path,method,payload,revision]);
    const key=this.uncertain.get(fingerprint)??crypto.randomUUID(); this.uncertain.set(fingerprint,key);
    try { const response=await this.http.request(path,schema,{method,headers:{"Content-Type":"application/json","Idempotency-Key":key,...(revision===undefined?{}:{"If-Match":String(revision)})},body:JSON.stringify(payload)});this.uncertain.delete(fingerprint);return response; }
    catch(error){if(error instanceof ServiceError && ![0,429,503].includes(error.status))this.uncertain.delete(fingerprint);throw error;}
  }
  clear(){this.uncertain.clear();}
}
