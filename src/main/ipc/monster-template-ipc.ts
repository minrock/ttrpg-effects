import { ipcMain } from "electron";
import type { MonsterTemplateRepository } from "../../application/services/monster-template-repository";
import {
  deleteMonsterTemplateUseCase,
  listMonsterTemplatesUseCase,
  saveMonsterTemplateUseCase
} from "../../application/use-cases/monster-templates";
import { normalizeMonsterTemplate } from "../../domain/monster-templates/monster-template";

export function registerMonsterTemplateIpc(repository: MonsterTemplateRepository): void {
  ipcMain.handle("monster-template:list", async () => {
    try {
      return { ok: true, templates: await listMonsterTemplatesUseCase(repository) };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle("monster-template:save", async (_event, payload: unknown) => {
    try {
      const template = normalizeMonsterTemplate(payload);
      if (template === null) {
        throw new Error("Template de monstruo invalido.");
      }
      return { ok: true, templates: await saveMonsterTemplateUseCase(repository, template) };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle("monster-template:delete", async (_event, payload: unknown) => {
    try {
      if (typeof payload !== "string" || payload.trim() === "") {
        throw new Error("Id de template invalido.");
      }
      return { ok: true, templates: await deleteMonsterTemplateUseCase(repository, payload.trim()) };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo completar la operacion.";
}
