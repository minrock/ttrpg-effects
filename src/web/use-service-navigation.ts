import { useCallback, useEffect, useRef, useState } from "react";
const key = "ttrpgPosition";
function position(): number | undefined { const value: unknown = history.state?.[key]; return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined; }
/** Aceptar popstate mueve el cursor existente; solo navigate crea una entrada. */
export function useServiceNavigation(allowLeave: () => Promise<boolean>) {
  const [path, setPath] = useState(location.pathname);
  const index = useRef(position() ?? 0), busy = useRef(false), travel = useRef<null | { target:number; done:()=>void; promise:Promise<void> }>(null);
  const allow = useRef(allowLeave); allow.current = allowLeave;
  useEffect(() => { history.replaceState({ ...history.state, [key]: index.current }, "", location.href); }, []);
  const replace = useCallback((next: string) => { history.replaceState({ ...history.state, [key]: index.current }, "", next); setPath(next); }, []);
  const navigate = useCallback(async (next: string, beforeCommit?: () => void) => {
    if (busy.current) return false;
    busy.current = true;
    try { if (!await allow.current()) return false; while(travel.current)await travel.current.promise; beforeCommit?.(); index.current++; history.pushState({ [key]: index.current }, "", next); setPath(next); return true; }
    finally { busy.current = false; }
  }, []);
  useEffect(() => {
    const go = async (target: number): Promise<void> => {
      while(travel.current) await travel.current.promise;
      const current=position() ?? index.current-1;
      if(current===target)return;
      let done!:()=>void;const promise=new Promise<void>(resolve=>{done=resolve;});
      travel.current={target,done,promise};history.go(target-current);await promise;
    };
    const pop = () => {
      const next=location.pathname,target=position() ?? index.current-1;
      if(travel.current){
        if(target===travel.current.target){const {done}=travel.current;travel.current=null;done();}
        else history.go(travel.current.target-target);
        return;
      }
      if(target===index.current)return;
      if(busy.current){void go(index.current);return;}
      busy.current=true;
      void (async()=>{
        await go(index.current);
        const accepted=await allow.current();
        // Otra pulsación durante el diálogo también vuelve a la posición retenida.
        await go(index.current);
        if(accepted){await go(target);index.current=target;setPath(next);}
      })().finally(()=>{busy.current=false;});
    };
    window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop);
  }, []);
  return { path, navigate, replace };
}
