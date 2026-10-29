import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateImage } from "../infrastructure/server/image-validation";

it("JPEG rechaza dimensiones excesivas incluso con segmentos válidos", async () => {
  const bytes = Buffer.from(readFileSync(new URL("./fixtures/pixel.jpg", import.meta.url)));
  const frame = bytes.indexOf(Buffer.from([0xff, 0xc0]));
  expect(frame).toBeGreaterThan(0);
  bytes.writeUInt16BE(65535, frame + 5); bytes.writeUInt16BE(65535, frame + 7);
  await expect(validateImage(bytes, "image/jpeg")).rejects.toThrow("40 millones");
});
it("WebP rechaza dimensiones excesivas y contenedores manipulados", async () => {
  const bytes = Buffer.from(readFileSync(new URL("./fixtures/pixel.webp", import.meta.url)));
  expect(bytes.toString("ascii", 12, 16)).toBe("VP8 ");
  bytes.writeUInt16LE(16383, 26); bytes.writeUInt16LE(16383, 28);
  await expect(validateImage(bytes, "image/webp")).rejects.toThrow("40 millones");
  bytes.writeUInt32LE(0, 4);
  await expect(validateImage(bytes, "image/webp")).rejects.toThrow("dañada");
});

it("acota la concurrencia de decodificación sin cola y libera cupos", async () => {
  const { ImageValidationService } = await import("../infrastructure/server/image-validation");
  const service = new ImageValidationService();
  const bytes = readFileSync(new URL("./fixtures/pixel.webp", import.meta.url));
  const first = service.validate(bytes, "image/webp");
  const second = service.validate(bytes, "image/webp");
  await expect(service.validate(bytes, "image/webp")).rejects.toMatchObject({ status: 429 });
  await Promise.all([first, second]);
  await expect(service.validate(bytes, "image/webp")).resolves.toBe("image/webp");
  await expect(service.validate(Buffer.from("incorrecto"), "image/webp")).rejects.toMatchObject({ status: 422 });
  await expect(service.validate(bytes, "image/webp")).resolves.toBe("image/webp");
});
