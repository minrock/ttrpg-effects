import { describe, expect, it } from "vitest";
import {
  SceneCounterError,
  adjustSceneCounter,
  createSceneCounter,
  getPlayerVisibleSceneCounters,
  getSceneCounterVisualProgress,
  updateSceneCounter
} from "./scene-counters";

describe("scene counters", () => {
  it("starts fixed progress empty and countdown full", () => {
    expect(createSceneCounter({ id: "progress", label: "Runas", mode: "progress", kind: "fixed", capacity: 4 })).toMatchObject({ value: 0, capacity: 4 });
    expect(createSceneCounter({ id: "countdown", label: "Ritual", mode: "countdown", kind: "fixed", capacity: 6 })).toMatchObject({ value: 6, capacity: 6 });
  });

  it("clamps fixed counters and leaves dynamic counters unbounded", () => {
    const fixed = createSceneCounter({ id: "fixed", label: "Fijo", mode: "progress", kind: "fixed", capacity: 2 });
    expect(adjustSceneCounter([fixed], "fixed", 4)[0]?.value).toBe(2);
    expect(adjustSceneCounter([fixed], "fixed", -1)[0]?.value).toBe(0);

    const dynamic = createSceneCounter({ id: "dynamic", label: "Alertas", mode: "progress", kind: "dynamic" });
    const adjustedDynamic = adjustSceneCounter([dynamic], "dynamic", 200)[0];
    expect(adjustedDynamic?.value).toBe(200);
    expect(adjustedDynamic).not.toHaveProperty("capacity");
  });

  it("normalizes updated fixed capacity and filters private counters", () => {
    const counter = createSceneCounter({ id: "ritual", label: "Ritual", mode: "countdown", kind: "fixed", capacity: 6 });
    const updated = updateSceneCounter([counter], "ritual", {
      ...counter,
      capacity: 3,
      value: 6,
      isVisibleToPlayers: true,
      isLabelVisibleToPlayers: false
    });
    expect(updated[0]).toMatchObject({ value: 3, capacity: 3 });
    expect(getPlayerVisibleSceneCounters(updated)).toHaveLength(1);
  });

  it("rejects invalid counter values", () => {
    expect(() => createSceneCounter({ id: "", label: "", mode: "progress", kind: "dynamic" })).toThrow(SceneCounterError);
    expect(() => createSceneCounter({ id: "bad", label: "Bad", mode: "progress", kind: "fixed", capacity: 0 })).toThrow("capacidad");
  });

  it("returns a safe qualitative progress for dynamic counters", () => {
    const counter = createSceneCounter({ id: "alerts", label: "Alertas", mode: "progress", kind: "dynamic", initialValue: 14 });
    expect(getSceneCounterVisualProgress(counter)).toBeGreaterThan(0);
    expect(getSceneCounterVisualProgress(counter)).toBeLessThanOrEqual(1);
  });
});
