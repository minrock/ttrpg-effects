import type { MonsterTemplateRepository } from "../services/monster-template-repository";
import type { MonsterTemplate } from "../../domain/monster-templates/monster-template";
import {
  mergeMonsterTemplates,
  prepareTemplateForSave
} from "../../domain/monster-templates/monster-template";

export async function listMonsterTemplatesUseCase(
  repository: MonsterTemplateRepository
): Promise<readonly MonsterTemplate[]> {
  return mergeMonsterTemplates(await repository.listUserTemplates());
}

export async function saveMonsterTemplateUseCase(
  repository: MonsterTemplateRepository,
  template: MonsterTemplate
): Promise<readonly MonsterTemplate[]> {
  await repository.saveUserTemplate(prepareTemplateForSave(template));
  return listMonsterTemplatesUseCase(repository);
}

export async function deleteMonsterTemplateUseCase(
  repository: MonsterTemplateRepository,
  id: string
): Promise<readonly MonsterTemplate[]> {
  await repository.deleteUserTemplate(id);
  return listMonsterTemplatesUseCase(repository);
}
