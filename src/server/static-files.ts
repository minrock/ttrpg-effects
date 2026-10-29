import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpError, missing } from "./errors";
const types:Record<string,string>={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".gif":"image/gif",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".woff2":"font/woff2",".mp3":"audio/mpeg",".ogg":"audio/ogg",".json":"application/json"};
export function createStaticHandler(directory:string) {
  let root: string;
  try {
    root=realpathSync(directory);
    const index=join(root,"index.html");
    if(root!==resolve(directory)||!lstatSync(root).isDirectory()||realpathSync(index)!==index||!lstatSync(index).isFile()||lstatSync(index).isSymbolicLink())throw new Error();
    readFileSync(index);
  } catch { throw new Error("TTRPG_WEB_DIR debe contener un build web legible con index.html, en un directorio físico sin enlaces simbólicos."); }
  return (req:IncomingMessage,res:ServerResponse,path:string):void=>{
    if(!["GET","HEAD"].includes(req.method??"GET"))throw new HttpError(405,"METHOD_NOT_ALLOWED","Método no disponible.");
    if(path.split("/").some(part=>part.startsWith("."))||path.includes("\\")||path.includes("\0"))throw missing();
    let file=join(root,path);
    const allowed=(candidate:string)=>{try{return realpathSync(candidate).startsWith(root+sep)&&lstatSync(candidate).isFile()&&!lstatSync(candidate).isSymbolicLink();}catch{return false;}};
    if(!allowed(file)){
      if(path.startsWith("/assets/")||extname(path)||!req.headers.accept?.includes("text/html"))throw missing();
      file=join(root,"index.html");
    }
    if(!allowed(file)||!types[extname(file)])throw missing();
    res.setHeader("Content-Type",types[extname(file)]);
    res.setHeader("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const bytes=readFileSync(file);res.setHeader("Content-Length",bytes.length);res.end(req.method==="HEAD"?undefined:bytes);
  };
}
