import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { TableSession } from "./table-session";
import type { ServiceDiceActor } from "./service-dice-session";
it("saturación de UUID jugador no bloquea DM ni elimina entradas antes de cinco minutos",()=>{
  let now=0;const table=new TableSession(()=>now,randomUUID);
  for(let i=0;i<20000;i++) table.once("jugador",String(i),"igual",()=>({ok:true}),"player");
  expect(()=>table.once("jugador","exceso","igual",()=>({ok:true}),"player")).toThrow();
  expect(table.once("dm","orden","dm",()=>({ok:true}))).toEqual({ok:true});
  now=299999;expect(()=>table.once("jugador","0","distinto",()=>({ok:true}),"player")).toThrow();
  now=300000;expect(table.once("jugador","nuevo","igual",()=>({ok:true}),"player")).toEqual({ok:true});
});
it("publica dados negociados por audiencia sin avanzar el canal jugador por una tirada oculta", () => {
  let now = 0; const table = new TableSession(() => now, randomUUID);
  const dm: ServiceDiceActor = { id: "owner", role: "dm", author: { kind: "dm" } };
  const player: ServiceDiceActor = { id: "11111111-1111-4111-8111-111111111111", role: "player", author: { kind: "player", publicId: "11111111-1111-4111-8111-111111111111", alias: "igual", discriminator: 1 } };
  const playerEvents: unknown[] = [], dmEvents: unknown[] = [];
  table.connect("guest", "player", event => playerEvents.push(event), player.id, false, player, true);
  table.connect("owner", "dm", event => dmEvents.push(event), undefined, false, dm, true);
  table.serviceDice.setPublishedContext({ token: "22222222-2222-4222-8222-222222222222", sceneId: "scene", mapId: "map", label: "Mesa publicada" });
  table.serviceDice.setPrivateContext(dm, { token: "private", sceneId: "draft", mapId: "draft-map", sceneName: "Privado", mapName: "Privado" });
  const playerCount = playerEvents.length;
  table.serviceDice.begin(dm, { requestId: "33333333-3333-4333-8333-333333333333", contextToken: "private", visibility: "hidden", selection: { groups: [{ id: "fire", damageType: "fire", dice: { d6: 1 }, modifier: 0 }], includeD20: false, d20Modifier: 0, appearance: { color: "ruby", material: "resin" }, force: 1, d20: null } });
  expect(playerEvents).toHaveLength(playerCount);
  expect(JSON.stringify(playerEvents)).not.toContain("private");
  expect((dmEvents.at(-1) as { type: string }).type).toBe("service-dice");
  now++;
});
