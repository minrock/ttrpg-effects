import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createMapAssetUrl, fetchMapAsset, mapAssetUrlToFileUrl } from "./map-asset-url";

describe("map asset URLs", () => {
  it.each([
    "/maps/normal.png",
    "/maps/dungeon floor 2.png",
    "/maps/ciudad-\u00f1-\u6771\u4eac.png",
    "/maps/100% ready #1?revision=literal.png",
    "/maps/literal%20space%2Fslash%3Fquery.png",
    "/maps/map-asset: floor.png"
  ])("preserves escaped path bytes through the protocol: %s", (imagePath) => {
    const assetUrl = createMapAssetUrl(imagePath);
    const parsed = new URL(assetUrl);
    expect(parsed.protocol).toBe("map-asset:");
    expect(parsed.searchParams.get("revision")).toBeTruthy();
    const fileUrl = mapAssetUrlToFileUrl(assetUrl);
    expect(fileUrl).toBe(pathToFileURL(imagePath).href);
    expect(fileURLToPath(fileUrl)).toBe(imagePath);
  });

  it("uses a unique revision for each actual resolution of the same path", () => {
    const urls = Array.from({ length: 20 }, () => createMapAssetUrl("/maps/map.png"));
    expect(new Set(urls).size).toBe(20);
    expect(new Set(urls.map(mapAssetUrlToFileUrl)).size).toBe(1);
  });

  it("accepts legacy unversioned asset URLs and removes only revision parameters", () => {
    expect(mapAssetUrlToFileUrl("map-asset:///maps/old.png")).toBe("file:///maps/old.png");
    const fileUrl = new URL(mapAssetUrlToFileUrl("map-asset:///maps/m%3F.png?other=keep&revision=1&revision=2#anchor"));
    expect(fileUrl.pathname).toBe("/maps/m%3F.png");
    expect(fileUrl.search).toBe("?other=keep");
    expect(fileUrl.hash).toBe("#anchor");
  });

  it.each(["file:///map.png", "https://example.com/map.png", "map-asset://remote/map.png", "map-asset:relative.png", "bad url"])(
    "rejects invalid asset URLs: %s", (url) => expect(() => mapAssetUrlToFileUrl(url)).toThrow()
  );

  it("fetches fresh bytes and prevents caching while preserving response metadata", async () => {
    const fetchFile = vi.fn().mockImplementation(async () => new Response("new map bytes", {
      status: 206, statusText: "Partial Content", headers: { "Content-Type": "image/png", "Cache-Control": "max-age=3600" }
    }));
    const response = await fetchMapAsset(createMapAssetUrl("/maps/map #1.png"), fetchFile);
    expect(fetchFile).toHaveBeenCalledExactlyOnceWith("file:///maps/map%20%231.png", { cache: "no-store" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.status).toBe(206);
    expect(response.statusText).toBe("Partial Content");
    expect(await response.text()).toBe("new map bytes");
  });

  it("does not serve a cached response after a file read fails", async () => {
    const fetchFile = vi.fn().mockRejectedValue(new Error("ENOENT"));
    await expect(fetchMapAsset(createMapAssetUrl("/maps/missing.png"), fetchFile)).rejects.toThrow("ENOENT");
  });
});
