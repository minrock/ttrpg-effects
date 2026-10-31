import type { IdentityService } from "../application/services/identity";
import { PromptCancelled, type IdentityPrompts } from "./identity-prompts";
export async function runIdentityCommand(operation: string, identity: IdentityService, io: IdentityPrompts): Promise<void> {
  const secret = async (label: string) => {
    const value = await io.ask(label, true), confirmation = await io.ask("Confirma la contraseña", true);
    if (value !== confirmation) throw new Error("Las contraseñas no coinciden. Vuelve a ejecutar el comando.");
    return value;
  };
  if (operation === "bootstrap") {
    const email = await io.ask("Email del primer administrador"), name = await io.ask("Nombre visible");
    const account = await identity.bootstrap({ email, name, password: await secret("Contraseña inicial (15–128 caracteres)") });
    io.write(`Administrador creado: ${account.id}. Ejecuta pnpm identity:password para cambiar la contraseña temporal; después podrás provisionar DMs.`); return;
  }
  if (operation === "recover-admin") {
    io.write("Recuperación local: detén el servicio antes de continuar. Se revocarán todas las sesiones del administrador existente.");
    const email = await io.ask("Email del administrador existente");
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
    const dmEmail = await io.ask("Email del nuevo DM"), name = await io.ask("Nombre visible del DM");
    const account = await identity.createDm(cookie, { email: dmEmail, name, password: await secret("Contraseña temporal del DM") });
    io.write(`DM creado: ${account.id}. Entrega la contraseña por un canal privado. No se envió correo; debe cambiarla al ingresar.`);
  } finally { if (cookie) await identity.logout(cookie); }
}
