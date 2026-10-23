import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

export function createMapAssetUrl(imagePath: string): string {
  const url = new URL(pathToFileURL(imagePath).href.replace(/^file:/, "map-asset:"));
  url.searchParams.set("revision", randomUUID());
  return url.href;
}

export function mapAssetUrlToFileUrl(assetUrl: string): string {
  const url = new URL(assetUrl);
  if (url.protocol !== "map-asset:" || url.host !== "" || !url.pathname.startsWith("/")) {
    throw new Error("URL de imagen de mapa invalida.");
  }
  url.searchParams.delete("revision");
  // Changing between special and custom schemes via URL.protocol is ignored by URL.
  return new URL(url.href.replace(/^map-asset:/, "file:")).href;
}

export async function fetchMapAsset(
  assetUrl: string,
  fetchFile: (url: string, options: RequestInit) => Promise<Response>
): Promise<Response> {
  const response = await fetchFile(mapAssetUrlToFileUrl(assetUrl), { cache: "no-store" });
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
