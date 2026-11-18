import { describe, expect, it } from "vitest";
import { isRecentArc, readRecentArc, RECENT_ARC_WINDOW_MS } from "./recent-arc";

const arcId = "11111111-1111-4111-8111-111111111111";
const now = Date.parse("2026-11-13T12:00:00.000Z");

describe("último arco local", () => {
  it("mantiene el resaltado a los 14 días", () => {
    const visit = { arcId, visitedAt: new Date(now - 14 * 24 * 60 * 60 * 1_000).toISOString() };
    expect(readRecentArc(visit, now)).toEqual(visit);
    expect(isRecentArc(visit, arcId, now)).toBe(true);
  });

  it("expira en el límite exacto de 15 días", () => {
    const visit = { arcId, visitedAt: new Date(now - RECENT_ARC_WINDOW_MS).toISOString() };
    expect(readRecentArc(visit, now)).toBeNull();
  });

  it("descarta fechas futuras y valores malformados", () => {
    expect(readRecentArc({ arcId, visitedAt: new Date(now + 1).toISOString() }, now)).toBeNull();
    expect(readRecentArc({ arcId: "arco-visible", visitedAt: new Date(now).toISOString() }, now)).toBeNull();
    expect(readRecentArc({ arcId, visitedAt: "ayer" }, now)).toBeNull();
  });
});
