// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { selectBrowserFile, downloadScene } from "./files";
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();document.body.replaceChildren();});
it("selector cancelado o abortado retira input/listeners y no devuelve archivo",async()=>{
 vi.spyOn(HTMLInputElement.prototype,"click").mockImplementation(()=>{});
 const selected=selectBrowserFile("image/png");const input=document.querySelector("input")!;input.dispatchEvent(new Event("cancel"));expect(await selected).toBeNull();expect(document.querySelector("input")).toBeNull();
 const abort=new AbortController();const next=selectBrowserFile(".ttrpgscene",abort.signal);abort.abort();expect(await next).toBeNull();expect(document.querySelector("input")).toBeNull();
 const already=new AbortController();already.abort();expect(await selectBrowserFile("image/png",already.signal)).toBeNull();
});
it("exporta mediante enlace de descarga y revoca URL temporal sin persistirla",()=>{
 vi.useFakeTimers();const create=vi.fn(()=>"blob:temporal"),revoke=vi.fn();Object.defineProperties(URL,{createObjectURL:{configurable:true,value:create},revokeObjectURL:{configurable:true,value:revoke}});let captured="";vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(function(this:HTMLAnchorElement){captured=this.download;expect(this.href).toBe("blob:temporal");});downloadScene('{"version":2}',"Mesa / segura");expect(captured).toBe("Mesa _ segura.ttrpgscene");expect(document.querySelector("a")).toBeNull();vi.runAllTimers();expect(revoke).toHaveBeenCalledWith("blob:temporal");
});
