import { describe, expect, it, vi } from "vitest";
import { IdentityError, type IdentityService } from "../application/services/identity";
import { runIdentityCommand } from "./identity-commands";
import { PromptCancelled } from "./identity-prompts";

function fixture(answers: string[], available = true) {
  const bootstrap = vi.fn().mockResolvedValue({ id: "admin-id" });
  // Solo el subconjunto usado por bootstrap; cualquier otro acceso debe fallar.
  const createAdminLocal = vi.fn().mockResolvedValue({ id: "admin-extra" });
  const identity = { createAdminLocal, bootstrapAvailable: vi.fn().mockResolvedValue(available), bootstrap } as unknown as IdentityService;
  let index = 0;
  const io = {
    ask: vi.fn<(label: string, hidden?: boolean) => Promise<string>>(async () => {
      if (index >= answers.length) throw new PromptCancelled();
      return answers[index++];
    }),
    write: vi.fn<(message: string) => void>()
  };
  return { identity, bootstrap, createAdminLocal, io };
}

describe("alta local con diagnósticos recuperables", () => {
  it("corrige cada campo y la confirmación sin revelar contraseñas ni enviar datos inválidos", async () => {
    const password = " una contraseña válida ";
    const f = fixture(["[correo](mailto:a@b.com)", "lmoncarisg@gmail.com", " ", "Luis Moncaris", "corta", password, "otra", password, password]);
    await runIdentityCommand("bootstrap", f.identity, f.io);
    expect(f.bootstrap).toHaveBeenCalledExactlyOnceWith({ email: "lmoncarisg@gmail.com", name: "Luis Moncaris", password });
    const output = f.io.write.mock.calls.flat().join("\n");
    for (const message of ["Email no válido", "nombre visible no puede estar vacío", "al menos 10 caracteres", "contraseñas no coinciden", "Administrador creado"]) expect(output).toContain(message);
    for (const secret of [password, "corta", "otra"]) expect(output).not.toContain(secret);
    for (const [label, hidden] of f.io.ask.mock.calls) if (/contraseña/i.test(label)) expect(hidden).toBe(true);
  });
  it("informa antes de pedir datos si el alta ya existe", async () => {
    const f = fixture([], false);
    await expect(runIdentityCommand("bootstrap", f.identity, f.io)).rejects.toThrow("pnpm identity:recover-admin");
    expect(f.io.ask).not.toHaveBeenCalled();
    expect(f.bootstrap).not.toHaveBeenCalled();
  });
  it("explica también un conflicto ocurrido después de la comprobación previa", async () => {
    const f = fixture(["admin@example.com", "Admin", "contraseña temporal válida", "contraseña temporal válida"]);
    f.bootstrap.mockRejectedValue(new IdentityError("CONFLICT"));
    await expect(runIdentityCommand("bootstrap", f.identity, f.io)).rejects.toThrow("El alta inicial ya se completó");
  });
  it("cancelar durante una corrección no crea ninguna cuenta", async () => {
    const f = fixture(["admin@example.com", "Admin", "corta"]);
    await expect(runIdentityCommand("bootstrap", f.identity, f.io)).rejects.toBeInstanceOf(PromptCancelled);
    expect(f.bootstrap).not.toHaveBeenCalled();
  });
});


describe("administradores adicionales por CLI local", () => {
  it("permite altas adicionales sin consultar si el bootstrap está disponible", async () => {
    const password = "Prueba1234";
    const f = fixture(["extra@example.com", "Otro administrador", password, password], false);
    await runIdentityCommand("create-admin", f.identity, f.io);
    expect(f.createAdminLocal).toHaveBeenCalledExactlyOnceWith({ email: "extra@example.com", name: "Otro administrador", password }, { mustChangePassword: false });
    expect(f.identity.bootstrapAvailable).not.toHaveBeenCalled();
    expect(f.bootstrap).not.toHaveBeenCalled();
  });
  it("explica correo duplicado sin sugerir que solo puede haber un administrador", async () => {
    const password = "Prueba1234";
    const f = fixture(["extra@example.com", "Otro administrador", password, password]);
    f.createAdminLocal.mockRejectedValue(new IdentityError("CONFLICT"));
    await expect(runIdentityCommand("create-admin", f.identity, f.io)).rejects.toThrow("Ya existe una cuenta con ese correo");
  });
});


describe("contraseña administrativa elegida o generada", () => {
  it("Enter genera una contraseña aleatoria y la muestra solo tras crear la cuenta", async () => {
    const f = fixture(["nuevo@example.com", "Admin", ""]);
    await runIdentityCommand("create-admin", f.identity, f.io);
    const [input, options] = f.createAdminLocal.mock.calls[0];
    expect(input.password).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(options).toEqual({ mustChangePassword: true });
    expect(f.io.ask.mock.calls).toHaveLength(3);
    const messages = f.io.write.mock.calls.flat();
    expect(messages.filter(message => message.includes(input.password))).toHaveLength(1);
    expect(f.createAdminLocal.mock.invocationCallOrder[0]).toBeLessThan(f.io.write.mock.invocationCallOrder[0]);
    expect(messages.join(" ")).toContain("Cambia la contraseña temporal");
    const other = fixture(["otro@example.com", "Admin", ""]);
    await runIdentityCommand("create-admin", other.identity, other.io);
    expect(other.createAdminLocal.mock.calls[0][0].password).not.toBe(input.password);
  });
  it("no muestra la contraseña generada si falla el alta", async () => {
    const f = fixture(["duplicado@example.com", "Admin", ""]);
    f.createAdminLocal.mockRejectedValue(new IdentityError("CONFLICT"));
    await expect(runIdentityCommand("create-admin", f.identity, f.io)).rejects.toThrow("Ya existe una cuenta");
    expect(f.io.write).not.toHaveBeenCalled();
  });
  it("una contraseña elegida no se imprime ni exige cambio y espacios no generan automáticamente", async () => {
    const password = "Prueba1234";
    const f = fixture(["manual@example.com", "Admin", " ", password, password]);
    await runIdentityCommand("create-admin", f.identity, f.io);
    expect(f.createAdminLocal).toHaveBeenCalledExactlyOnceWith({ email: "manual@example.com", name: "Admin", password }, { mustChangePassword: false });
    const output = f.io.write.mock.calls.flat().join(" ");
    expect(output).toContain("no requiere cambio obligatorio");
    expect(output).not.toContain(password);
    expect(output).not.toContain("temporal generada");
  });
});
