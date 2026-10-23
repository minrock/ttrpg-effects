import type { BrowserWindow } from "electron";
import { constants } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ElectronMapImageStorage } from "./electron-map-image-storage";

const mocks = vi.hoisted(() => ({ showOpenDialog: vi.fn(), access: vi.fn(), stat: vi.fn() }));
vi.mock("electron", () => ({ BrowserWindow: class {}, dialog: { showOpenDialog: mocks.showOpenDialog } }));
vi.mock("node:fs/promises", () => ({ access: mocks.access, stat: mocks.stat }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ["/maps/map.png"] });
  mocks.access.mockResolvedValue(undefined);
  mocks.stat.mockResolvedValue({ isFile: () => true });
});

describe("replacement map image selection", () => {
  it("uses the DM window, replacement title and current format allowlist", async () => {
    const window = {} as BrowserWindow;
    const storage = new ElectronMapImageStorage(() => window);
    const result = await storage.selectReplacementMapImage();
    expect(mocks.showOpenDialog).toHaveBeenCalledWith(window, {
      title: "Actualizar imagen del mapa", properties: ["openFile"],
      filters: [{ name: "Map Images", extensions: ["png", "jpg", "jpeg", "webp", "heic"] }]
    });
    expect(mocks.access).toHaveBeenCalledWith("/maps/map.png", constants.R_OK);
    expect(mocks.stat).toHaveBeenCalledWith("/maps/map.png");
    expect(result).toEqual({ status: "ready", imagePath: "/maps/map.png", imageUrl: expect.stringContaining("?revision=") });
  });

  it.each([
    { canceled: true, filePaths: ["/maps/map.png"] },
    { canceled: false, filePaths: [] }
  ])("returns cancellation without reading a file: %j", async (selection) => {
    mocks.showOpenDialog.mockResolvedValue(selection);
    expect(await new ElectronMapImageStorage(() => null).selectReplacementMapImage()).toEqual({ status: "cancelled" });
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.stat).not.toHaveBeenCalled();
  });

  it.each(["png", "JPG", "jpeg", "webp", "HEIC"])("accepts supported extension %s", async (extension) => {
    mocks.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [`/maps/map.${extension}`] });
    expect(await new ElectronMapImageStorage(() => null).selectReplacementMapImage()).toMatchObject({ status: "ready" });
  });

  it.each(["gif", "svg", "exe", ""])("rejects unsupported extension %s before accessing the file", async (extension) => {
    mocks.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [`/maps/map.${extension}`] });
    expect(await new ElectronMapImageStorage(() => null).selectReplacementMapImage()).toEqual({
      status: "error", error: "Formato de imagen no soportado."
    });
    expect(mocks.access).not.toHaveBeenCalled();
  });

  it.each(["EACCES", "ENOENT"])("returns a recoverable error for %s", async (code) => {
    mocks.access.mockRejectedValue(new Error(code));
    expect(await new ElectronMapImageStorage(() => null).selectReplacementMapImage()).toMatchObject({ status: "error" });
  });

  it("rejects directories and other non-regular files", async () => {
    mocks.stat.mockResolvedValue({ isFile: () => false });
    const storage = new ElectronMapImageStorage(() => null);
    expect(await storage.selectReplacementMapImage()).toMatchObject({ status: "error" });
    expect(await storage.resolveMapUrl("/maps/map.png")).toBeNull();
  });

  it("handles native dialog failures", async () => {
    mocks.showOpenDialog.mockRejectedValue(new Error("window destroyed"));
    expect(await new ElectronMapImageStorage(() => null).selectReplacementMapImage()).toMatchObject({ status: "error" });
  });

  it("returns new URLs on repeated selections and normal resolutions", async () => {
    const storage = new ElectronMapImageStorage(() => null);
    const first = await storage.selectReplacementMapImage();
    const second = await storage.selectReplacementMapImage();
    const resolved = [await storage.resolveMapUrl("/maps/map.png"), await storage.resolveMapUrl("/maps/map.png")];
    expect(first.status).toBe("ready");
    expect(second.status).toBe("ready");
    if (first.status !== "ready" || second.status !== "ready") return;
    expect(new Set([first.imageUrl, second.imageUrl, ...resolved]).size).toBe(4);
  });

  it("keeps the openMapImage result contract and original title", async () => {
    const storage = new ElectronMapImageStorage(() => null);
    expect(await storage.openMapImage()).toMatchObject({ ok: true, imagePath: "/maps/map.png" });
    expect(mocks.showOpenDialog).toHaveBeenCalledWith(expect.objectContaining({ title: "Cargar mapa" }));
    mocks.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    expect(await storage.openMapImage()).toEqual({ ok: false, error: "Carga de mapa cancelada." });
  });

  it("preserves stable token URLs", async () => {
    const storage = new ElectronMapImageStorage(() => null);
    expect(await storage.resolveTokenUrl("/tokens/token.png")).toBe("map-asset:///tokens/token.png");
    expect(await storage.openTokenImage()).toEqual({ ok: true, imagePath: "/maps/map.png", imageUrl: "map-asset:///maps/map.png" });
  });
});
