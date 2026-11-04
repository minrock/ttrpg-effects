import { randomBytes } from "node:crypto";
import { emailProblem, nameProblem, passwordProblem } from "../application/services/identity-validation";
import { IdentityError, type IdentityService } from "../application/services/identity";
import { PromptCancelled, type IdentityPrompts } from "./identity-prompts";
export class IdentityCommandError extends Error {}
const bootstrapCompleted = "El alta inicial ya se completó: esta base ya contiene cuentas. No se creó ningún administrador. Para recuperar el administrador existente, ejecuta pnpm identity:recover-admin con su correo; para cambiar su contraseña, usa pnpm identity:password.";
export async function runIdentityCommand(operation: string, identity: IdentityService, io: IdentityPrompts): Promise<void> {
  const field = async (label: string, problem: (value: unknown) => string | null, hidden = false): Promise<string> => {
    for (;;) {
      const value = await io.ask(label, hidden), error = problem(value);
      if (!error) return value;
      io.write(error + " Vuelve a intentarlo o pulsa Ctrl+C para cancelar.");
    }
  };
  const secret = async (label: string, onEmpty?: () => string): Promise<string> => {
    for (;;) {
      const value = await field(label, value => value === "" && onEmpty ? null : passwordProblem(value), true);
      if (value === "" && onEmpty) return onEmpty();
      const confirmation = await io.ask("Confirma la contraseña", true);
      if (value === confirmation) return value;
      io.write("Las contraseñas no coinciden. Introduce y confirma la contraseña de nuevo, o pulsa Ctrl+C para cancelar.");
    }
  };
  if (operation === "bootstrap" || operation === "create-admin") {
    if (operation === "bootstrap" && !await identity.bootstrapAvailable()) throw new IdentityCommandError(bootstrapCompleted);
    const email = await field(operation === "bootstrap" ? "Email del primer administrador" : "Email del administrador", emailProblem), name = await field("Nombre visible", nameProblem);
    let generated = false;
    const password = await secret(operation === "create-admin" ? "Contraseña (10–128 caracteres; Enter para generar una temporal)" : "Contraseña inicial (10–128 caracteres)",
      operation === "create-admin" ? () => { generated = true; return randomBytes(24).toString("base64url"); } : undefined);
    try {
      const account = operation === "bootstrap"
        ? await identity.bootstrap({ email, name, password })
        : await identity.createAdminLocal({ email, name, password }, { mustChangePassword: generated });
      if (generated) io.write(`Contraseña temporal generada (cópiala ahora): ${password}`);
      io.write(operation === "create-admin" && !generated
        ? `Administrador creado: ${account.id}. Puedes iniciar sesión con la contraseña que elegiste; no requiere cambio obligatorio.`
        : `Administrador creado: ${account.id}. Cambia la contraseña temporal al iniciar sesión o con pnpm identity:password; después podrás provisionar DMs.`);
    } catch (error) {
      if (error instanceof IdentityError && error.code === "CONFLICT") throw new IdentityCommandError(operation === "bootstrap" ? bootstrapCompleted : "Ya existe una cuenta con ese correo. No se creó ni se modificó ninguna cuenta. Usa otro correo; para recuperar un administrador existente, ejecuta pnpm identity:recover-admin.");
      throw error;
    }
    return;
  }
  if (operation === "recover-admin") {
    io.write("Recuperación local: detén el servicio antes de continuar. Se revocarán todas las sesiones del administrador existente.");
    const email = await field("Email del administrador existente", emailProblem);
    if (await io.ask("Escribe RECUPERAR para confirmar") !== "RECUPERAR") throw new PromptCancelled();
    await identity.recoverAdmin(email, await secret("Nueva contraseña temporal"));
    io.write("Administrador recuperado y sesiones revocadas. Ejecuta pnpm identity:password antes de reiniciar el servicio."); return;
  }
  if (!["provision-dm", "password"].includes(operation)) throw new Error("Comando de identidad desconocido.");
  const email = await io.ask(operation === "password" ? "Email de la cuenta" : "Email de la cuenta administradora"), password = await io.ask("Contraseña actual", true);
  let cookie: string | undefined;
  try {
    const result = await identity.login(email, password, "local-cli"); cookie = result.cookie.split(";")[0];
    if (operation === "password") {
      await identity.changePassword(cookie, password, await secret("Nueva contraseña"));
      io.write("Contraseña actualizada. Todas las sesiones fueron revocadas."); return;
    }
    if (result.identity.account.role !== "admin") throw new Error("La provisión requiere una cuenta administradora.");
    if (result.identity.account.mustChangePassword) throw new Error("Primero ejecuta pnpm identity:password para cambiar la contraseña temporal del administrador.");
    const dmEmail = await field("Email del nuevo DM", emailProblem), name = await field("Nombre visible del DM", nameProblem);
    const account = await identity.createDm(cookie, { email: dmEmail, name, password: await secret("Contraseña temporal del DM") });
    io.write(`DM creado: ${account.id}. Entrega la contraseña por un canal privado. No se envió correo; debe cambiarla al ingresar.`);
  } finally { if (cookie) await identity.logout(cookie); }
}
