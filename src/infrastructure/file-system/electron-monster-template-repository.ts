import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MonsterTemplateRepository } from "../../application/services/monster-template-repository";
import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";
import {
  MONSTER_TEMPLATE_STORE_VERSION,
  normalizeMonsterTemplateStore
} from "../../domain/monster-templates/monster-template";

export class ElectronMonsterTemplateRepository implements MonsterTemplateRepository {
  constructor(private readonly storagePath: string) {}

  async listUserTemplates(): Promise<readonly MonsterTemplate[]> {
    try {
      const raw = JSON.parse(await readFile(this.storagePath, "utf8")) as unknown;
      return normalizeMonsterTemplateStore(raw).templates;
    } catch {
      return [];
    }
  }

  async saveUserTemplate(template: MonsterTemplate): Promise<readonly MonsterTemplate[]> {
    const current = await this.listUserTemplates();
    const next = [
      ...current.filter((candidate) => candidate.id !== template.id),
      { ...template, builtIn: false }
    ].sort((a, b) => a.name.localeCompare(b.name));

    await this.save(next);
    return next;
  }

  async deleteUserTemplate(id: string): Promise<readonly MonsterTemplate[]> {
    const next = (await this.listUserTemplates()).filter((template) => template.id !== id);
    await this.save(next);
    return next;
  }

  private async save(templates: readonly MonsterTemplate[]): Promise<void> {
    await mkdir(dirname(this.storagePath), { recursive: true });
    await writeFile(
      this.storagePath,
      JSON.stringify({ version: MONSTER_TEMPLATE_STORE_VERSION, templates }, null, 2),
      "utf8"
    );
  }
}
