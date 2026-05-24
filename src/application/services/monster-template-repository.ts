import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";

export interface MonsterTemplateRepository {
  listUserTemplates(): Promise<readonly MonsterTemplate[]>;
  saveUserTemplate(template: MonsterTemplate): Promise<readonly MonsterTemplate[]>;
  deleteUserTemplate(id: string): Promise<readonly MonsterTemplate[]>;
}
