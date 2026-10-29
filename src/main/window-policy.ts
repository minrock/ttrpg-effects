import type { Session, WebContents } from "electron";
import { pathToFileURL } from "node:url";
import { isLoopback, serviceOrigin } from "./electron-config";

export type NavigationPolicy = (url: string) => boolean;
export function originPolicy(origin: string): NavigationPolicy {
  return value => {
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && url.origin === origin && !url.username && !url.password; } catch { return false; }
  };
}
export function localRendererPolicy(rendererUrl: string | undefined, indexPath: string): NavigationPolicy {
  if (rendererUrl) {
    const origin = serviceOrigin(rendererUrl);
    if (!isLoopback(new URL(origin).hostname)) throw new Error("El renderer de desarrollo debe ser loopback.");
    const expected = new URL(rendererUrl).pathname;
    return value => originPolicy(origin)(value) && new URL(value).pathname === expected;
  }
  const expected = pathToFileURL(indexPath).href;
  return value => {
    try { const url = new URL(value); url.search = ""; url.hash = ""; return url.href === expected; } catch { return false; }
  };
}
const sessionPolicies = new WeakMap<Session, Map<number, NavigationPolicy>>();

export function installNavigationPolicy(contents: WebContents, allowed: NavigationPolicy): void {
  contents.on("will-navigate", (event, url) => { if (!allowed(url)) event.preventDefault(); });
  contents.on("will-redirect", (event, url) => { if (!allowed(url)) event.preventDefault(); });
  contents.on("will-frame-navigate", (event) => { if (!allowed(event.url)) event.preventDefault(); });
  contents.on("will-attach-webview", event => event.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  contents.session.setPermissionCheckHandler(() => false);
  // Cubre carga inicial y redirecciones por ventana. DevTools usa otro WebContents.
  let policies = sessionPolicies.get(contents.session);
  if (!policies) {
    policies = new Map();
    sessionPolicies.set(contents.session, policies);
    const byWindow = policies;
    contents.session.webRequest.onBeforeRequest((details, callback) => {
      const policy = details.webContentsId === undefined ? undefined : byWindow.get(details.webContentsId);
      callback({ cancel: !!policy && ["mainFrame", "subFrame"].includes(details.resourceType) && !policy(details.url) });
    });
  }
  policies.set(contents.id, allowed);
  const byWindow = policies;
  contents.once("destroyed", () => byWindow.delete(contents.id));
}
