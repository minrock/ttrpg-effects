import { describe, expect, it } from "vitest";
import {
  getChecklistState,
  resetChecklist,
  setChecklistItemChecked
} from "./checklist-markdown";

describe("checklist markdown", () => {
  it("counts and updates nested task items by document order", () => {
    const source = "- [ ] Preparar mapa\n  - [x] Cargar tokens\n- [X] Abrir puerta";

    expect(getChecklistState(source)).toEqual({ total: 3, checked: 2 });
    expect(setChecklistItemChecked(source, 0, true)).toContain("- [x] Preparar mapa");
    expect(setChecklistItemChecked(source, 1, false)).toContain("  - [ ] Cargar tokens");
  });

  it("resets every task without changing text or indentation", () => {
    const source = "- [x] Uno\r\n  * [X] Dos\r\n+ [ ] Tres";

    expect(resetChecklist(source)).toBe("- [ ] Uno\r\n  * [ ] Dos\r\n+ [ ] Tres");
  });

  it("finds task items after headings and blank lines", () => {
    const source = "# Turno\n\n- [x] Mover\n- [ ] Accion";
    expect(getChecklistState(source)).toEqual({ total: 2, checked: 1 });
  });

  it("ignores task-like text inside fenced code blocks", () => {
    const source = "```md\n- [x] ejemplo\n```\n- [x] tarea real";

    expect(getChecklistState(source)).toEqual({ total: 1, checked: 1 });
    expect(resetChecklist(source)).toBe("```md\n- [x] ejemplo\n```\n- [ ] tarea real");
  });

  it("leaves invalid indexes and ordinary brackets untouched", () => {
    const source = "Texto [x] normal\n- no es una tarea";
    expect(setChecklistItemChecked(source, 0, true)).toBe(source);
    expect(setChecklistItemChecked(source, -1, true)).toBe(source);
  });

  it("counts, updates and resets inline task markers in table cells", () => {
    const source = "| Estatua | Estado |\n| --- | --- |\n| Vampiro | [ ] 1 |\n| Lich | [x] 2 |";

    expect(getChecklistState(source)).toEqual({ total: 2, checked: 1 });
    expect(setChecklistItemChecked(source, 0, true)).toContain("| Vampiro | [x] 1 |");
    expect(resetChecklist(source)).toContain("| Lich | [ ] 2 |");
  });
});
