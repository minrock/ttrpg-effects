import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import console from "node:console";

// Offline asset preparation only; sharp is not an application dependency.
const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP_MODULE_PATH ?? "sharp");
const source = fileURLToPath(new URL("../assets/effects/fiya2-original.gif", import.meta.url));
const atlasPath = fileURLToPath(new URL("../src/renderer/public/effects/fiya2-preview.png", import.meta.url));
const metadataPath = fileURLToPath(new URL("../src/render/pixi/fire-preview-atlas.json", import.meta.url));
const metadata = await sharp(source, { animated: true }).metadata();
const width = metadata.width;
const height = metadata.pageHeight;
const count = metadata.pages;
if (!width || !height || !count) throw new Error("Expected an animated GIF.");
const pixels = await sharp(source, { animated: true }).ensureAlpha().raw().toBuffer();
let left = width;
let top = height;
let right = 0;
let bottom = 0;
// Use the same crop for every frame to preserve the original motion/registration.
for (let frame = 0; frame < count; frame++) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[((frame * height + y) * width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
}
const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
const frameWidth = 128;
const frameHeight = 160;
const gutter = 2;
const columns = 8;
const composites = [];
const frames = [];
for (let index = 0; index < count; index++) {
  const framePixels = pixels.subarray(index * width * height * 4, (index + 1) * width * height * 4);
  const input = await sharp(framePixels, { raw: { width, height, channels: 4 } })
    .extract(crop)
    .resize(frameWidth, frameHeight, { fit: "contain", background: "#00000000" })
    .png()
    .toBuffer();
  const x = (index % columns) * (frameWidth + gutter * 2) + gutter;
  const y = Math.floor(index / columns) * (frameHeight + gutter * 2) + gutter;
  composites.push({ input, left: x, top: y });
  frames.push({ x, y, width: frameWidth, height: frameHeight, durationMs: metadata.delay[index] || 40 });
}
const atlasWidth = columns * (frameWidth + gutter * 2);
const atlasHeight = Math.ceil(count / columns) * (frameHeight + gutter * 2);
await sharp({ create: { width: atlasWidth, height: atlasHeight, channels: 4, background: "#00000000" } })
  .composite(composites)
  .png()
  .toFile(atlasPath);
await writeFile(metadataPath, `${JSON.stringify({ width: atlasWidth, height: atlasHeight, crop, frames }, null, 2)}\n`);
console.log({ atlasPath, frames: count, crop, decodedMiB: atlasWidth * atlasHeight * 4 / 1048576 });
