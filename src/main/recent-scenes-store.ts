import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { addRecentPath, removeRecentPath } from "./recent-paths";

const MAX_RECENT_SCENES = 5;

export class RecentScenesStore {
  constructor(private readonly storagePath: string) {}

  async list(): Promise<readonly string[]> {
    try {
      const raw = JSON.parse(await readFile(this.storagePath, "utf8")) as unknown;

      if (!isRecentScenesFile(raw)) {
        return [];
      }

      return raw.scenes.slice(0, MAX_RECENT_SCENES);
    } catch {
      return [];
    }
  }

  async add(filePath: string): Promise<readonly string[]> {
    const next = addRecentPath(await this.list(), filePath, MAX_RECENT_SCENES);
    await this.save(next);
    return next;
  }

  async remove(filePath: string): Promise<readonly string[]> {
    const next = removeRecentPath(await this.list(), filePath);
    await this.save(next);
    return next;
  }

  private async save(scenes: readonly string[]): Promise<void> {
    await mkdir(dirname(this.storagePath), { recursive: true });
    await writeFile(this.storagePath, JSON.stringify({ scenes }, null, 2), "utf8");
  }
}

function isRecentScenesFile(value: unknown): value is { readonly scenes: readonly string[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "scenes" in value &&
    Array.isArray((value as { readonly scenes: unknown }).scenes) &&
    (value as { readonly scenes: unknown[] }).scenes.every((entry) => typeof entry === "string")
  );
}
