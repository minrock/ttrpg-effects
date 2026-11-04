import { z } from "zod";

const emailSchema = z.email().max(254);
/** Diagnósticos locales sin incluir valores introducidos; la API conserva errores genéricos. */
export function emailProblem(value: unknown): string | null {
  if (typeof value !== "string" || !emailSchema.safeParse(value.trim().toLowerCase()).success)
    return "Email no válido. Escribe solo el correo (ejemplo: nombre@dominio.com), sin enlaces ni mailto:, con un máximo de 254 caracteres.";
  return null;
}
export function nameProblem(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "El nombre visible no puede estar vacío.";
  if ([...value.trim()].length > 100) return "El nombre visible admite como máximo 100 caracteres.";
  if ([...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return "El nombre visible no admite caracteres de control.";
  return null;
}
export function passwordProblem(value: unknown): string | null {
  if (typeof value !== "string") return "Introduce una contraseña de 10 a 128 caracteres.";
  if ([...value].length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if ([...value].length > 128) return "La contraseña admite como máximo 128 caracteres.";
  if (new TextEncoder().encode(value).byteLength > 512) return "La contraseña supera el máximo de 512 bytes UTF-8.";
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) return "La contraseña contiene caracteres Unicode no válidos. Escríbela de nuevo.";
  return null;
}
