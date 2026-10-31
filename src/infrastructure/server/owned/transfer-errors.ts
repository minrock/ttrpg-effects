import { SystemError } from "../../../application/services/system-catalog";
import { ZodError } from "zod";
import { ApplicationError } from "../../../application/services/application-error";
import { OwnedError } from "../../../application/services/owned-store";
import type { TransactionOutcome } from "../identity/database";
export type DataCode = "USAGE" | "PATH_MISSING" | "PATH_UNSAFE" | "WRITER_ACTIVE" | "OWNER_INVALID" | "TARGET_OCCUPIED" | "CORRUPT" | "TEMPLATE_MISSING" | "CANCELLED" | "UNAVAILABLE";
const messages: Record<DataCode, string> = {
  USAGE: "Comando o argumentos inválidos. Consulta el uso y corrige las opciones.",
  PATH_MISSING: "Falta una ruta o archivo requerido. Comprueba el directorio de entrada y el paquete completo.",
  PATH_UNSAFE: "La ruta no cumple los requisitos privados o físicos. Revisa permisos, enlaces y límites.",
  WRITER_ACTIVE: "Hay un lock de escritor. Detén limpiamente la API fuente; no borres el lock de un proceso vivo.",
  OWNER_INVALID: "La asignación de propietarios no es válida. Elige DM activos y un mapa completo e inyectivo; para legado indica una partida.",
  TARGET_OCCUPIED: "El destino ya existe o contiene datos funcionales. Elige un destino nuevo y vacío; no borres datos para reintentar.",
  CORRUPT: "El paquete o los datos son incompatibles o están dañados. Conserva el respaldo y repara o vuelve a exportar la fuente antes de reintentar.",
  TEMPLATE_MISSING: "Un monstruo referencia una plantilla ausente. Repara explícitamente esa referencia en una copia de la fuente y genera otro respaldo antes de exportar.",
  CANCELLED: "Operación cancelada por el operador.",
  UNAVAILABLE: "No se pudo completar la operación. Comprueba conexión, permisos y disponibilidad antes de reintentar."
};
export class DataError extends ApplicationError {
  constructor(readonly code: DataCode, readonly outcome?: TransactionOutcome) { super(messages[code]); }
}
/** Solo categorías conocidas; nunca imprimir mensajes externos, SQL, rutas o URLs. */
export function dataFailure(error: unknown, outcome?: TransactionOutcome): DataError {
  if (error instanceof DataError) return new DataError(error.code, outcome ?? error.outcome);
  const code = error instanceof SystemError ? "CORRUPT" : error instanceof OwnedError ? error.code === "CORRUPT" ? "CORRUPT" : error.code === "VALIDATION" ? "PATH_UNSAFE" : "UNAVAILABLE"
    : error instanceof ZodError || error instanceof SyntaxError ? "CORRUPT"
    : error !== null && typeof error === "object" && "code" in error ? ({ ENOENT: "PATH_MISSING", ENOTDIR: "PATH_MISSING", EEXIST: "TARGET_OCCUPIED", EACCES: "PATH_UNSAFE", EPERM: "PATH_UNSAFE", ELOOP: "PATH_UNSAFE" } as const)[String(error.code) as "ENOENT"] ?? "UNAVAILABLE" : "UNAVAILABLE";
  return new DataError(code, outcome);
}
export function dataDiagnostic(error: unknown): string {
  const failure = dataFailure(error);
  return `[${failure.code}] ${failure.message}` + (failure.outcome === "rolled_back" ? " Rollback confirmado: la importación no se confirmó; el destino conserva su estado previo. Corrige la causa y reintenta con el mismo paquete y asignación." : failure.outcome === "uncertain" ? " Estado incierto: no se puede afirmar rollback ni éxito. Conserva fuente y respaldo; ejecuta verify y repite import con el mismo paquete y asignación para consultar su registro idempotente antes de cambiar de destino." : " No se afirma una importación confirmada. Consulta docs/owned-data.md.");
}
