import { randomUUID } from "node:crypto";
import { ipcMain } from "electron";
import type {
  NpcLibraryRepository,
  PlayerCharacterLibraryRepository
} from "../../application/services/entity-library-repository";
import {
  getNpcLibraryEntryUseCase,
  getPlayerCharacterLibraryEntryUseCase,
  saveNpcLibraryEntryUseCase,
  savePlayerCharacterLibraryEntryUseCase,
  searchNpcLibraryUseCase,
  searchPlayerCharacterLibraryUseCase
} from "../../application/use-cases/entity-library";

export function registerEntityLibraryIpc(options: {
  readonly npcRepository: NpcLibraryRepository;
  readonly playerCharacterRepository: PlayerCharacterLibraryRepository;
}): void {
  ipcMain.handle("npc-library:search", async (_event, payload: unknown) => {
    try {
      return { ok: true, entries: await searchNpcLibraryUseCase(options.npcRepository, payload) };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle("npc-library:get", async (_event, payload: unknown) => {
    try {
      if (typeof payload !== "string" || payload.trim() === "") {
        throw new Error("Id de NPC invalido.");
      }
      return { ok: true, entry: await getNpcLibraryEntryUseCase(options.npcRepository, payload.trim()) };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle("npc-library:save", async (_event, payload: unknown) => {
    try {
      return {
        ok: true,
        entry: await saveNpcLibraryEntryUseCase(options.npcRepository, payload, {
          createId: () => randomUUID(),
          now: () => new Date()
        })
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle("player-character-library:search", async (_event, payload: unknown) => {
    try {
      return {
        ok: true,
        entries: await searchPlayerCharacterLibraryUseCase(options.playerCharacterRepository, payload)
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle("player-character-library:get", async (_event, payload: unknown) => {
    try {
      if (typeof payload !== "string" || payload.trim() === "") {
        throw new Error("Id de personaje invalido.");
      }
      return {
        ok: true,
        entry: await getPlayerCharacterLibraryEntryUseCase(options.playerCharacterRepository, payload.trim())
      };
    } catch (error) {
      return { ok: false, error: getErrorMessage(error) };
    }
  });

  ipcMain.handle("player-character-library:save", async (_event, payload: unknown) => {
    try {
      return {
        ok: true,
        entry: await savePlayerCharacterLibraryEntryUseCase(options.playerCharacterRepository, payload, {
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
