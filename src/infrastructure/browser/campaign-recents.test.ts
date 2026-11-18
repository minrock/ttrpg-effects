import { IDBFactory, IDBObjectStore as FakeIDBObjectStore } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import { RECENT_ARC_WINDOW_MS } from "../../domain/campaigns/recent-arc";
import { IndexedDbCampaignRecents, type CampaignRecentScope } from "./campaign-recents";

const campaignId = "11111111-1111-4111-8111-111111111111";
const otherCampaignId = "22222222-2222-4222-8222-222222222222";
const arcId = "33333333-3333-4333-8333-333333333333";
const otherArcId = "44444444-4444-4444-8444-444444444444";
const now = Date.parse("2026-11-13T12:00:00.000Z");

function scope(overrides: Partial<CampaignRecentScope> = {}): CampaignRecentScope {
  return { origin: "https://mesa.test", accountId: "dm-uno", campaignId, ...overrides };
}

function visit(id = arcId, at = now): { arcId: string; visitedAt: string } {
  return { arcId: id, visitedAt: new Date(at).toISOString() };
}

describe("recientes de campañas", () => {
  it("conserva solo el último arco por ámbito y se puede leer tras recargar", async () => {
    const factory = new IDBFactory();
    const first = new IndexedDbCampaignRecents(factory);
    expect(await first.record(scope(), visit(), { now })).toBe(true);
    expect(await first.record(scope(), visit(otherArcId, now - 1_000), { now })).toBe(true);

    const reopened = new IndexedDbCampaignRecents(factory);
    expect(await reopened.get(scope(), { now })).toEqual(visit(otherArcId, now - 1_000));
  });

  it("respeta los límites de 14 días, 15 días y fechas futuras", async () => {
    const store = new IndexedDbCampaignRecents(new IDBFactory());
    expect(await store.record(scope(), visit(arcId, now - 14 * 24 * 60 * 60 * 1_000), { now })).toBe(true);
    expect(await store.get(scope(), { now })).not.toBeNull();

    expect(await store.record(scope(), visit(arcId, now - RECENT_ARC_WINDOW_MS), { now })).toBe(false);
    expect(await store.get(scope(), { now })).not.toBeNull();
    expect(await store.record(scope(), visit(arcId, now + 1), { now })).toBe(false);
    expect(await store.get(scope(), { now })).not.toBeNull();
  });

  it("aísla por origen, cuenta y campaña", async () => {
    const store = new IndexedDbCampaignRecents(new IDBFactory());
    await store.record(scope(), visit(), { now });
    expect(await store.get(scope({ accountId: "dm-dos" }), { now })).toBeNull();
    expect(await store.get(scope({ origin: "https://otra-mesa.test" }), { now })).toBeNull();
    expect(await store.get(scope({ campaignId: otherCampaignId }), { now })).toBeNull();
  });

  it("no bloquea navegación cuando IndexedDB está denegado", async () => {
    const store = new IndexedDbCampaignRecents(undefined);
    expect(await store.get(scope(), { now })).toBeNull();
    expect(await store.record(scope(), visit(), { now })).toBe(false);
    expect(await store.clear(scope())).toBe(false);
  });

  it("una limpieza invalida una escritura pendiente de un contexto anterior", async () => {
    const store = new IndexedDbCampaignRecents(new IDBFactory());
    const pending = store.record(scope(), visit(), { now });
    expect(await store.clear(scope())).toBe(true);
    expect(await pending).toBe(false);
    expect(await store.get(scope(), { now })).toBeNull();
  });

  it("mantiene el borrado después de una escritura ya completada y admite una visita posterior", async () => {
    const store = new IndexedDbCampaignRecents(new IDBFactory());
    expect(await store.record(scope(), visit(), { now })).toBe(true);
    expect(await store.clear(scope())).toBe(true);
    expect(await store.get(scope(), { now })).toBeNull();
    expect(await store.record(scope(), visit(otherArcId), { now })).toBe(true);
    expect(await store.get(scope(), { now })).toEqual(visit(otherArcId));
  });

  it("descarta una lectura que termina después de cancelar la navegación", async () => {
    const store = new IndexedDbCampaignRecents(new IDBFactory());
    await store.record(scope(), visit(), { now });
    const controller = new AbortController();
    const pending = store.get(scope(), { now, signal: controller.signal });
    controller.abort();
    expect(await pending).toBeNull();
  });

  it("aborta y revierte una escritura cuando la cancelación llega tras el put", async () => {
    const controller = new AbortController();
    const originalPut = FakeIDBObjectStore.prototype.put;
    const put = vi.spyOn(FakeIDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
      const request = key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key);
      controller.abort();
      return request;
    });
    try {
      const store = new IndexedDbCampaignRecents(new IDBFactory());
      expect(await store.record(scope(), visit(), { now, signal: controller.signal })).toBe(false);
      expect(await store.get(scope(), { now })).toBeNull();
    } finally {
      put.mockRestore();
    }
  });
});
