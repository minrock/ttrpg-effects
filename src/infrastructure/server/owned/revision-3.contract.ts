import { afterEach, describe, expect, it } from "vitest";
import { randomUUID, createHash } from "node:crypto";
import { readFileSync, writeFileSync, statSync, symlinkSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { OwnedError } from "../../../application/services/owned-store";
import { GENERIC_SYSTEM, systemSeeds, type ResourceBindings } from "../../../domain/systems/system-catalog";
import { createMonsterLibraryEntry } from "../../../domain/monster-library/monster-library";
import { identityDatabase } from "../identity/database";
import { accounts, cleanup, directory, fixture } from "./fixtures";
import { exportOwned, importTransfer, inspectTransfer, verifyTransfer } from "./transfer";
import { inlineVersion2 } from "./transfer-fixture";
import { definitionHash } from "./system-data";
afterEach(async () => { for (const action of cleanup.splice(0).reverse()) await action(); });
for (const kind of ["sqlite", "postgres"] as const) describe(`Correcciones ronda 3 ${kind}`, () => {
  it("todo rechazo capturado aborta: motivos falsy, primer motivo y operaciones sin await", async () => {
    const config = await fixture(kind), auth = await accounts(config), unit = await identityDatabase(config); cleanup.push(() => unit.close());
    for (const reason of [undefined, null, false, 0, ""]) for (const mode of ["catch", "settled", "unawaited"] as const) {
      await expect(auth.identity.authorized(auth.aCookie, "dm", async (_, tx) => {
        const pending = tx.operation(randomUUID(), "rechazo", {}, async () => { await tx.games.create(auth.a.id, "Debe revertir", GENERIC_SYSTEM); return Promise.reject(reason); });
        if (mode === "catch") await pending.catch(() => undefined);
        else if (mode === "settled") await Promise.allSettled([pending]);
        else void pending.catch(() => undefined);
      })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    }
    for (const firstFalsy of [false, true]) {
      await expect(auth.identity.authorized(auth.aCookie, "dm", async (_, tx) => {
        const reasons = firstFalsy ? [null, new OwnedError("CONFLICT")] : [new OwnedError("CONFLICT"), null];
        for (const reason of reasons) await tx.operation(randomUUID(), "primer-motivo", {}, async () => { await tx.games.create(auth.a.id, "Debe revertir", GENERIC_SYSTEM); throw reason; }).catch(() => undefined);
      })).rejects.toMatchObject({ code: firstFalsy ? "UNAVAILABLE" : "CONFLICT" });
    }
    expect(await auth.identity.authorized(auth.aCookie, "dm", (_, tx) => tx.games.list(auth.a.id))).toMatchObject({ total: 0 });
    expect(await unit.transaction(async c => Number((await c.query("SELECT COUNT(*) AS n FROM owned_operations")).rows[0].n))).toBe(0);
  });
  it("presentación de ID nuevo conserva roundtrip habilitado y deshabilitado, incluyendo lector v2", async () => {
    const config = await fixture(kind), auth = await accounts(config), ref = { systemId: "propio", version: 1 }, def = structuredClone(systemSeeds[1].definition);
    def.presentations = [{ ...def.presentations[0], id: "presentacion-original", builtIn: false, markdown: "# Contenido original Ñ", css: ".original { color: red; }" }];
    await auth.identity.authorized(auth.adminCookie, "admin", async (_, tx) => { await tx.systems.create(ref.systemId, "Propio"); await tx.systems.draft(ref, def, 0); await tx.systems.publish(ref, 1); });
    const monster = createMonsterLibraryEntry({ name: "Original", system: "Etiqueta", templateId: def.presentations[0].id, contentMarkdown: "# Instancia privada" }, { id: randomUUID(), now: new Date() });
    const bindings: ResourceBindings = { root: { scope: "catalog", ...ref, templateId: def.presentations[0].id }, monsters: {} };
    const game = await auth.identity.authorized(auth.aCookie, "dm", async (_, tx) => { await tx.resources.put("monsters", monster, 0, bindings); const g = await tx.games.create(auth.a.id, "Propia", ref); await tx.links.link(g.id, "monsters", monster.id); return g; });
    for (const disabled of [false, true]) {
      if (disabled) await auth.identity.authorized(auth.adminCookie, "admin", (_, tx) => tx.systems.availability(ref, "disabled", 2));
      const bundle = join(directory(), "paquete"); expect((await exportOwned(config, bundle)).version).toBe(3);
      if (!disabled) await inlineVersion2(bundle);
      expect((await inspectTransfer(bundle)).version).toBe(disabled ? 3 : 2);
      const target = await fixture(kind), restored = await accounts(target), options = { ownerMap: { [auth.a.id]: restored.a.id } };
      await importTransfer(target, bundle, options); await verifyTransfer(target, bundle, options);
      await restored.identity.authorized(restored.aCookie, "dm", async (_, tx) => {
        expect(await tx.systems.get(ref)).toMatchObject({ definition: def, hash: definitionHash(def), availability: disabled ? "disabled" : "enabled" });
        expect(await tx.resources.get("monsters", monster.id)).toMatchObject({ value: monster, bindings });
        await tx.links.validate(game.id, "monsters", monster.id);
      });
    }
  });
  it("catálogo segmentado supera 1 MiB y 10 MiB por versión; verifica límites, hashes y rollback", async () => {
    const config = await fixture(kind), auth = await accounts(config), ref = { systemId: "extenso", version: 1 };
    const definition = structuredClone(systemSeeds[1].definition), template = definition.presentations[0];
    definition.presentations = Array.from({ length: 9 }, (_, n) => ({ ...template, id: `extenso-${n}`, markdown: "m".repeat(1_000_000), css: "c".repeat(200_000), builtIn: false }));
    await auth.identity.authorized(auth.adminCookie, "admin", async (_, tx) => { await tx.systems.create(ref.systemId, "Extenso"); await tx.systems.draft(ref, definition, 0); await tx.systems.publish(ref, 1); });
    for (let version = 2; version <= 4; version++) await auth.identity.authorized(auth.adminCookie, "admin", async (_, tx) => {
      const small = { ...definition, presentations: [{ ...template, id: `otra-${version}`, markdown: "v".repeat(400_000) }] };
      await tx.systems.draft({ ...ref, version }, small, 0); await tx.systems.publish({ ...ref, version }, 1);
    });
    await auth.identity.authorized(auth.aCookie, "dm", (_, tx) => tx.games.create(auth.a.id, "Validación tardía", GENERIC_SYSTEM));
    const bundle = join(directory(), "grande"), manifest = await exportOwned(config, bundle);
    expect(manifest.version).toBe(3); expect(statSync(join(bundle, "manifest.json")).size).toBeLessThan(1024 * 1024);
    expect(manifest.catalogData!.bytes).toBeGreaterThan(10 * 1024 * 1024);
    for (const line of readFileSync(join(bundle, "catalog.jsonl"), "utf8").trim().split("\n")) expect(Buffer.byteLength(line)).toBeLessThan(10 * 1024 * 1024);
    const path = join(bundle, "catalog.jsonl"), original = readFileSync(path);
    const target = await fixture(kind), restored = await accounts(target), options = { ownerMap: { [auth.a.id]: restored.a.id } };
    await expect(importTransfer(target, bundle, { ...options, afterRow: async () => { writeFileSync(path, Buffer.concat([original, Buffer.from(" ")])); } })).rejects.toMatchObject({ code: "CORRUPT", outcome: "rolled_back" });
    expect(await restored.identity.authorized(restored.aCookie, "dm", (_, tx) => tx.games.list(restored.a.id))).toMatchObject({ total: 0 });
    await expect(restored.identity.authorized(restored.aCookie, "dm", (_, tx) => tx.systems.get(ref))).rejects.toMatchObject({ code: "NOT_FOUND" });
    writeFileSync(path, original);
    await importTransfer(target, bundle, options); await verifyTransfer(target, bundle, options);
    expect((await restored.identity.authorized(restored.aCookie, "dm", (_, tx) => tx.systems.get(ref))).hash).toBe(definitionHash(definition));
    expect((await restored.identity.authorized(restored.aCookie, "dm", (_, tx) => tx.systems.get({ ...ref, version: 4 }))).definition.presentations[0].markdown.length).toBe(400_000);
    writeFileSync(path, Buffer.concat([original, Buffer.from(" ")])); await expect(inspectTransfer(bundle)).rejects.toMatchObject({ code: "CORRUPT" }); writeFileSync(path, original);
    // Un hash coincidente no concede permiso para una línea sin cota ni una estructura truncada.
    const badLine = Buffer.from(JSON.stringify({ type: "presentation", value: "x".repeat(10 * 1024 * 1024) }) + "\n");
    writeFileSync(path, badLine); writeFileSync(join(bundle, "manifest.json"), JSON.stringify({ ...manifest, catalogData: { records: 1, bytes: badLine.length, sha256: createHash("sha256").update(badLine).digest("hex") } }));
    await expect(inspectTransfer(bundle)).rejects.toMatchObject({ code: "CORRUPT" });
    writeFileSync(path, original); writeFileSync(join(bundle, "manifest.json"), JSON.stringify(manifest));
    const elsewhere = join(directory(), "catalogo"); writeFileSync(elsewhere, original); unlinkSync(path); symlinkSync(elsewhere, path); await expect(inspectTransfer(bundle)).rejects.toMatchObject({ code: "VALIDATION" }); unlinkSync(path); writeFileSync(path, original);
  });
});
