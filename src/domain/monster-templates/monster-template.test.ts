import { describe, expect, it } from "vitest";
import {
  DND_55E_MONSTER_TEMPLATE_ID,
  builtInMonsterTemplates,
  mergeMonsterTemplates,
  normalizeMonsterTemplateStore,
  getMonsterTemplateRenderClass,
  scopeMonsterTemplateCss,
  type MonsterTemplate
} from "./monster-template";

describe("monster templates", () => {
  it("incluye el template built-in D&D 5.5e", () => {
    expect(builtInMonsterTemplates[0]?.id).toBe(DND_55E_MONSTER_TEMPLATE_ID);
    expect(builtInMonsterTemplates[0]?.markdown).toContain("## Acciones de Guarida");
    expect(builtInMonsterTemplates[0]?.markdown).toContain("**FUE** {{FUE}}");
  });

  it("normaliza el archivo local descartando templates invalidos", () => {
    const result = normalizeMonsterTemplateStore({
      version: 1,
      templates: [
        {
          id: "custom",
          name: "Custom",
          system: "Sistema",
          markdown: "# Hola",
          css: "",
          builtIn: true,
          updatedAt: "2026-05-24T00:00:00.000Z"
        },
        { id: "", name: "Roto" }
      ]
    });

    expect(result.templates).toHaveLength(1);
    expect(result.templates[0]).toMatchObject({ id: "custom", builtIn: false });
  });

  it("permite que un template de usuario sobrescriba un built-in por id", () => {
    const override: MonsterTemplate = {
      ...builtInMonsterTemplates[0],
      name: "Override",
      builtIn: false
    };

    const result = mergeMonsterTemplates([override]);

    expect(result[0]?.id).toBe(DND_55E_MONSTER_TEMPLATE_ID);
    expect(result[0]?.name).toBe("Override");
    expect(result[0]?.builtIn).toBe(false);
  });

  it("prefija reglas CSS para que queden scoped al contenedor", () => {
    const css = ".monster-card { color: red; }\nh1, h2 { margin: 0; }";

    expect(scopeMonsterTemplateCss(css, "scope")).toBe(
      ".scope .monster-card { color: red; }\n.scope h1, .scope h2 { margin: 0; }"
    );
  });

  it("define el wrapper visual por tipo de template", () => {
    expect(getMonsterTemplateRenderClass(builtInMonsterTemplates[0])).toBe("monster-card dnd-55e");
  });
});
