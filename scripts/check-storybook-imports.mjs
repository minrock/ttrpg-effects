import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const directories = [join(root, ".storybook"), join(root, "src/stories")];
const forbidden = [
  /from\s+["'][^"']*(?:\/App|\/PlayerApp|\/ServiceApp|\/GameEditor|\/LiveEditor|\/MapViewport|\/DiceOverlay|\/PublishedDrawingPreview|\/SharedDrawingPanel|\/ui-lab|\/infrastructure\/server)[^"']*["']/,
  /from\s+["'][^"']*(?:pixi\.js|three|electron)[^"']*["']/
];

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(join(directory, entry.name)) : Promise.resolve([join(directory, entry.name)])))).flat();
}

const sources = (await Promise.all(directories.map(files))).flat().filter(file => /\.(?:ts|tsx|mdx)$/.test(file));
const violations = [];
for (const source of sources) {
  const text = await readFile(source, "utf8");
  if (forbidden.some(pattern => pattern.test(text))) violations.push(source.slice(root.length));
}

if (violations.length > 0) throw new Error(`Storybook no puede importar entradas o motores excluidos:\n${violations.join("\n")}`);
