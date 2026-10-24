// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DiceResult } from "../../../../domain/dice/dice";
import { DiceResultSummary } from "./DiceResultSummary";

describe("explicit result modifiers", () => {
  let root: Root, host: HTMLDivElement;
  const result: DiceResult = {
    d20: { mode: "normal", values: [17], value: 17, selected: 0, modifier: 0, total: 17 },
    groups: [
      { id: "fire", damageType: "fire", formula: "1d6 + 2", modifier: 2, dice: [{ id: "fire:0", type: "d6", value: 4, parts: [4] }], total: 6 },
      { id: "cold", damageType: "cold", formula: "1d4 - 1", modifier: -1, dice: [{ id: "cold:0", type: "d4", value: 3, parts: [3] }], total: 2 },
      { id: "force", damageType: "force", formula: "3", modifier: 3, dice: [], total: 3 },
      { id: "acid", damageType: "acid", formula: "1d6", dice: [{ id: "acid:0", type: "d6", value: 5, parts: [5] }], total: 5 }
    ],
    poolTotal: 16
  };
  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

  it.each([false, true])("labels signed modifiers even when compact=%s without adding them twice", async compact => {
    await act(async () => root.render(<DiceResultSummary result={result} compact={compact} />));
    expect([...host.querySelectorAll(".dice-result-modifier")].map(node => node.textContent)).toEqual(["Modificador +2", "Modificador -1", "Modificador +3"]);
    expect([...host.querySelectorAll(".dice-result-group > strong")].map(node => node.textContent)).toEqual(["6", "2", "3", "5"]);
    expect(host.querySelector(".dice-result-total strong")?.textContent).toBe("16");
    expect(host.querySelector(".dice-result-check > strong")?.textContent).toBe("17");
    expect(host.querySelectorAll(".dice-result-values")).toHaveLength(compact ? 0 : 4);
  });

  it("does not add a modifier row for zero or older results without a modifier", async () => {
    const group = result.groups[3];
    await act(async () => root.render(<DiceResultSummary result={{ groups: [group, { ...group, id: "zero", modifier: 0 }], poolTotal: 10, d20: null }} />));
    expect(host.querySelector(".dice-result-modifier")).toBeNull();
    expect(host.querySelector(".dice-result-total strong")?.textContent).toBe("10");
  });
  it.each([4, -7, 0])("shows the d20 total with modifier %s while retaining raw faces", async modifier => {
    await act(async () => root.render(<DiceResultSummary result={{ groups: [], poolTotal: 0, d20: { mode: "disadvantage", values: [17, 5], selected: 1, value: 5, modifier, total: 5 + modifier } }} />));
    expect(host.querySelector(".dice-result-check > strong")?.textContent).toBe(String(5 + modifier));
    expect(host.querySelector(".dice-check-values b")?.textContent).toBe("5");
    expect(host.querySelector(".dice-check-values s")?.textContent).toBe("17");
    expect(host.querySelector(".dice-result-modifier")?.textContent ?? null).toBe(modifier === 0 ? null : `Modificador ${modifier > 0 ? "+" : ""}${modifier}`);
    expect(host.querySelector(".dice-result-total")).toBeNull();
  });
});
