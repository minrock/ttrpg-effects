import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ localEvaluated: vi.fn(), local: vi.fn(), service: vi.fn(), protocol: vi.fn(), error: vi.fn(), quit: vi.fn() }));
vi.mock("electron", () => ({ app: { setName: vi.fn(), whenReady: () => Promise.resolve(), on: vi.fn(), quit: mocks.quit }, dialog: { showErrorBox: mocks.error }, protocol: { registerSchemesAsPrivileged: mocks.protocol } }));
vi.mock("./local-app", () => { mocks.localEvaluated(); return { startLocal: mocks.local }; });
vi.mock("./service-app", () => ({ startService: mocks.service }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
afterEach(() => vi.unstubAllEnvs());
it("compone servicio sin evaluar infraestructura local ni registrar su protocolo", async () => {
  vi.stubEnv("TTRPG_ELECTRON_MODE", "service"); vi.stubEnv("TTRPG_SERVICE_URL", "https://mesa.example");
  await import("./index"); await vi.waitFor(() => expect(mocks.service).toHaveBeenCalledWith("https://mesa.example"));
  expect(mocks.localEvaluated).not.toHaveBeenCalled(); expect(mocks.local).not.toHaveBeenCalled(); expect(mocks.protocol).not.toHaveBeenCalled();
});
it("selecciona local y registra su protocolo antes del arranque", async () => {
  vi.stubEnv("TTRPG_ELECTRON_MODE", "local");
  await import("./index"); await vi.waitFor(() => expect(mocks.local).toHaveBeenCalledOnce());
  expect(mocks.protocol).toHaveBeenCalledOnce(); expect(mocks.service).not.toHaveBeenCalled();
});
it("configuración inválida muestra error y sale sin fallback privilegiado", async () => {
  vi.stubEnv("TTRPG_ELECTRON_MODE", "service"); vi.stubEnv("TTRPG_SERVICE_URL", "file:///tmp/index.html");
  await import("./index"); await vi.waitFor(() => expect(mocks.quit).toHaveBeenCalled());
  expect(mocks.error).toHaveBeenCalled(); expect(mocks.local).not.toHaveBeenCalled(); expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.protocol).not.toHaveBeenCalled();
});
