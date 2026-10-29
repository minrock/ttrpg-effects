import sharp from "sharp";
import { inflateSync } from "node:zlib";
import { LIMITS } from "../../server/config";
import { HttpError, invalid } from "../../server/errors";

function dimensions(width: number, height: number): void {
  if (width < 1 || height < 1 || width * height > LIMITS.imagePixels) throw invalid("La imagen supera 40 millones de píxeles o tiene dimensiones inválidas.");
}
function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(bytes: Buffer): boolean {
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return false;
  let offset = 8; let header = false; let ended = false; let width = 0; let height = 0; let channels = 0; let depth = 0;
  const compressed: Buffer[] = [];
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset);
    if (offset + size + 12 > bytes.length) return false;
    const kind = bytes.toString("ascii", offset + 4, offset + 8);
    const chunk = bytes.subarray(offset + 8, offset + 8 + size);
    if (crc32(bytes.subarray(offset + 4, offset + 8 + size)) !== bytes.readUInt32BE(offset + 8 + size)) return false;
    if (!header && kind !== "IHDR") return false;
    if (kind === "IHDR") {
      if (header || size !== 13) return false;
      width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4); dimensions(width, height);
      depth = chunk[8]; channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[chunk[9]] ?? 0;
      const allowedDepths = ({ 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] } as Record<number, number[]>)[chunk[9]];
      // Indicar cómo convertir una variante válida que todavía no se admite.
      if (chunk[12] === 1) throw new HttpError(415, "UNSUPPORTED_IMAGE_VARIANT", "Convierte el PNG entrelazado a PNG no entrelazado, JPEG o WebP estático.");
      if (!channels || !allowedDepths?.includes(depth) || chunk[10] !== 0 || chunk[11] !== 0 || chunk[12] !== 0) return false;
      header = true;
    } else if (kind === "IDAT") compressed.push(chunk);
    else if (kind === "IEND") { if (size !== 0) return false; ended = true; offset += 12; break; }
    offset += size + 12;
  }
  if (!header || !ended || offset !== bytes.length || compressed.length === 0) return false;
  const stride = Math.ceil(width * channels * depth / 8) + 1;
  const expected = stride * height;
  // Acotar la descompresión independientemente del tamaño comprimido y los píxeles.
  if (expected > 160 * 1024 * 1024) return false;
  const decoded = inflateSync(Buffer.concat(compressed), { maxOutputLength: expected + 1 });
  if (decoded.length !== expected) return false;
  for (let row = 0; row < height; row++) if (decoded[row * stride] > 4) return false;
  return true;
}
function jpeg(bytes: Buffer): boolean {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let at = 2; let frame = false; let scan = false; let tables = false;
  while (at < bytes.length) {
    if (bytes[at++] !== 0xff) return false;
    while (bytes[at] === 0xff) at++;
    const marker = bytes[at++];
    if (marker === 0xd9) return frame && scan && tables && at === bytes.length;
    if (marker === undefined || marker === 0 || marker === 0xd8 || at + 2 > bytes.length) return false;
    const size = bytes.readUInt16BE(at);
    if (size < 2 || at + size > bytes.length) return false;
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (size < 11 || bytes[at + 2] !== 8 || size !== 8 + 3 * bytes[at + 7]) return false;
      dimensions(bytes.readUInt16BE(at + 5), bytes.readUInt16BE(at + 3)); frame = true;
    }
    if (marker === 0xdb) tables = size >= 67;
    at += size;
    if (marker === 0xda) {
      if (!frame || size < 6) return false;
      const start = at;
      while (at < bytes.length) {
        if (bytes[at] !== 0xff) { at++; continue; }
        if (bytes[at + 1] === 0 || (bytes[at + 1] >= 0xd0 && bytes[at + 1] <= 0xd7)) { at += 2; continue; }
        break;
      }
      if (at === start) return false;
      scan = true;
    }
  }
  return false;
}
function webp(bytes: Buffer): boolean {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP" || bytes.readUInt32LE(4) + 8 !== bytes.length) return false;
  let at = 12; let frame = false;
  while (at + 8 <= bytes.length) {
    const kind = bytes.toString("ascii", at, at + 4); const size = bytes.readUInt32LE(at + 4); at += 8;
    if (at + size > bytes.length) return false;
    if (kind === "VP8 ") {
      if (size < 11 || (bytes[at] & 1) || !bytes.subarray(at + 3, at + 6).equals(Buffer.from([0x9d, 1, 0x2a]))) return false;
      const firstPartition = (bytes.readUIntLE(at, 3) >>> 5);
      if (firstPartition < 1 || firstPartition + 3 > size) return false;
      dimensions(bytes.readUInt16LE(at + 6) & 0x3fff, bytes.readUInt16LE(at + 8) & 0x3fff); frame = true;
    } else if (kind === "VP8L") {
      if (size < 6 || bytes[at] !== 0x2f) return false;
      const bits = bytes.readUInt32LE(at + 1);
      if (bits >>> 29) return false;
      dimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1); frame = true;
    } else if (kind === "VP8X") {
      if (size !== 10) return false;
      if (bytes[at] & 2) throw new HttpError(415, "UNSUPPORTED_IMAGE_VARIANT", "Convierte el WebP animado a una imagen estática PNG, JPEG o WebP.");
      dimensions(bytes.readUIntLE(at + 4, 3) + 1, bytes.readUIntLE(at + 7, 3) + 1);
    } else if (!["ALPH", "ICCP", "EXIF", "XMP "].includes(kind)) return false;
    at += size + (size % 2);
  }
  return frame && at === bytes.length;
}
export async function validateImage(bytes: Buffer, declared: string): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(declared)) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Solo se admiten PNG, JPEG y WebP.");
  try {
    const valid = declared === "image/png" ? png(bytes) : declared === "image/jpeg" ? jpeg(bytes) : webp(bytes);
    if (valid) {
      // Los metadatos y el contenedor no validan el flujo comprimido de píxeles.
      // Decodificar todo el frame, descartar RGBA acotado y conservar los bytes originales.
      await sharp(bytes, { failOn: "warning", limitInputPixels: LIMITS.imagePixels,
        limitInputChannels: 4, sequentialRead: true })
        .timeout({ seconds: LIMITS.imageDecodeSeconds })
        .toColourspace("srgb").ensureAlpha().raw({ depth: "uchar" }).toBuffer();
      return declared;
    }
  } catch (error) { if (error instanceof HttpError) throw error; }
  throw invalid("La imagen está dañada, truncada o no corresponde al MIME declarado.");
}

/** Cuota por servidor; no mantener una cola ilimitada de buffers decodificados. */
export class ImageValidationService {
  private active = 0;
  async validate(bytes: Buffer, declared: string): Promise<string> {
    if (this.active >= LIMITS.imageDecodes) throw new HttpError(429, "RATE_LIMITED", "Hay imágenes en proceso. Intenta subirla de nuevo en un momento.");
    this.active++;
    try { return await validateImage(bytes, declared); }
    finally { this.active--; }
  }
}
