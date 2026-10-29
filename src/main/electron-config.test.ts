import { describe, expect, it } from "vitest";
import { readElectronConfig, serviceOrigin } from "./electron-config";
import { localRendererPolicy, originPolicy } from "./window-policy";

describe("Configuración de modos Electron", () => {
  it("usa modo local por defecto aunque haya URL de servicio o renderer", () => {
    expect(readElectronConfig({ TTRPG_SERVICE_URL: "https://remote.example", ELECTRON_RENDERER_URL: "https://evil.example" })).toEqual({ mode: "local" });
    expect(() => readElectronConfig({ TTRPG_ELECTRON_MODE: "remote" })).toThrow();
    expect(() => readElectronConfig({ TTRPG_ELECTRON_MODE: "service" })).toThrow();
  });
  it.each([
    ["http://localhost:8787/", "http://localhost:8787"], ["http://127.2.3.4", "http://127.2.3.4"],
    ["http://[0:0:0:0:0:0:0:1]:8787", "http://[::1]:8787"], ["http://2130706433", "http://127.0.0.1"],
    ["https://MESA.EXAMPLE:443/", "https://mesa.example"], ["https://mesa.example:8443", "https://mesa.example:8443"]
  ])("normaliza %s", (input, expected) => expect(serviceOrigin(input)).toBe(expected));
  it.each([undefined, "", "relative", "file:///tmp/a", "data:text/html,hello", "javascript:alert(1)", "map-asset:///a",
    "http://localhost.example", "http://localhost.", "http://192.168.1.2", "http://128.0.0.1", "http://[::2]", "http://[::ffff:127.0.0.1]",
    "https://user:secret@mesa.example", "https://mesa.example/api/v1", "https://mesa.example?key=secret", "https://mesa.example#", "https://mesa.example?"])("rechaza %s", input => expect(() => serviceOrigin(input)).toThrow());
  it("compara el origen completo y bloquea hosts engañosos, puertos y protocolos distintos", () => {
    const allowed = originPolicy("https://mesa.example:8443");
    expect(allowed("https://mesa.example:8443/?view=player")).toBe(true);
    for (const url of ["https://mesa.example", "http://mesa.example:8443", "https://mesa.example.evil:8443", "file:///tmp/a", "data:text/html,a", "blob:https://mesa.example:8443/id", "https://u@mesa.example:8443"]) expect(allowed(url)).toBe(false);
  });
  it("limita páginas locales con query jugador y rechaza renderer de desarrollo remoto", () => {
    const local = localRendererPolicy(undefined, "/tmp/app/index.html");
    expect(local("file:///tmp/app/index.html?view=player")).toBe(true);
    expect(local("file:///tmp/other.html")).toBe(false);
    expect(local("https://mesa.example")).toBe(false);
    const dev = localRendererPolicy("http://localhost:5173", "unused");
    expect(dev("http://localhost:5173/?view=player")).toBe(true);
    expect(dev("http://localhost:5173/other.html")).toBe(false);
    expect(() => localRendererPolicy("https://mesa.example", "unused")).toThrow();
  });
});
