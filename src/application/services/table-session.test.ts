import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { TableSession } from "./table-session";
it("saturación de UUID jugador no bloquea DM ni elimina entradas antes de cinco minutos",()=>{
  let now=0;const table=new TableSession(()=>now,randomUUID);
  for(let i=0;i<20000;i++) table.once("jugador",String(i),"igual",()=>({ok:true}),"player");
  expect(()=>table.once("jugador","exceso","igual",()=>({ok:true}),"player")).toThrow();
  expect(table.once("dm","orden","dm",()=>({ok:true}))).toEqual({ok:true});
  now=299999;expect(()=>table.once("jugador","0","distinto",()=>({ok:true}),"player")).toThrow();
  now=300000;expect(table.once("jugador","nuevo","igual",()=>({ok:true}),"player")).toEqual({ok:true});
});
