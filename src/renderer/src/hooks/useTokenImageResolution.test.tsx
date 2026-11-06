// @vitest-environment jsdom
import { act, useState, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useTokenImageResolution } from "./useTokenImageResolution";
import { createSceneToken } from "../../../domain/tokens/tokens";

const token = (id: string, path = `${id}.png`) => createSceneToken({ id, imagePath: path, name: id, type: "npc", position: { x: 0, y: 0 }, size: "medium", tokens: [] });
const unavailable = vi.fn();
function Harness(props: Omit<Parameters<typeof useTokenImageResolution>[0], "urls" | "setUrls" | "onUnavailable">) {
  const [urls, setUrls] = useState<Readonly<Record<string, string>>>({});
  useTokenImageResolution({ ...props, urls, setUrls, onUnavailable: unavailable });
  return <output>{JSON.stringify(urls)}</output>;
}
let host: HTMLDivElement, root: Root;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); unavailable.mockClear(); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const render = async (props: ComponentProps<typeof Harness>) => { await act(async () => root.render(<Harness {...props}/>)); };

it("resuelve válidas aunque otras falten/fallen y no reintenta por mover tokens", async () => {
  const resolveTokenUrl = vi.fn(async (path: string) => { if (path === "missing.png") return null; if (path === "error.png") throw new Error("Sin red"); return `url:${path}`; });
  const props = { tokens: [token("ok"), token("missing"), token("error")], api: { resolveTokenUrl }, scope: "scene:map", active: true };
  await render(props);
  expect(JSON.parse(host.textContent!)).toEqual({ ok: "url:ok.png" });
  expect(resolveTokenUrl).toHaveBeenCalledTimes(3);
  for (let i = 0; i < 10; i++) await render({ ...props, tokens: props.tokens.map(t => ({ ...t, position: { x: i, y: 0 } })) });
  expect(resolveTokenUrl).toHaveBeenCalledTimes(3);
  expect(unavailable).toHaveBeenCalledOnce();
  await render({ ...props, tokens: [token("missing", "replacement.png")] });
  expect(resolveTokenUrl).toHaveBeenCalledTimes(4);
  expect(JSON.parse(host.textContent!).missing).toBe("url:replacement.png");
});

it("suspende carga y descarta respuestas anteriores; recuperar reintenta una vez", async () => {
  let complete!: (url: string | null) => void;
  const resolveTokenUrl = vi.fn().mockImplementationOnce(() => new Promise<string | null>(r => { complete = r; })).mockResolvedValue(null);
  const props = { tokens: [token("a")], api: { resolveTokenUrl }, scope: "scene:map", active: true };
  await render(props); await render({ ...props, active: false });
  await act(async () => complete("url:sesion-anterior"));
  expect(host.textContent).toBe("{}"); expect(unavailable).not.toHaveBeenCalled();
  await render(props); await render(props);
  expect(resolveTokenUrl).toHaveBeenCalledTimes(2); expect(unavailable).toHaveBeenCalledOnce();
  await render({ ...props, scope: "other:map" });
  expect(resolveTokenUrl).toHaveBeenCalledTimes(3);
});

it("un resultado pendiente no sobrescribe la referencia de reemplazo del mismo ID", async () => {
  let complete!: (url: string) => void;
  const resolveTokenUrl = vi.fn().mockImplementationOnce(() => new Promise<string>(r => { complete = r; })).mockResolvedValue("url:nueva");
  const props = { tokens: [token("a")], api: { resolveTokenUrl }, scope: "scene:map", active: true };
  await render(props); await render({ ...props, tokens: [token("a", "new.png")] });
  await act(async () => complete("url:vieja"));
  expect(JSON.parse(host.textContent!)).toEqual({ a: "url:nueva" });
});
