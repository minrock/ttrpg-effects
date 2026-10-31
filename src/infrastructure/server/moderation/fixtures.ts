import { randomUUID } from "node:crypto";
import { createServer, request } from "node:http";
import { accounts, cleanup, fixture, origin, secret, http, png } from "../owned/fixtures";
import { openModerationBackend } from "../../../server/moderation-backend";
import { identityDatabase } from "../identity/database";
import { createDefaultScene } from "../../../domain/sessions/default-scene";
import type { ContextualEvent } from "../../../shared/contracts/moderation";
export { cleanup, fixture, origin, secret, http, png };
export { context, expected, invitationSecret, deferred } from "../invitations/fixtures";
export async function setup(kind: "sqlite" | "postgres") {
  const config = await fixture(kind), a = await accounts(config); await a.identity.close();
  let time = Date.now(); const now = () => new Date(time);
  const backend = await openModerationBackend(config, { publicOrigin: origin, secret }, now); cleanup.push(() => backend.close());
  const unit = await identityDatabase(config); cleanup.push(() => unit.close());
  const a1 = await backend.identity.authorized(a.aCookie, "dm", (_, tx) => tx.games.create(a.a.id, "A1", { systemId: "generic", version: 1 }));
  const a2 = await backend.identity.authorized(a.aCookie, "dm", (_, tx) => tx.games.create(a.a.id, "A2", { systemId: "generic", version: 1 }));
  const b1 = await backend.identity.authorized(a.bCookie, "dm", (_, tx) => tx.games.create(a.b.id, "B1", { systemId: "dnd-55e", version: 1 }));
  const server = createServer((req, res) => { void backend.handler(req, res); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve)); const address = server.address(); if (!address || typeof address === "string") throw new Error();
  cleanup.push(() => new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); }));
  return { ...a, ...backend, config, unit, a1, a2, b1, port: address.port, now, advance(ms: number) { time += ms; }, setTime(value: number) { time = value; } };
}
export function snapshot(asset: string) {
  const base = createDefaultScene();
  const scene = { ...base, map: { ...base.map, imagePath: `asset:${asset}` }, maps: base.maps.map(map => ({ ...map, map: { ...map.map, imagePath: `asset:${asset}` } })), sceneAside: { ...base.sceneAside, notes: [{ id: randomUUID(), name: "PRIVADO_CENTINELA_010", parentId: null, content: "PRIVADO_CENTINELA_010" }] } };
  return { scene, showDmFogOverlay: false, camera: { center: { x: 10, y: 20 }, zoom: 1 }, mapImageUrl: "PRIVADO_URL_010", tokenImageUrls: {} };
}
export function stream(port: number, game: string, cookie: string, dm = false, cursor?: string) {
  const events: ContextualEvent[] = []; let bytes = "", ended = false;
  let response: import("node:http").IncomingMessage;
  let changed = () => {}; const listeners = new Set<() => void>();
  changed = () => { for (const listener of listeners) listener(); };
  const req = request({ host: "127.0.0.1", port, path: `/api/v1/${dm ? "dm/" : ""}games/${game}/table/events`, headers: { host: "localhost:8787", origin, cookie, ...(cursor ? { "Last-Event-ID": cursor } : {}) } }, res => {
    response = res; let buffer = "";
    res.on("data", chunk => { bytes += chunk; buffer += chunk; let end: number; while ((end = buffer.indexOf("\n\n")) >= 0) { const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2); const line = frame.split("\n").find(l => l.startsWith("data: ")); if (line) events.push(JSON.parse(line.slice(6))); } changed(); });
    const finish = () => { ended = true; changed(); }; res.on("end", finish); res.on("close", finish);
  }); req.on("error", () => { ended = true; changed(); }); req.end();
  const close = () => { req.destroy(); response?.destroy(); }; cleanup.push(async () => close());
  async function until(predicate: () => boolean) { if (predicate()) return; await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => { listeners.delete(check); reject(new Error("Stream no alcanzó estado esperado")); }, 10000); const check = () => { if (predicate()) { clearTimeout(timer); listeners.delete(check); resolve(); } }; listeners.add(check); }); }
  return { events, until, close, get bytes() { return bytes; }, get ended() { return ended; } };
}
