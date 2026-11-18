import { describe, expect, it } from "vitest";
import { snapshotPreparedEntity } from "./arc-preparation";

const prepared = {
  id: "11111111-1111-4111-8111-111111111111",
  arcId: "22222222-2222-4222-8222-222222222222",
  kind: "monster" as const,
  name: "Orco",
  imagePath: "asset:orco",
  notes: "Vigila la puerta",
  templateId: "generic-markdown",
  binding: { scope: "catalog" as const, systemId: "generic", version: 1, templateId: "generic-markdown" },
  revision: 4,
  createdAt: "2026-11-13T00:00:00.000Z",
  updatedAt: "2026-11-13T00:00:00.000Z",
  provenance: null
};

describe("snapshot de preparación", () => {
  it("retiene contenido y binding exacto, sin estado táctico ni procedencia", () => {
    expect(snapshotPreparedEntity(prepared)).toEqual({ version: 2, kind: "monster", name: "Orco", imagePath: "asset:orco", notes: "Vigila la puerta", templateId: "generic-markdown", binding: prepared.binding });
  });
});
