import { randomUUID } from "node:crypto";
import { ipcMain } from "electron";
import type { MonsterLibraryRepository } from "../../application/services/monster-library-repository";
import {
  getMonsterLibraryEntryUseCase,
  saveMonsterLibraryEntryUseCase,
  searchMonsterLibraryUseCase
} from "../../application/use-cases/monster-library";

export function registerMonsterLibraryIpc(repository: MonsterLibraryRepository): void {
  ipcMain.handle("monster-library:search", async (_event, payload: unknown) => {
    try {
      return { ok: true, entries: await searchMonsterLibraryUseCase(repository, payload) };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle("monster-library:get", async (_event, payload: unknown) => {
    try {
      if (typeof payload !== "string" || payload.trim() === "") {
        throw new Error("Id de monstruo invalido.");
      }
      const entry = await getMonsterLibraryEntryUseCase(repository, payload.trim());
      return { ok: true, entry };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle("monster-library:save", async (_event, payload: unknown) => {
    try {
      return {
        ok: true,
        entry: await saveMonsterLibraryEntryUseCase(repository, payload, {
          createId: () => randomUUID(),
          now: () => new Date()
        })
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo completar la operacion.";
}
