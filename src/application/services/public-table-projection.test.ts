import { describe, expect, it } from "vitest";
import { publicTableProjection } from "./public-table-projection";
import { privateFixture, refs } from "./public-table-projection.fixture";
describe("proyección pública por lista permitida",()=>{
  it("elimina secretos y recursos no publicados sin mutar el documento DM",()=>{
    const input=privateFixture(), before=JSON.stringify(input), output=publicTableProjection(input), bytes=JSON.stringify(output.snapshot);
    expect(bytes).not.toContain("SECRET"); expect(bytes).not.toContain("9811");
    expect([...output.assets].sort()).toEqual([refs[0],refs[1],refs[3],refs[5]].sort());
    expect(output.snapshot.scene.maps).toHaveLength(1); expect(output.snapshot.scene.tokens).toHaveLength(1);
    expect(output.snapshot.scene.maps[0].tokens).toEqual(output.snapshot.scene.tokens);
    expect(output.snapshot.scene.sceneAside.monsters[0].name).toBe("Ogro");
    expect(output.snapshot.scene.combatTracker.participants[0].name).toBe("Guerrero");
    expect(JSON.stringify(input)).toBe(before);
  });
  it("reconstruye vacío, ignora URLs ajenas y retira el combate latente",()=>{
    const input=privateFixture(); const result=publicTableProjection({...input,scene:{...input.scene,maps:[],activeMapId:null,combatTracker:{...input.scene.combatTracker,active:false}}});
    expect(result.snapshot.scene.maps).toEqual([]);expect(result.snapshot.mapImageUrl).toBeNull();expect(result.assets.has(refs[5])).toBe(false);
    expect(result.snapshot.scene.combatTracker.participants).toEqual([]);
  });
});
