import { mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { createStaticHandler } from "./static-files";
const directories: string[] = [];
function temporary() { const directory = realpathSync(mkdtempSync(join(tmpdir(), "ttrpg-static-"))); directories.push(directory); return directory; }
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });
it("rechaza build ausente o directorio sin index al arrancar", () => {
  const root = temporary();
  expect(() => createStaticHandler(join(root,"absent"))).toThrow(/TTRPG_WEB_DIR/);
  expect(() => createStaticHandler(root)).toThrow(/index.html/);
});
it("rechaza index enlazado y acepta el build físico", () => {
  const root = temporary(), external = temporary();
  writeFileSync(join(external,"index.html"), "<!doctype html><html></html>");
  symlinkSync(join(external,"index.html"),join(root,"index.html"));
  expect(() => createStaticHandler(root)).toThrow(/enlaces/);
  rmSync(join(root,"index.html")); writeFileSync(join(root,"index.html"),"<!doctype html><html></html>");
  expect(createStaticHandler(root)).toBeTypeOf("function");
});
