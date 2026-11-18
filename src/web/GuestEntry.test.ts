import { expect, it, vi } from "vitest";
import { HttpTransport } from "../infrastructure/browser/http";
import { createGuestAssetResolver } from "./GuestEntry";

const assetId="11111111-1111-4111-8111-111111111111";
const gameId="22222222-2222-4222-8222-222222222222";
const openingId="33333333-3333-4333-8333-333333333333";
const response=(value:unknown)=>new Response(JSON.stringify(value),{headers:{"Content-Type":"application/json"}});

it("resuelve retratos públicos por la ruta contextual de la invitación",async()=>{
  const fetcher=vi.fn<typeof fetch>(async(path,init)=>{
    expect(String(path)).toBe(`/api/v1/games/${gameId}/assets/resolve?openingId=${openingId}&generation=7`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ids:[assetId]});
    return response({ok:true,assets:{[assetId]:`/api/v1/games/${gameId}/assets/${assetId}`}});
  });
  const resolver=createGuestAssetResolver(new HttpTransport(fetcher,()=>{},`/api/v1/games/${gameId}`),openingId,7);
  await expect(resolver(`asset:${assetId}`)).resolves.toBe(`/api/v1/games/${gameId}/assets/${assetId}`);
  await expect(resolver("https://invalid.test/portrait.png")).resolves.toBeNull();
  expect(fetcher).toHaveBeenCalledOnce();
});
