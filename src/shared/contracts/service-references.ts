/** Referencias del servicio; nunca rutas ni URLs proporcionadas por un documento. */
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function sceneReference(id: string): string { if (!uuid.test(id)) throw new Error("ID de escena inválido."); return `scene:${id}`; }
export function sceneId(reference: string): string {
  const id = reference.startsWith("scene:") ? reference.slice(6) : "";
  if (!uuid.test(id)) throw new Error("Selecciona una escena del servicio para reparar este enlace.");
  return id;
}
export function assetUrl(reference: string): string | null {
  const id = reference.startsWith("asset:") ? reference.slice(6) : "";
  return uuid.test(id) ? `/api/v1/assets/${id}` : null;
}
export function isServiceAssetUrl(url: string): boolean { return url.startsWith("/api/v1/assets/") && assetUrl(`asset:${url.slice(15)}`) === url; }
