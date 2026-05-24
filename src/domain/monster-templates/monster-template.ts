export const MONSTER_TEMPLATE_STORE_VERSION = 1;

export interface MonsterTemplate {
  readonly id: string;
  readonly name: string;
  readonly system: string;
  readonly markdown: string;
  readonly css: string;
  readonly builtIn: boolean;
  readonly updatedAt: string;
}

export interface MonsterTemplateStoreDocument {
  readonly version: typeof MONSTER_TEMPLATE_STORE_VERSION;
  readonly templates: readonly MonsterTemplate[];
}

export const DND_55E_MONSTER_TEMPLATE_ID = "dnd-55e-statblock";

const dnd55eMarkdown = `# {{Nombre}}

*{{Descripcion corta}}, {{alineacion}}*

---

**CA** {{CA}}  
**Iniciativa** {{Iniciativa}}  
**PG** {{PG}}  
**Velocidad** {{Velocidad}}

| | MOD | SALV. | | MOD | SALV. | | MOD | SALV. |
| --- | ---: | ---: | --- | ---: | ---: | --- | ---: | ---: |
| **FUE** {{FUE}} | {{FUE_MOD}} | {{FUE_SALV}} | **DES** {{DES}} | {{DES_MOD}} | {{DES_SALV}} | **CON** {{CON}} | {{CON_MOD}} | {{CON_SALV}} |
| **INT** {{INT}} | {{INT_MOD}} | {{INT_SALV}} | **SAB** {{SAB}} | {{SAB_MOD}} | {{SAB_SALV}} | **CAR** {{CAR}} | {{CAR_MOD}} | {{CAR_SALV}} |

**Habilidades** {{Habilidades}}  
**Inmunidades** {{Inmunidades}}  
**Sentidos** {{Sentidos}}  
**Idiomas** {{Idiomas}}  
**VD** {{VD}}  
**Bonif.** {{Bonif}}

## Rasgos

**{{Rasgo 1}}.** {{Descripcion del rasgo.}}

## Acciones

**{{Accion 1}}.** {{Descripcion de la accion.}}

## Reacciones

**{{Reaccion 1}}.** {{Descripcion de la reaccion.}}

## Acciones Legendarias

**{{Accion legendaria 1}}.** {{Descripcion de la accion legendaria.}}

## Acciones de Guarida

**{{Accion de guarida 1}}.** {{Descripcion de la accion de guarida.}}`;

const dnd55eCss = `.monster-card.dnd-55e {
  max-width: 672px;
  margin: 0 auto;
  border: 2px solid #9f9b94;
  border-radius: 10px;
  padding: 12px 14px 14px;
  color: #2f2723;
  background: #f5f1e8;
  box-shadow: inset 0 0 0 2px rgb(255 255 255 / 72%), 0 3px 10px rgb(0 0 0 / 28%);
  font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
  font-size: 0.95rem;
  line-height: 1.22;
}

.monster-card.dnd-55e h1 {
  margin: 0;
  border-bottom: 2px solid #8f8278;
  color: #7e3028;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.75rem;
  font-variant: small-caps;
  line-height: 1;
  letter-spacing: 0.03em;
}

.monster-card.dnd-55e h2 {
  margin: 14px 0 6px;
  border-bottom: 2px solid #8f8278;
  color: #7e3028;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.15rem;
  font-variant: small-caps;
  letter-spacing: 0.02em;
  line-height: 1.1;
}

.monster-card.dnd-55e p {
  margin: 5px 0;
}

.monster-card.dnd-55e hr {
  display: none;
}

.monster-card.dnd-55e em {
  color: #6d625d;
}

.monster-card.dnd-55e table {
  width: 100%;
  margin: 8px 0 10px;
  border-collapse: collapse;
  font-size: 0.87rem;
  line-height: 1.1;
}

.monster-card.dnd-55e th,
.monster-card.dnd-55e td {
  border: 0;
  padding: 2px 5px;
  text-align: center;
}

.monster-card.dnd-55e th {
  color: #77706a;
  background: transparent;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
}

.monster-card.dnd-55e tr:nth-child(even) td {
  background: #ded8d0;
}

.monster-card.dnd-55e tr:nth-child(odd) td {
  background: #ece7df;
}

.monster-card.dnd-55e strong {
  color: #6f2a24;
}

.monster-card.dnd-55e table strong {
  margin-right: 4px;
  color: #6f2a24;
  text-transform: uppercase;
}`;

export const builtInMonsterTemplates: readonly MonsterTemplate[] = [
  {
    id: DND_55E_MONSTER_TEMPLATE_ID,
    name: "D&D 5.5e Statblock",
    system: "D&D 5.5e",
    markdown: dnd55eMarkdown,
    css: dnd55eCss,
    builtIn: true,
    updatedAt: "2026-05-24T00:00:00.000Z"
  }
];

export function createEmptyMonsterTemplate(id: string, now = new Date()): MonsterTemplate {
  return {
    id,
    name: "Nuevo template",
    system: "Sistema",
    markdown: "# {{Nombre}}\n\n{{Notas}}",
    css: "",
    builtIn: false,
    updatedAt: now.toISOString()
  };
}

export function normalizeMonsterTemplate(value: unknown): MonsterTemplate | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const id = getTrimmedString(record["id"]);
  const name = getTrimmedString(record["name"]);
  const system = getTrimmedString(record["system"]);
  const markdown = typeof record["markdown"] === "string" ? record["markdown"] : null;
  const css = typeof record["css"] === "string" ? record["css"] : null;
  const updatedAt = getTrimmedString(record["updatedAt"]) ?? new Date().toISOString();

  if (id === null || name === null || system === null || markdown === null || css === null) {
    return null;
  }

  return {
    id,
    name,
    system,
    markdown,
    css,
    builtIn: Boolean(record["builtIn"]),
    updatedAt
  };
}

export function normalizeMonsterTemplateStore(value: unknown): MonsterTemplateStoreDocument {
  if (typeof value !== "object" || value === null) {
    return { version: MONSTER_TEMPLATE_STORE_VERSION, templates: [] };
  }

  const record = value as Record<string, unknown>;
  const rawTemplates = Array.isArray(record["templates"]) ? record["templates"] : [];

  return {
    version: MONSTER_TEMPLATE_STORE_VERSION,
    templates: rawTemplates
      .map((template) => normalizeMonsterTemplate(template))
      .filter((template): template is MonsterTemplate => template !== null)
      .map((template) => ({ ...template, builtIn: false }))
  };
}

export function mergeMonsterTemplates(
  userTemplates: readonly MonsterTemplate[],
  builtIns: readonly MonsterTemplate[] = builtInMonsterTemplates
): readonly MonsterTemplate[] {
  const userById = new Map(userTemplates.map((template) => [template.id, { ...template, builtIn: false }]));

  return [
    ...builtIns.map((builtIn) => userById.get(builtIn.id) ?? builtIn),
    ...userTemplates.filter((template) => !builtIns.some((builtIn) => builtIn.id === template.id))
  ];
}

export function prepareTemplateForSave(template: MonsterTemplate, now = new Date()): MonsterTemplate {
  const normalized = normalizeMonsterTemplate({
    ...template,
    updatedAt: now.toISOString()
  });

  if (normalized === null) {
    throw new Error("Template de monstruo invalido.");
  }

  return {
    ...normalized,
    builtIn: false
  };
}

export function getMonsterTemplateRenderClass(template: MonsterTemplate): string {
  if (template.id === DND_55E_MONSTER_TEMPLATE_ID) {
    return "monster-card dnd-55e";
  }

  return "monster-card";
}

export function scopeMonsterTemplateCss(css: string, scopeClassName: string): string {
  const trimmedScope = scopeClassName.trim();
  if (css.trim() === "" || trimmedScope === "") return "";

  return css
    .split("}")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const separatorIndex = rule.indexOf("{");
      if (separatorIndex === -1) return "";
      const selectorText = rule.slice(0, separatorIndex).trim();
      const body = rule.slice(separatorIndex + 1).trim();
      if (selectorText.startsWith("@")) return `${selectorText} { ${body} }`;
      const scopedSelectors = selectorText
        .split(",")
        .map((selector) => selector.trim())
        .filter(Boolean)
        .map((selector) => {
          if (selector.startsWith(`.${trimmedScope}`)) return selector;
          return `.${trimmedScope} ${selector}`;
        })
        .join(", ");

      return `${scopedSelectors} { ${body} }`;
    })
    .filter(Boolean)
    .join("\n");
}

function getTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
